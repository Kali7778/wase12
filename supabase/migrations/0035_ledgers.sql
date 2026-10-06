-- =====================================================================
--  0035 — Two ledgers: the customer's account, and the employee's
--
--  Until now a bill was paid or it was not. Real money does not behave
--  that way: a driver sent to collect 500 sometimes comes back with 400,
--  and the hundred is either still with the customer or still with the
--  driver. The GM is the one who knows which, so the GM says so when the
--  money is taken in (D82).
--
--    * The customer kept it  — only 400 is credited to the customer. The
--      bill stays open for 100 and can be collected again. This is the
--      one case where a bill is part-paid (D83, narrowing D57).
--
--    * The driver kept it    — the customer paid in full, so the bill is
--      settled; the 100 becomes the driver's to answer for, and lands in
--      the employee ledger (D83).
--
--  Both halves are ledgers, and neither is ever edited (D86, D84):
--
--    bill_payments    every riyal received against a bill — the credit
--                     side of the customer's account, promised in D51/D57
--    employee_ledger  what an employee owes and what has been settled:
--                     the shortfall above, plus whatever the GM adds by
--                     hand — an advance, a fine, cash handed back, or a
--                     deduction from a month's salary (D85)
--
--  A wrong entry is corrected with an opposite entry, never deleted.
--  Payroll itself is a later phase; this is the hisaab it will read.
-- =====================================================================


do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_source') then
    -- Where the money came from: a driver's collection, or the office.
    create type payment_source as enum ('collection', 'office');
  end if;
  if not exists (select 1 from pg_type where typname = 'employee_ledger_kind') then
    create type employee_ledger_kind as enum (
      'shortfall',         -- collection came up short and the driver kept it
      'charge',            -- an advance, a fine — anything the GM adds
      'repayment',         -- the employee handed the money back
      'salary_deduction'   -- taken out of a month's salary (D85)
    );
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 0. Nothing in a ledger is rewritten
-- ---------------------------------------------------------------------

create or replace function private.block_ledger_write()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  raise exception 'A ledger entry cannot be %. Add an entry the other way instead.',
    case tg_op when 'UPDATE' then 'changed' else 'removed' end;
end
$$;

revoke all on function private.block_ledger_write() from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 1. The customer's side: every riyal received against a bill
-- ---------------------------------------------------------------------

create table bill_payments (
  id             uuid primary key default gen_random_uuid(),
  bill_id        uuid not null references bills(id),
  amount         numeric(12, 2) not null,
  -- The day the money came in, as the office counts days.
  paid_on        date not null default (now() at time zone 'Asia/Riyadh')::date,
  source         payment_source not null,
  collection_id  uuid references payment_collections(id),
  note           text,
  created_at     timestamptz not null default now(),
  created_by     uuid not null references user_tbl(id),

  constraint payment_is_positive check (amount > 0),
  constraint collection_payment_names_the_job check (
    (source = 'collection') = (collection_id is not null)
  )
);

comment on table bill_payments is
  'Money received against a bill. The credit side of a customer''s account; never edited.';

create index bill_payments_bill_idx on bill_payments (bill_id, paid_on);
create index bill_payments_collection_idx on bill_payments (collection_id) where collection_id is not null;

create trigger bill_payments_no_update before update on bill_payments
  for each row execute function private.block_ledger_write();
create trigger bill_payments_no_delete before delete on bill_payments
  for each row execute function private.block_ledger_write();

alter table bill_payments enable row level security;

create policy bill_payments_read on bill_payments
  for select to authenticated
  using ((select private.has_role('ceo', 'gm', 'manager', 'admin')));

-- No write policies: payments are written by the functions below.


-- A bill paid at the till (a cash customer or a walk-in, D67) is paid in
-- full the moment it is written — but its lines do not exist yet when the
-- bill row is inserted, so the total is unknown. A deferred trigger runs
-- at commit, when the bill is whole, and records that payment like any
-- other. Without it the customer's account would show a debt that was
-- settled before anybody left the counter.
create or replace function private.record_till_payment()
returns trigger
language plpgsql
set search_path = public, private
as $$
declare v_total numeric;
begin
  if new.paid_at is null then
    return null;
  end if;
  if exists (select 1 from bill_payments p where p.bill_id = new.id) then
    return null;
  end if;

  select coalesce(sum(round(l.qty * l.unit_price, 2)) filter (where l.kind = 'goods'), 0)
       + coalesce(sum(l.unit_price) filter (where l.kind <> 'goods'), 0)
    into v_total
    from bill_lines l
   where l.bill_id = new.id;

  if v_total > 0 then
    insert into bill_payments (bill_id, amount, paid_on, source, note, created_by)
    values (new.id, v_total, (new.paid_at at time zone 'Asia/Riyadh')::date, 'office',
            'Paid at the till', new.paid_by);
  end if;
  return null;
