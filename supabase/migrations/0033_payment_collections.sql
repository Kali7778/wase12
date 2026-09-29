-- =====================================================================
--  0033 — Collecting what a weekly customer owes
--
--  A weekly customer's bill is written unpaid (0032). The money is
--  fetched later, and usually by whoever is driving that way: the GM
--  hands the bill to a driver, and it appears on that driver's phone
--  with the customer's phone number, address and the delivery note it
--  came from (D78).
--
--  The money is not "in" until it is in the office, so a bill goes
--  through four states (D74):
--
--      Unpaid  →  With driver  →  Collected  →  Paid
--                 GM assigned    driver has    GM has it
--                                the money
--
--  One bill at a time, never a customer's whole balance (D73), and
--  always the whole bill: a driver offered less says so with a reason
--  and the job goes back to the GM (D75, and D57 before it). Assigning
--  and confirming are both the GM's (D76); when the customer pays at the
--  office or by transfer, the GM records it without a driver (D77).
--
--  Nothing here is edited. A job taken back from a driver is closed with
--  a reason and a new one is assigned, and every step keeps its time and
--  its name.
-- =====================================================================


do $$
begin
  if not exists (select 1 from pg_type where typname = 'collection_status') then
    create type collection_status as enum (
      'with_driver',  -- the GM gave the job to a driver
      'collected',    -- the driver has the money
      'received',     -- the money reached the office; the bill is paid
      'declined',     -- the driver could not collect it, with a reason
      'cancelled'     -- the GM took the job back
    );
  end if;
end $$;


create table payment_collections (
  id             uuid primary key default gen_random_uuid(),
  bill_id        uuid not null references bills(id),
  driver_id      uuid not null references user_tbl(id),
  status         collection_status not null default 'with_driver',

  assigned_by    uuid not null references user_tbl(id),
  assigned_at    timestamptz not null default now(),
  -- What the GM told the driver: who to ask for, when to go.
  note           text,

  collected_at   timestamptz,
  collected_note text,

  received_at    timestamptz,
  received_by    uuid references user_tbl(id),
  received_note  text,

  -- Why it was declined or taken back.
  closed_reason  text,
  closed_at      timestamptz,

  constraint collected_when_it_says_so check (
    (collected_at is not null) = (status in ('collected', 'received'))
  ),
  constraint received_when_it_says_so check (
    (received_at is not null) = (status = 'received')
    and (received_at is null) = (received_by is null)
  ),
  constraint closed_with_a_reason check (
    (status in ('declined', 'cancelled'))
    = (nullif(btrim(coalesce(closed_reason, '')), '') is not null and closed_at is not null)
  )
);

comment on table payment_collections is
  'A bill handed to a driver to collect. Append-only in spirit: a job is closed, never rewritten.';

-- A bill can only be out with one driver at a time.
create unique index payment_collections_one_live
  on payment_collections (bill_id)
  where status in ('with_driver', 'collected');

create index payment_collections_driver_idx
  on payment_collections (driver_id, assigned_at desc)
  where status in ('with_driver', 'collected');

create index payment_collections_bill_idx on payment_collections (bill_id, assigned_at desc);


alter table payment_collections enable row level security;

-- The office sees every job; a driver sees their own, and only those.
create policy payment_collections_read on payment_collections
  for select to authenticated
  using (
    (select private.has_role('ceo', 'gm', 'manager', 'admin'))
    or driver_id = (select auth.uid())
  );

-- No write policies: every change goes through the functions below.


-- ---------------------------------------------------------------------
-- 1. The GM hands a bill to a driver
-- ---------------------------------------------------------------------

create or replace function assign_collection(
  p_bill_id   uuid,
  p_driver_id uuid,
  p_note      text default null
)
returns payment_collections
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_bill   bills;
  v_driver user_tbl;
  v_row    payment_collections;
begin
  -- Assigning and confirming are the GM's alone (D76).
  if not has_role('gm', 'ceo') then
    raise exception 'Permission denied: only the GM or a superadmin can send a bill out for collection.';
  end if;

  select * into v_bill from bills where id = p_bill_id for update;
  if not found then
    raise exception 'That bill does not exist.';
  end if;
  if v_bill.cancelled_at is not null then
    raise exception 'Bill % is cancelled.', v_bill.bill_number;
  end if;
  if v_bill.paid_at is not null then
    raise exception 'Bill % is already paid.', v_bill.bill_number;
  end if;
  if exists (select 1 from payment_collections c
              where c.bill_id = p_bill_id and c.status in ('with_driver', 'collected')) then
    raise exception 'Bill % is already out with a driver. Take it back first.', v_bill.bill_number;
  end if;

  select * into v_driver from user_tbl where id = p_driver_id;
  if not found or not v_driver.is_driver then
    raise exception 'Choose a driver.';
  end if;
  if not v_driver.is_active then
    raise exception 'That driver is switched off.';
  end if;

  insert into payment_collections (bill_id, driver_id, assigned_by, note)
  values (p_bill_id, p_driver_id, auth.uid(), nullif(btrim(coalesce(p_note, '')), ''))
  returning * into v_row;

  return v_row;