end
$$;

revoke all on function private.record_till_payment() from public, anon, authenticated;

create constraint trigger bills_till_payment
  after insert on bills
  deferrable initially deferred
  for each row execute function private.record_till_payment();


-- ---------------------------------------------------------------------
-- 2. The employee's side
-- ---------------------------------------------------------------------

create table employee_ledger (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references user_tbl(id),
  kind           employee_ledger_kind not null,
  amount         numeric(12, 2) not null,
  occurred_on    date not null default (now() at time zone 'Asia/Riyadh')::date,
  -- What this is for, in the GM's own words: it is the line the employee
  -- will be shown when the deduction is explained.
  description    text not null,
  remarks        text,
  -- Set when the entry came from a collection that fell short.
  collection_id  uuid references payment_collections(id),
  bill_id        uuid references bills(id),
  created_at     timestamptz not null default now(),
  created_by     uuid not null references user_tbl(id),

  constraint ledger_amount_is_positive check (amount > 0),
  constraint ledger_says_what_it_is check (btrim(description) <> '')
);

comment on table employee_ledger is
  'What an employee owes the company and what has been settled. Append-only: correct with an opposite entry.';

create index employee_ledger_employee_idx on employee_ledger (employee_id, occurred_on desc, created_at desc);

create trigger employee_ledger_no_update before update on employee_ledger
  for each row execute function private.block_ledger_write();
create trigger employee_ledger_no_delete before delete on employee_ledger
  for each row execute function private.block_ledger_write();

alter table employee_ledger enable row level security;

-- Only the GM and a superadmin (D84). An employee does not see their own.
create policy employee_ledger_read on employee_ledger
  for select to authenticated
  using ((select private.has_role('gm', 'ceo')));


-- Which way an entry moves the balance: what the employee owes, less what
-- has been settled.
create or replace function private.ledger_sign(p_kind employee_ledger_kind)
returns integer
language sql
immutable
as $$
  select case p_kind when 'shortfall' then 1 when 'charge' then 1 else -1 end;
$$;


-- ---------------------------------------------------------------------
-- 3. The job a collection now does when the money is short (D82, D83)
-- ---------------------------------------------------------------------

alter table payment_collections add column received_amount numeric(12, 2);

-- Jobs taken in before this migration were always for the whole bill;
-- that is what they say now, so the rule below holds for them too.
update payment_collections c
   set received_amount = (
     select coalesce(sum(round(l.qty * l.unit_price, 2)) filter (where l.kind = 'goods'), 0)
          + coalesce(sum(l.unit_price) filter (where l.kind <> 'goods'), 0)
       from bill_lines l
      where l.bill_id = c.bill_id
   )
 where c.status = 'received' and c.received_amount is null;

alter table payment_collections
  add constraint received_amount_with_the_money check (
    (received_amount is null) = (status <> 'received')
  );


create or replace function confirm_collection(
  p_collection_id    uuid,
  p_amount           numeric default null,
  p_shortfall_owner  text    default null,   -- 'driver' or 'customer'
  p_description      text    default null,
  p_note             text    default null
)
returns bills
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_row         payment_collections;
  v_bill        bills;
  v_total       numeric;
  v_paid        numeric;
  v_outstanding numeric;
  v_amount      numeric;
  v_short       numeric;
  v_owner       text := lower(nullif(btrim(coalesce(p_shortfall_owner, '')), ''));
  v_desc        text := nullif(btrim(coalesce(p_description, '')), '');
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

  select coalesce(sum(round(l.qty * l.unit_price, 2)) filter (where l.kind = 'goods'), 0)
       + coalesce(sum(l.unit_price) filter (where l.kind <> 'goods'), 0)
    into v_total from bill_lines l where l.bill_id = v_bill.id;
  select coalesce(sum(amount), 0) into v_paid from bill_payments where bill_id = v_bill.id;
  v_outstanding := v_total - v_paid;

  v_amount := coalesce(p_amount, v_outstanding);
  if v_amount <= 0 or v_amount <> round(v_amount, 2) then
    raise exception 'The amount taken in must be more than zero, with at most two decimals.';
  end if;
  if v_amount > v_outstanding then
    raise exception 'Bill % only has % SAR left to collect.', v_bill.bill_number, trim_scale(v_outstanding);
  end if;

  v_short := v_outstanding - v_amount;

  if v_short > 0 then
    -- `v_owner is null` first: a NULL compared with IN is neither true nor
    -- false, so the check would wave an unanswered question through.
    if v_owner is null or v_owner not in ('driver', 'customer') then
      raise exception
        'Say where the % SAR that is missing sits: with the driver, or still with the customer.',
        trim_scale(v_short);
    end if;
    if v_desc is null then
      raise exception 'Say what happened to the % SAR that is missing.', trim_scale(v_short);
    end if;
  end if;

  update payment_collections
     set status          = 'received',
         received_at     = now(),
         received_by     = auth.uid(),
         received_amount = v_amount,
         received_note   = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_collection_id;

  -- The customer's side. When the driver kept the difference the customer
  -- paid in full, so the whole outstanding amount is credited to them.
  insert into bill_payments (bill_id, amount, source, collection_id, note, created_by)
  values (v_bill.id,
          case when v_short > 0 and v_owner = 'driver' then v_outstanding else v_amount end,
          'collection', p_collection_id,
          coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'Collected by the driver'),
          auth.uid());

  -- The driver's side.
  if v_short > 0 and v_owner = 'driver' then
    insert into employee_ledger (employee_id, kind, amount, description, remarks,
                                 collection_id, bill_id, created_by)
    values (v_row.driver_id, 'shortfall', v_short, v_desc,
            'Short on ' || v_bill.bill_number, p_collection_id, v_bill.id, auth.uid());
  end if;

  -- The bill is paid when nothing is left against it.
  if (select coalesce(sum(amount), 0) from bill_payments where bill_id = v_bill.id) >= v_total then
    update bills set paid_at = now(), paid_by = auth.uid()
     where id = v_bill.id
    returning * into v_bill;
  end if;

  return v_bill;
end
$fn$;

revoke all on function confirm_collection(uuid, numeric, text, text, text) from public, anon;
grant execute on function confirm_collection(uuid, numeric, text, text, text) to authenticated;

-- The old two-argument shape is gone: taking money in now always says how
-- much, so that a part payment can never slip in unnoticed.
drop function if exists confirm_collection(uuid, text);


-- Paid at the office or by transfer (D77), in full or in part.
create or replace function record_payment(
  p_bill_id uuid,
  p_amount  numeric default null,
  p_note    text    default null
)
returns bills
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_bill        bills;
  v_total       numeric;
  v_paid        numeric;
  v_outstanding numeric;
  v_amount      numeric;
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

  select coalesce(sum(round(l.qty * l.unit_price, 2)) filter (where l.kind = 'goods'), 0)
       + coalesce(sum(l.unit_price) filter (where l.kind <> 'goods'), 0)
    into v_total from bill_lines l where l.bill_id = v_bill.id;
  select coalesce(sum(amount), 0) into v_paid from bill_payments where bill_id = v_bill.id;
  v_outstanding := v_total - v_paid;

  v_amount := coalesce(p_amount, v_outstanding);
  if v_amount <= 0 or v_amount <> round(v_amount, 2) then
    raise exception 'A payment must be more than zero, with at most two decimals.';
  end if;
  if v_amount > v_outstanding then
    raise exception 'Bill % only has % SAR left to pay.', v_bill.bill_number, trim_scale(v_outstanding);
  end if;

  insert into bill_payments (bill_id, amount, source, note, created_by)
  values (v_bill.id, v_amount, 'office', nullif(btrim(coalesce(p_note, '')), ''), auth.uid());

  if v_paid + v_amount >= v_total then
    update bills set paid_at = now(), paid_by = auth.uid()
     where id = v_bill.id
    returning * into v_bill;
  end if;

  return v_bill;
end
$fn$;

revoke all on function record_payment(uuid, numeric, text) from public, anon;
grant execute on function record_payment(uuid, numeric, text) to authenticated;

drop function if exists record_payment(uuid, text);


-- Money has been taken against a bill, so it cannot simply be undone.
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
  -- Money already received does not block this: a cash bill written by
  -- mistake is cancelled at the counter and the notes handed straight
  -- back. What it does mean is that the money must actually go back —
  -- the cancelled bill and its payments both drop out of the customer's
  -- account, so leaving the cash in the till would make that account a
  -- lie. The reason, which is required, is the record of what was done.

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
-- 4. What the GM adds by hand (D84, D85)
-- ---------------------------------------------------------------------