end
$fn$;

revoke all on function assign_collection(uuid, uuid, text) from public, anon;
grant execute on function assign_collection(uuid, uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 2. The driver answers
-- ---------------------------------------------------------------------

create or replace function driver_collected(p_collection_id uuid, p_note text default null)
returns payment_collections
language plpgsql
security definer
set search_path = public, private
as $fn$
declare v_row payment_collections;
begin
  select * into v_row from payment_collections where id = p_collection_id for update;
  if not found then
    raise exception 'That collection does not exist.';
  end if;
  -- Only the driver it was given to, and only while it is with them.
  if v_row.driver_id <> auth.uid() then
    raise exception 'Permission denied: this collection was given to somebody else.';
  end if;
  if v_row.status <> 'with_driver' then
    raise exception 'This collection is no longer with you.';
  end if;

  update payment_collections
     set status         = 'collected',
         collected_at   = now(),
         collected_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_collection_id
  returning * into v_row;

  return v_row;
end
$fn$;

revoke all on function driver_collected(uuid, text) from public, anon;
grant execute on function driver_collected(uuid, text) to authenticated;


create or replace function driver_declined(p_collection_id uuid, p_reason text)
returns payment_collections
language plpgsql
security definer
set search_path = public, private
as $fn$
declare v_row payment_collections;
begin
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Say why the money could not be collected.';
  end if;

  select * into v_row from payment_collections where id = p_collection_id for update;
  if not found then
    raise exception 'That collection does not exist.';
  end if;
  if v_row.driver_id <> auth.uid() then
    raise exception 'Permission denied: this collection was given to somebody else.';
  end if;
  if v_row.status <> 'with_driver' then
    raise exception 'This collection is no longer with you.';
  end if;

  update payment_collections
     set status        = 'declined',
         closed_reason = btrim(p_reason),
         closed_at     = now()
   where id = p_collection_id
  returning * into v_row;

  return v_row;
end
$fn$;

revoke all on function driver_declined(uuid, text) from public, anon;
grant execute on function driver_declined(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 3. The money reaches the office — the bill is paid
-- ---------------------------------------------------------------------

create or replace function confirm_collection(p_collection_id uuid, p_note text default null)
returns bills
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_row  payment_collections;
  v_bill bills;
begin
  if not has_role('gm', 'ceo') then
    raise exception 'Permission denied: only the GM or a superadmin can take the money in.';
  end if;

  select * into v_row from payment_collections where id = p_collection_id for update;
  if not found then
    raise exception 'That collection does not exist.';
  end if;
  if v_row.status = 'received' then
    raise exception 'That money was already taken in.';
  end if;
  if v_row.status <> 'collected' then
    raise exception 'The driver has not collected this one yet.';
  end if;

  select * into v_bill from bills where id = v_row.bill_id for update;
  if v_bill.cancelled_at is not null then
    raise exception 'Bill % is cancelled.', v_bill.bill_number;
  end if;
  if v_bill.paid_at is not null then
    raise exception 'Bill % is already paid.', v_bill.bill_number;
  end if;

  update payment_collections
     set status        = 'received',
         received_at   = now(),
         received_by   = auth.uid(),
         received_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_collection_id;

  update bills
     set paid_at = now(),
         paid_by = auth.uid()
   where id = v_bill.id
  returning * into v_bill;

  return v_bill;
end
$fn$;

revoke all on function confirm_collection(uuid, text) from public, anon;
grant execute on function confirm_collection(uuid, text) to authenticated;


-- The customer paid at the office or by transfer: no driver involved (D77).
create or replace function record_payment(p_bill_id uuid, p_note text default null)
returns bills
language plpgsql
security definer
set search_path = public, private
as $fn$
declare v_bill bills;
begin
  if not has_role('gm', 'ceo') then
    raise exception 'Permission denied: only the GM or a superadmin can record a payment.';
  end if;

  select * into v_bill from bills where id = p_bill_id for update;
  if not found then
    raise exception 'That bill does not exist.';
  end if;
  if v_bill.cancelled_at is not null then
    raise exception 'Bill % is cancelled.', v_bill.bill_number;
  end if;
  if v_bill.paid_at is not null then
    raise exception 'Bill % is already paid.', v_bill.bill_number;
  end if;
  if exists (select 1 from payment_collections c
              where c.bill_id = p_bill_id and c.status in ('with_driver', 'collected')) then
    raise exception
      'Bill % is out with a driver. Take it back first, or take the money in from the driver.',
      v_bill.bill_number;
  end if;

  update bills
     set paid_at = now(),
         paid_by = auth.uid()
   where id = p_bill_id
  returning * into v_bill;

  return v_bill;
end
$fn$;

revoke all on function record_payment(uuid, text) from public, anon;
grant execute on function record_payment(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 4. Taking a job back
--
-- Only while the driver has not collected: once the money is in their
-- hands the office takes it in, it does not vanish from the record.
-- ---------------------------------------------------------------------

create or replace function cancel_collection(p_collection_id uuid, p_reason text)
returns payment_collections
language plpgsql
security definer
set search_path = public, private
as $fn$
declare v_row payment_collections;
begin
  if not has_role('gm', 'ceo') then
    raise exception 'Permission denied: only the GM or a superadmin can take a collection back.';
  end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Say why the collection is being taken back.';
  end if;

  select * into v_row from payment_collections where id = p_collection_id for update;
  if not found then
    raise exception 'That collection does not exist.';
  end if;
  if v_row.status = 'collected' then
    raise exception 'The driver already has the money. Take it in instead.';
  end if;
  if v_row.status <> 'with_driver' then
    raise exception 'That collection is already closed.';
  end if;

  update payment_collections
     set status        = 'cancelled',
         closed_reason = btrim(p_reason),
         closed_at     = now()
   where id = p_collection_id
  returning * into v_row;

  return v_row;
end
$fn$;

revoke all on function cancel_collection(uuid, text) from public, anon;
grant execute on function cancel_collection(uuid, text) to authenticated;


-- Cancelling the bill closes whatever job is out on it: there is nothing
-- left to collect.
create or replace function cancel_bill(p_bill_id uuid, p_reason text)
returns bills
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_bill bills;
  v_mv   stock_movements;
begin
  if not has_role('admin', 'gm', 'ceo') then
    raise exception 'Permission denied: only an admin, the GM or a superadmin can cancel a bill.';
  end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Say why the bill is being cancelled.';
  end if;

  select * into v_bill from bills where id = p_bill_id for update;
  if not found then
    raise exception 'That bill does not exist.';
  end if;
  if v_bill.cancelled_at is not null then
    raise exception 'Bill % is already cancelled.', v_bill.bill_number;
  end if;
  if exists (select 1 from payment_collections c
              where c.bill_id = p_bill_id and c.status = 'collected') then
    raise exception
      'A driver is holding the money for bill %. Take it in before cancelling.', v_bill.bill_number;
  end if;

  -- Stock sold on the bill goes back where it came from — as new rows,
  -- the ledger is never edited.
  for v_mv in
    select m.*
      from bill_stock_movements bsm
      join bill_lines bl on bl.id = bsm.bill_line_id
      join stock_movements m on m.id = bsm.stock_movement_id
     where bl.bill_id = v_bill.id
  loop
    insert into stock_movements (item_id, warehouse_id, direction, qty, movement_type,
                                 delivery_note_line_id, reference_no, reversal_of,
                                 created_by, notes)
    values (v_mv.item_id, v_mv.warehouse_id, 'IN', v_mv.qty, 'reversal',
            v_mv.delivery_note_line_id, v_bill.bill_number, v_mv.id,
            auth.uid(), 'Bill ' || v_bill.bill_number || ' cancelled: ' || btrim(p_reason));
  end loop;

  update payment_collections
     set status        = 'cancelled',
         closed_reason = 'Bill ' || v_bill.bill_number || ' cancelled: ' || btrim(p_reason),
         closed_at     = now()
   where bill_id = v_bill.id and status = 'with_driver';

  update bills
     set cancelled_at  = now(),
         cancelled_by  = auth.uid(),
         cancel_reason = btrim(p_reason)
   where id = v_bill.id
  returning * into v_bill;

  return v_bill;
end
$fn$;

revoke all on function cancel_bill(uuid, text) from public, anon;
grant execute on function cancel_bill(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 5. Reading collections
--
-- The office sees them all; a driver sees the ones given to them, with
-- everything they need on the road (D78): the amount, the customer's
-- phone and address, the delivery note, and the GM's note.
-- ---------------------------------------------------------------------

create or replace view v_payment_collections as
  select c.id,
         c.status,
         c.bill_id,
         b.bill_number,
         b.kind             as bill_kind,
         b.created_at       as bill_date,
         d.dn_number,
         b.customer_id,
         b.customer_name,
         b.customer_name_ar,
         b.customer_phone,
         cu.address         as customer_address,
         t.total            as amount,
         c.driver_id,
         btrim(coalesce(dr.first_name, '') || ' ' || coalesce(dr.last_name, '')) as driver_name,
         c.assigned_at,
         btrim(coalesce(ab.first_name, '') || ' ' || coalesce(ab.last_name, '')) as assigned_by_name,
         c.note,
         c.collected_at,
         c.collected_note,
         c.received_at,
         btrim(coalesce(rb.first_name, '') || ' ' || coalesce(rb.last_name, '')) as received_by_name,
         c.received_note,
         c.closed_at,
         c.closed_reason
    from payment_collections c
    join bills b on b.id = c.bill_id
    left join delivery_notes d on d.id = b.delivery_note_id
    left join customers cu on cu.id = b.customer_id
    left join user_tbl dr on dr.id = c.driver_id
    left join user_tbl ab on ab.id = c.assigned_by
    left join user_tbl rb on rb.id = c.received_by
    left join lateral (
      select coalesce(sum(round(l.qty * l.unit_price, 2)) filter (where l.kind = 'goods'), 0)
           + coalesce(sum(l.unit_price) filter (where l.kind <> 'goods'), 0) as total
        from bill_lines l
       where l.bill_id = b.id
    ) t on true
   where (select private.has_role('ceo', 'gm', 'manager', 'admin'))
      or c.driver_id = (select auth.uid());

alter view v_payment_collections set (security_invoker = off);
revoke all on v_payment_collections from anon;
grant select on v_payment_collections to authenticated;


-- ---------------------------------------------------------------------
-- 6. A driver may read the bill they are sent to collect
--
-- Both views are recreated with one more way in: the driver holding a
-- live collection for that bill. Everything else is unchanged.
-- ---------------------------------------------------------------------

-- The role check is written as a sub-select so it is worked out once for
-- the whole query; only when it is false does the driver's own clause run
-- per row.
create or replace view v_bills as
  select b.id,
         b.bill_number,
         b.seq,
         b.kind,
         b.created_at,
         b.delivery_note_id,
         d.dn_number,
         b.customer_id,
         b.walk_in_name is not null as is_walk_in,
         b.customer_name,
         b.customer_name_ar,
         b.customer_phone,
         b.customer_terms,
         b.company,
         b.note,
         t.goods_total,
         t.services_total,
         t.goods_total + t.services_total as total,
         b.paid_at,
         b.cancelled_at,
         b.cancel_reason,
         nullif(btrim(coalesce(cu.first_name, '') || ' ' || coalesce(cu.last_name, '')), '')
           as created_by_name,
         nullif(btrim(coalesce(xu.first_name, '') || ' ' || coalesce(xu.last_name, '')), '')
           as cancelled_by_name,
         -- Where the money is, for the office's list (D74).
         live.status       as collection_status,
         live.driver_name  as collection_driver_name,
         live.id           as collection_id
    from bills b
    left join delivery_notes d on d.id = b.delivery_note_id
    left join lateral (
      select coalesce(sum(round(l.qty * l.unit_price, 2)) filter (where l.kind = 'goods'), 0)
               as goods_total,
             coalesce(sum(l.unit_price) filter (where l.kind <> 'goods'), 0)
               as services_total
        from bill_lines l
       where l.bill_id = b.id
    ) t on true
    left join lateral (
      select c.id, c.status,
             btrim(coalesce(dr.first_name, '') || ' ' || coalesce(dr.last_name, '')) as driver_name
        from payment_collections c
        left join user_tbl dr on dr.id = c.driver_id
       where c.bill_id = b.id and c.status in ('with_driver', 'collected')
       limit 1
    ) live on true
    left join user_tbl cu on cu.id = b.created_by
    left join user_tbl xu on xu.id = b.cancelled_by
   where (select private.has_role('ceo', 'gm', 'manager', 'admin'))
      or exists (
        select 1 from payment_collections c
         where c.bill_id = b.id
           and c.driver_id = (select auth.uid())
           and c.status in ('with_driver', 'collected')
      );

alter view v_bills set (security_invoker = off);
revoke all on v_bills from anon;
grant select on v_bills to authenticated;


create or replace view v_bill_lines as
  select l.bill_id,
         l.line_no,
         l.kind,
         l.item_id,
         i.item_number,
         l.description,
         l.uom,
         l.qty,
         l.list_price,
         l.unit_price,
         round(l.qty * l.unit_price, 2)                  as amount,
         l.list_price is not null and l.unit_price <> l.list_price as is_revised,
         l.revise_note
    from bill_lines l
    left join items i on i.id = l.item_id
   where (select private.has_role('ceo', 'gm', 'manager', 'admin'))
      or exists (
        select 1 from payment_collections c
         where c.bill_id = l.bill_id
           and c.driver_id = (select auth.uid())
           and c.status in ('with_driver', 'collected')
      );

alter view v_bill_lines set (security_invoker = off);
revoke all on v_bill_lines from anon;
grant select on v_bill_lines to authenticated;