create or replace function add_employee_entry(
  p_employee_id uuid,
  p_kind        employee_ledger_kind,
  p_amount      numeric,
  p_description text,
  p_remarks     text default null,
  p_occurred_on date default null
)
returns employee_ledger
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_employee user_tbl;
  v_row      employee_ledger;
begin
  if not has_role('gm', 'ceo') then
    raise exception 'Permission denied: only the GM or a superadmin can write in an employee ledger.';
  end if;
  -- A shortfall is never typed in: it is what a collection left behind.
  if p_kind = 'shortfall' then
    raise exception 'A shortfall is recorded when the money is taken in, not by hand.';
  end if;

  select * into v_employee from user_tbl where id = p_employee_id;
  if not found then
    raise exception 'That employee does not exist.';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'An amount must be more than zero, with at most two decimals.';
  end if;
  if nullif(btrim(coalesce(p_description, '')), '') is null then
    raise exception 'Say what this entry is for.';
  end if;
  if p_occurred_on is not null and p_occurred_on > (now() at time zone 'Asia/Riyadh')::date then
    raise exception 'That date is in the future.';
  end if;

  insert into employee_ledger (employee_id, kind, amount, occurred_on, description, remarks, created_by)
  values (p_employee_id, p_kind, p_amount,
          coalesce(p_occurred_on, (now() at time zone 'Asia/Riyadh')::date),
          btrim(p_description), nullif(btrim(coalesce(p_remarks, '')), ''), auth.uid())
  returning * into v_row;

  return v_row;
end
$fn$;

revoke all on function add_employee_entry(uuid, employee_ledger_kind, numeric, text, text, date)
  from public, anon;
grant execute on function add_employee_entry(uuid, employee_ledger_kind, numeric, text, text, date)
  to authenticated;


-- ---------------------------------------------------------------------
-- 5. Reading the two ledgers
-- ---------------------------------------------------------------------

-- A customer's account: each bill on one side, each payment on the other,
-- oldest first, with the balance as it stood after every line.
create or replace view v_customer_ledger as
  with entries as (
    select b.customer_id,
           b.created_at                        as entry_at,
           (b.created_at at time zone 'Asia/Riyadh')::date as entry_date,
           'bill'::text                        as entry_kind,
           b.bill_number                       as reference,
           coalesce(d.dn_number, '')           as dn_number,
           coalesce(b.note, '')                as note,
           t.total                             as debit,
           0::numeric                          as credit,
           b.id                                as bill_id,
           b.id                                as entry_id
      from bills b
      left join delivery_notes d on d.id = b.delivery_note_id
      left join lateral (
        select coalesce(sum(round(l.qty * l.unit_price, 2)) filter (where l.kind = 'goods'), 0)
             + coalesce(sum(l.unit_price) filter (where l.kind <> 'goods'), 0) as total
          from bill_lines l where l.bill_id = b.id
      ) t on true
     where b.customer_id is not null
       and b.cancelled_at is null
    union all
    select b.customer_id,
           p.created_at,
           p.paid_on,
           'payment',
           b.bill_number,
           '',
           coalesce(p.note, ''),
           0::numeric,
           p.amount,
           b.id,
           p.id
      from bill_payments p
      join bills b on b.id = p.bill_id
     where b.customer_id is not null
       and b.cancelled_at is null
  )
  select e.customer_id,
         c.name                          as customer_name,
         c.terms                         as customer_terms,
         e.entry_id,
         e.entry_date,
         e.entry_at,
         e.entry_kind,
         e.reference,
         e.dn_number,
         e.note,
         e.debit,
         e.credit,
         e.bill_id,
         -- A till sale writes the bill and its payment in one transaction,
         -- so both carry the same timestamp; the bill has to be read first
         -- or the balance dips below zero on the way.
         sum(e.debit - e.credit) over (
           partition by e.customer_id
           order by e.entry_date, e.entry_at,
                    case e.entry_kind when 'bill' then 0 else 1 end
           rows between unbounded preceding and current row
         )                               as balance
    from entries e
    join customers c on c.id = e.customer_id
   where (select private.has_role('ceo', 'gm', 'manager', 'admin'));

alter view v_customer_ledger set (security_invoker = off);
revoke all on v_customer_ledger from anon;
grant select on v_customer_ledger to authenticated;


create or replace view v_customer_balances as
  select c.id                                   as customer_id,
         c.name                                 as customer_name,
         c.terms                                as customer_terms,
         c.phone,
         c.is_active,
         coalesce(b.billed, 0)                  as billed,
         coalesce(b.paid, 0)                    as paid,
         coalesce(b.billed, 0) - coalesce(b.paid, 0) as balance,
         b.open_bills,
         b.oldest_open
    from customers c
    left join lateral (
      select count(*) filter (where x.paid_at is null)        as open_bills,
             min(x.created_at) filter (where x.paid_at is null) as oldest_open,
             sum(x.total)                                     as billed,
             sum(x.paid_amount)                               as paid
        from (
          select bi.id, bi.paid_at, bi.created_at,
                 (select coalesce(sum(round(l.qty * l.unit_price, 2)) filter (where l.kind = 'goods'), 0)
                       + coalesce(sum(l.unit_price) filter (where l.kind <> 'goods'), 0)
                    from bill_lines l where l.bill_id = bi.id) as total,
                 (select coalesce(sum(p.amount), 0) from bill_payments p where p.bill_id = bi.id)
                    as paid_amount
            from bills bi
           where bi.customer_id = c.id and bi.cancelled_at is null
        ) x
    ) b on true
   where (select private.has_role('ceo', 'gm', 'manager', 'admin'));

alter view v_customer_balances set (security_invoker = off);
revoke all on v_customer_balances from anon;
grant select on v_customer_balances to authenticated;


-- The employee's account: what they owe, what has been settled, and the
-- balance after each line. The GM and a superadmin only (D84).
create or replace view v_employee_ledger as
  select l.id,
         l.employee_id,
         btrim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) as employee_name,
         l.occurred_on,
         l.created_at,
         l.kind,
         l.description,
         l.remarks,
         l.amount,
         private.ledger_sign(l.kind) * l.amount as signed_amount,
         l.bill_id,
         b.bill_number,
         l.collection_id,
         nullif(btrim(coalesce(cu.first_name, '') || ' ' || coalesce(cu.last_name, '')), '')
           as created_by_name,
         sum(private.ledger_sign(l.kind) * l.amount) over (
           partition by l.employee_id
           order by l.occurred_on, l.created_at
           rows between unbounded preceding and current row
         ) as balance
    from employee_ledger l
    left join user_tbl u on u.id = l.employee_id
    left join user_tbl cu on cu.id = l.created_by
    left join bills b on b.id = l.bill_id
   where (select private.has_role('gm', 'ceo'));

alter view v_employee_ledger set (security_invoker = off);
revoke all on v_employee_ledger from anon;
grant select on v_employee_ledger to authenticated;


create or replace view v_employee_balances as
  select u.id                                           as employee_id,
         btrim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) as employee_name,
         u.email,
         u.is_active,
         coalesce(l.owed, 0)                            as owed,
         coalesce(l.settled, 0)                         as settled,
         coalesce(l.owed, 0) - coalesce(l.settled, 0)   as balance,
         l.last_entry_on
    from user_tbl u
    left join lateral (
      select sum(e.amount) filter (where private.ledger_sign(e.kind) = 1)  as owed,
             sum(e.amount) filter (where private.ledger_sign(e.kind) = -1) as settled,
             max(e.occurred_on)                                            as last_entry_on
        from employee_ledger e
       where e.employee_id = u.id
    ) l on true
   where (select private.has_role('gm', 'ceo'));

alter view v_employee_balances set (security_invoker = off);
revoke all on v_employee_balances from anon;
grant select on v_employee_balances to authenticated;


-- ---------------------------------------------------------------------
-- 6. The bill list now says how much of each bill has been paid
--
-- `paid_amount` and `outstanding` sit beside the total rather than at the
-- end, which `create or replace` cannot do — so the view is dropped and
-- written again. It holds no data of its own.
-- ---------------------------------------------------------------------

drop view if exists v_bills;

create view v_bills as
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
         coalesce(pay.paid_amount, 0)                                   as paid_amount,
         t.goods_total + t.services_total - coalesce(pay.paid_amount, 0) as outstanding,
         b.paid_at,
         b.cancelled_at,
         b.cancel_reason,
         nullif(btrim(coalesce(cu.first_name, '') || ' ' || coalesce(cu.last_name, '')), '')
           as created_by_name,
         nullif(btrim(coalesce(xu.first_name, '') || ' ' || coalesce(xu.last_name, '')), '')
           as cancelled_by_name,
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
      select coalesce(sum(p.amount), 0) as paid_amount
        from bill_payments p
       where p.bill_id = b.id
    ) pay on true
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
