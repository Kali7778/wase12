-- =====================================================================
--  0030 — Talab: a slip whose goods belong to somebody else
--
--  The client buys from El-Khayyat in their own name. Sometimes another
--  company orders through them: the supplier still prints the slip in the
--  client's name, but the truck goes straight from the plant to that
--  company's yard. The goods never reach the warehouse.
--
--  What that changes (decisions D49, D50):
--
--    * No stock. Counting a load that is not in the building would make
--      the register say there are bags on hand that nobody has.
--    * No count either. The client decided this knowing the risk: if the
--      supplier loads 700 against a slip for 750, the shortfall is theirs
--      and there is no record of it. It was raised twice; this is their
--      call, and the system now says plainly "not counted" rather than
--      leaving a blank that looks like a count of zero.
--    * A different ending. The office marks the slip delivered when the
--      customer has the goods.
--
--  Customers arrive here too, not in a later migration: a talab slip
--  without a customer is meaningless, and typing the name as free text
--  would mean unpicking it again when the billing work starts (D51).
--
--  Run after 0029.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Who the goods are for
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'customer_terms') then
    -- How they pay, which decides whether they need a ledger (D51).
    create type customer_terms as enum ('weekly', 'cash');
  end if;

  if not exists (select 1 from pg_type where typname = 'dn_purpose') then
    create type dn_purpose as enum ('stock', 'talab');
  end if;
end $$;


create table customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  name_ar     text,
  phone       text,
  -- 'weekly' customers run an account and will have a ledger; 'cash'
  -- customers settle on the spot and only need a name on the bill.
  terms       customer_terms not null default 'cash',
  vat_number  text,
  address     text,
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references user_tbl(id),

  constraint customer_name_present check (btrim(name) <> '')
);

comment on table customers is
  'Companies that order through the client. Weekly ones run an account; cash ones pay on the spot.';

-- One record per company: the whole point of a customer list is that the
-- same company is not entered three different ways.
create unique index customers_name_key on customers (lower(btrim(name)));

create index customers_active_idx on customers (name) where is_active;

alter table customers enable row level security;

create policy customers_read on customers
  for select to authenticated
  using ((select private.current_user_role()) is not null);

create policy customers_insert on customers
  for insert to authenticated
  with check ((select private.has_role('admin', 'manager', 'gm', 'ceo')));

create policy customers_update on customers
  for update to authenticated
  using ((select private.has_role('admin', 'manager', 'gm', 'ceo')))
  with check ((select private.has_role('admin', 'manager', 'gm', 'ceo')));

-- Nobody deletes a customer: bills and slips point at them. Retire instead.
create policy customers_delete on customers
  for delete to authenticated
  using (false);


-- ---------------------------------------------------------------------
-- 2. The slip says who it is for
-- ---------------------------------------------------------------------

alter table delivery_notes
  add column purpose      dn_purpose not null default 'stock',
  add column customer_id  uuid references customers(id),
  add column delivered_at timestamptz,
  add column delivered_by uuid references user_tbl(id),

  -- A talab slip names its customer; a stock slip does not have one.
  add constraint talab_needs_customer check (
    (purpose = 'talab' and customer_id is not null)
    or (purpose = 'stock' and customer_id is null)
  ),
  -- Only a talab slip is "delivered"; stock is received instead.
  add constraint only_talab_is_delivered check (
    delivered_at is null or purpose = 'talab'
  ),
  add constraint delivery_is_complete check (
    (delivered_at is null and delivered_by is null)
    or (delivered_at is not null and delivered_by is not null)
  );

comment on column delivery_notes.purpose is
  'stock = for our warehouse. talab = bought for a customer, goes straight to them, never becomes stock.';

-- The talab list, newest first.
create index delivery_notes_talab_idx
  on delivery_notes (created_at desc)
  where purpose = 'talab';

create index delivery_notes_customer_idx
  on delivery_notes (customer_id, created_at desc)
  where customer_id is not null;

-- Marking one delivered is its own kind of step in the ledger.
alter table dn_workflow_log drop constraint if exists action_is_known;
alter table dn_workflow_log add constraint action_is_known check (
  action in ('hand_over', 'reassign_driver', 'acknowledge',
             'approve', 'reject', 'receive', 'replace', 'deliver')
);


-- ---------------------------------------------------------------------
-- 3. Recording one
--
-- `create_delivery_note` grows two parameters. The signature changes, so
-- the old one is dropped first.
-- ---------------------------------------------------------------------

drop function if exists create_delivery_note(
  text, text, text, text, text, text, numeric, text, text, text, text, text, text,
  date, date, uuid, text, text, text, text, extraction_method, numeric, text[], text,
  uuid, dn_reissue_reason, text
);

create function create_delivery_note(
  p_dn_number          text,
  p_so_number          text,
  p_supplier_code      text,
  p_item_number        text,
  p_item_description   text,
  p_uom                text,
  p_pdf_qty            numeric,
  p_customer_number    text default null,
  p_customer_name      text default null,
  p_shipping_ref       text default null,
  p_ship_from          text default null,
  p_ship_to            text default null,
  p_salesman           text default null,
  p_print_date         date default null,
  p_order_date         date default null,
  p_batch_id           uuid default null,
  p_pdf_path           text default null,
  p_pdf_file_name      text default null,
  p_pdf_sha256         text default null,
  p_file_type          text default 'pdf',
  p_extraction         extraction_method default 'pdf_text',
  p_confidence         numeric default null,
  p_needs_review       text[] default '{}',
  p_so_override_reason text default null,
  p_replaces_dn_id     uuid default null,
  p_reissue_reason     dn_reissue_reason default null,
  p_reissue_note       text default null,
  p_purpose            dn_purpose default 'stock',
  p_talab_customer_id  uuid default null
)
returns delivery_notes
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_dn_number  text := btrim(coalesce(p_dn_number, ''));
  v_so_number  text := btrim(coalesce(p_so_number, ''));
  v_sha256     text := lower(nullif(btrim(coalesce(p_pdf_sha256, '')), ''));
  v_supplier   uuid;
  v_item       uuid;
  v_dn         delivery_notes;
  v_original   delivery_notes;
  v_other      text;
  v_constraint text;
begin
  if not has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo') then
    raise exception 'Permission denied: you are not allowed to upload delivery notes.';
  end if;

  if v_dn_number = '' then
    raise exception 'Delivery note number is required.';
  end if;
  if v_so_number = '' then
    raise exception 'Sales order number is required.';
  end if;
  if coalesce(btrim(p_item_number), '') = '' then
    raise exception 'Item number is required.';
  end if;
  if p_pdf_qty is null or p_pdf_qty <= 0 then
    raise exception 'Quantity must be greater than zero.';
  end if;

  -- Who the load is for (D49).
  if p_purpose = 'talab' then
    if p_talab_customer_id is null then
      raise exception 'Choose the customer this load is for.';
    end if;
    if not exists (select 1 from customers where id = p_talab_customer_id and is_active) then
      raise exception 'That customer does not exist, or is no longer active.';
    end if;
  elsif p_talab_customer_id is not null then
    raise exception 'A customer only belongs on a slip that is for a customer.';
  end if;

  -- Reissue rules, checked before anything is written.
  if p_replaces_dn_id is not null then
    if not has_role('admin', 'gm', 'ceo') then
      raise exception
        'Permission denied: only an admin, the GM or a superadmin can record a replacement slip.';
    end if;
    if p_reissue_reason is null then
      raise exception 'A reason is required when a slip replaces another one.';
    end if;
    if p_reissue_reason = 'other' and coalesce(btrim(p_reissue_note), '') = '' then
      raise exception 'Please describe the reason when choosing "Other".';
    end if;

    select * into v_original from delivery_notes where id = p_replaces_dn_id;
    if not found then
      raise exception 'The delivery note being replaced does not exist.';
    end if;
    if v_original.workflow_status = 'replaced' then
      raise exception 'Delivery note % has already been replaced.', v_original.dn_number;
    end if;
    if v_original.workflow_status = 'received' then
      raise exception
        'Delivery note % has already been counted in, so it cannot be replaced.',
        v_original.dn_number;
    end if;
    if v_original.workflow_status = 'delivered' then
      raise exception
        'Delivery note % has already been delivered to the customer, so it cannot be replaced.',
        v_original.dn_number;
    end if;
    -- A replacement is for the same load, so it is for the same people.
    if v_original.purpose <> p_purpose
       or v_original.customer_id is distinct from p_talab_customer_id then
      raise exception 'A replacement slip must be for the same load as the one it replaces.';
    end if;
  elsif p_reissue_reason is not null then
    raise exception 'A reason for reissue only belongs on a slip that replaces another one.';
  end if;

  -- Checked before anything is written, so a refused slip does not leave
  -- an auto-added product behind.
  select dn_number into v_other from delivery_notes where dn_number = v_dn_number;
  if v_other is not null then
    raise exception 'Delivery note % has already been uploaded.', v_dn_number;
  end if;

  if v_sha256 is not null then
    select dn_number into v_other from delivery_notes where pdf_sha256 = v_sha256;
    if v_other is not null then
      raise exception 'This file has already been uploaded as delivery note %.', v_other;
    end if;
  end if;

  select id into v_supplier from suppliers where code = coalesce(p_supplier_code, 'ELKHAYYAT');
  if v_supplier is null then
    raise exception 'Supplier % is not set up.', coalesce(p_supplier_code, 'ELKHAYYAT');
  end if;

  -- Find the item, or record the one this note is telling us about.
  select id into v_item from items where item_number = btrim(p_item_number);

  if v_item is null then
    insert into items (item_number, description_en, uom, is_auto_added)
    values (
      btrim(p_item_number),
      coalesce(nullif(btrim(p_item_description), ''), btrim(p_item_number)),
      coalesce(nullif(btrim(p_uom), ''), 'EA'),
      true
    )
    on conflict (item_number) do nothing;

    select id into v_item from items where item_number = btrim(p_item_number);
  end if;

  begin
    insert into delivery_notes (
      dn_number, so_number, supplier_id, customer_number, customer_name,
      shipping_reference, ship_from, ship_to, salesman, print_date, order_date,
      upload_batch_id, pdf_storage_path, pdf_file_name, pdf_sha256,
      source_file_type, extraction_method, extraction_confidence,
      needs_review_fields, created_by, so_override_reason,
      replaces_dn_id, reissue_reason, reissue_note,
      purpose, customer_id
    ) values (
      v_dn_number, v_so_number, v_supplier, p_customer_number, p_customer_name,
      p_shipping_ref, p_ship_from, p_ship_to, p_salesman, p_print_date, p_order_date,
      p_batch_id, p_pdf_path, p_pdf_file_name, v_sha256,
      p_file_type, p_extraction, p_confidence,
      coalesce(p_needs_review, '{}'), auth.uid(), nullif(btrim(p_so_override_reason), ''),
      p_replaces_dn_id, p_reissue_reason, nullif(btrim(p_reissue_note), ''),
      p_purpose, p_talab_customer_id
    )
    returning * into v_dn;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'delivery_notes_pdf_sha256_key' then
        raise exception 'This file has already been uploaded.';
      end if;
      if v_constraint = 'delivery_notes_one_replacement_idx' then
        raise exception 'That delivery note has already been replaced by another slip.';
      end if;
      raise exception 'Delivery note % has already been uploaded.', v_dn_number;
  end;

  insert into delivery_note_lines (
    delivery_note_id, line_no, item_id, item_number, item_description, uom, pdf_qty
  ) values (
    v_dn.id, 1, v_item, btrim(p_item_number), p_item_description, p_uom, p_pdf_qty
  );

  -- The replacement steps into the original's place.
  if p_replaces_dn_id is not null then
    perform private.mark_replaced(p_replaces_dn_id, v_dn.id);

    if v_original.holder_id is not null then
      update delivery_notes
         set workflow_status    = v_original.workflow_status,
             holder_id          = v_original.holder_id,
             holder_role        = v_original.holder_role,
             holder_since       = now(),
             assigned_to        = v_original.assigned_to,
             sent_at            = v_original.sent_at,
             sent_by            = v_original.sent_by,
             assigned_driver_id = v_original.assigned_driver_id,
             driver_sent_at     = v_original.driver_sent_at,
             driver_sent_by     = v_original.driver_sent_by
       where id = v_dn.id
       returning * into v_dn;

      insert into dn_workflow_log (
        delivery_note_id, from_status, to_status, assigned_to,
        holder_from, to_role, action, note, actor
      ) values (
        v_dn.id, 'draft', v_original.workflow_status, v_original.holder_id,
        v_original.holder_id, v_original.holder_role, 'hand_over',
        'Replaces delivery note ' || v_original.dn_number, auth.uid()
      );
    end if;
  end if;

  return v_dn;
end
$fn$;

revoke all on function create_delivery_note(
  text, text, text, text, text, text, numeric, text, text, text, text, text, text,
  date, date, uuid, text, text, text, text, extraction_method, numeric, text[], text,
  uuid, dn_reissue_reason, text, dn_purpose, uuid
) from public, anon;

grant execute on function create_delivery_note(
  text, text, text, text, text, text, numeric, text, text, text, text, text, text,
  date, date, uuid, text, text, text, text, extraction_method, numeric, text[], text,
  uuid, dn_reissue_reason, text, dn_purpose, uuid
) to authenticated;


-- ---------------------------------------------------------------------
-- 4. A talab load is never counted into stock
--
-- The receiving function is the only way stock is created, so this is the
-- only place the rule has to be stated.
-- ---------------------------------------------------------------------

create or replace function private.refuse_talab_receipt()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if exists (
    select 1 from delivery_notes d
      join delivery_note_lines l on l.delivery_note_id = d.id
     where l.id = new.delivery_note_line_id
       and d.purpose = 'talab'
  ) then
    raise exception
      'That delivery note is for a customer, not for the warehouse, so it cannot become stock.';
  end if;
  return new;
end
$$;

revoke all on function private.refuse_talab_receipt() from public, anon, authenticated;

create trigger stock_movements_no_talab
  before insert on stock_movements
  for each row execute function private.refuse_talab_receipt();


-- ---------------------------------------------------------------------
-- 5. Marking one delivered (D50)
-- ---------------------------------------------------------------------

create or replace function mark_talab_delivered(p_dn_id uuid, p_note text default null)
returns delivery_notes
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_dn   delivery_notes;
  v_from dn_workflow_status;
begin
  if not has_role('admin', 'manager', 'gm', 'ceo') then
    raise exception
      'Permission denied: only an admin, a manager, the GM or a superadmin can close a customer order.';
  end if;

  select * into v_dn from delivery_notes where id = p_dn_id for update;
  if not found then
    raise exception 'Delivery note not found.';
  end if;

  if v_dn.purpose <> 'talab' then
    raise exception
      'Delivery note % is for the warehouse, so it is counted in rather than delivered.',
      v_dn.dn_number;
  end if;
  if v_dn.delivered_at is not null then
    raise exception 'Delivery note % was already marked delivered.', v_dn.dn_number;
  end if;
  if v_dn.workflow_status = 'replaced' then
    raise exception 'Delivery note % was replaced by another slip.', v_dn.dn_number;
  end if;
  if v_dn.workflow_status = 'rejected' then
    raise exception 'Delivery note % was rejected.', v_dn.dn_number;
  end if;

  v_from := v_dn.workflow_status;

  update delivery_notes
     set workflow_status = 'delivered',
         delivered_at    = now(),
         delivered_by    = auth.uid()
   where id = p_dn_id
   returning * into v_dn;

  insert into dn_workflow_log (
    delivery_note_id, from_status, to_status, action, note, actor
  ) values (
    p_dn_id, v_from, 'delivered', 'deliver',
    coalesce(nullif(btrim(p_note), ''), 'Delivered to the customer'), auth.uid()
  );

  return v_dn;
end
$fn$;

revoke all on function mark_talab_delivered(uuid, text) from public, anon;
grant execute on function mark_talab_delivered(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 6. The register is the warehouse's, so talab stays out of it
-- ---------------------------------------------------------------------

create or replace view v_inventory_dashboard as
select
  dn.id            as delivery_note_id,
  dn.dn_number     as "DN No",
  dn.so_number     as "SO No",
  dn.print_date,
  s.name_en        as supplier,
  b.item_number,
  b.item_description as "Item",
  b.uom            as "UOM",
  b.pdf_qty        as "PDF Qty",
  coalesce(b.arrived_qty, 0) as "Arrived Qty",
  b.missing_qty    as "Missing Qty",
  b.in_qty         as "In Qty",
  b.out_qty        as "Out Qty",
  b.balance_qty    as "Balance",
  b.status         as "Status",
  b.discrepancy_code as "Discrepancy",
  b.received_at
from v_lot_balances b
join delivery_notes dn on dn.id = b.delivery_note_id
join suppliers      s  on s.id  = dn.supplier_id
where dn.workflow_status <> 'replaced'
  and dn.purpose = 'stock'
  and private.has_role('ceo', 'gm', 'manager', 'admin', 'warehouse');

alter view v_inventory_dashboard set (security_invoker = off);


-- The totals have to agree with the register they sit above.
create or replace function inventory_totals(
  p_search              text    default null,
  p_status              text    default null,
  p_discrepancies_only  boolean default false,
  p_from                date    default null,
  p_to                  date    default null
)
returns table (
  notes         bigint,
  pdf_qty       numeric,
  arrived_qty   numeric,
  missing_qty   numeric,
  balance_qty   numeric,
  discrepancies bigint
)
language plpgsql
stable
security definer
set search_path = public, private
as $fn$
declare
  v_term text := btrim(coalesce(p_search, ''));
  v_pat  text := '%' || v_term || '%';
begin
  if not private.has_role('ceo', 'gm', 'manager', 'admin', 'warehouse') then
    return;
  end if;

  if v_term = '' then
    return query
    with scope as (
      select l.id, l.pdf_qty, l.arrived_qty, l.missing_qty, l.received_at
        from delivery_note_lines l
        join delivery_notes d on d.id = l.delivery_note_id
       where d.workflow_status <> 'replaced'
         and d.purpose = 'stock'
         and (p_status is null or p_status = 'all' or l.status::text = p_status)
         and (p_from is null or d.print_date >= p_from)
         and (p_to   is null or d.print_date <= p_to)
         and (not coalesce(p_discrepancies_only, false)
              or (l.received_at is not null and l.missing_qty <> 0))
    )
    select count(*),
           coalesce(sum(s.pdf_qty), 0),
           coalesce(sum(s.arrived_qty), 0),
           coalesce(sum(s.missing_qty), 0),
           coalesce((
             select sum(case when m.direction = 'IN' then m.qty else -m.qty end)
               from stock_movements m
               join scope s2 on s2.id = m.delivery_note_line_id
           ), 0),
           count(*) filter (where s.received_at is not null and s.missing_qty <> 0)
      from scope s;
  else
    return query
    with scope as (
      select l.id, l.pdf_qty, l.arrived_qty, l.missing_qty, l.received_at
        from delivery_notes d
        join delivery_note_lines l on l.delivery_note_id = d.id
       where d.workflow_status <> 'replaced'
         and d.purpose = 'stock'
         and (d.dn_number ilike v_pat or d.so_number ilike v_pat)
         and (p_status is null or p_status = 'all' or l.status::text = p_status)
         and (p_from is null or d.print_date >= p_from)
         and (p_to   is null or d.print_date <= p_to)
         and (not coalesce(p_discrepancies_only, false)
              or (l.received_at is not null and l.missing_qty <> 0))
      union
      select l.id, l.pdf_qty, l.arrived_qty, l.missing_qty, l.received_at
        from delivery_note_lines l
        join delivery_notes d on d.id = l.delivery_note_id
       where d.workflow_status <> 'replaced'
         and d.purpose = 'stock'
         and (l.item_number ilike v_pat or l.item_description ilike v_pat)
         and (p_status is null or p_status = 'all' or l.status::text = p_status)
         and (p_from is null or d.print_date >= p_from)
         and (p_to   is null or d.print_date <= p_to)
         and (not coalesce(p_discrepancies_only, false)
              or (l.received_at is not null and l.missing_qty <> 0))
    )
    select count(*),
           coalesce(sum(s.pdf_qty), 0),
           coalesce(sum(s.arrived_qty), 0),
           coalesce(sum(s.missing_qty), 0),
           coalesce((
             select sum(case when m.direction = 'IN' then m.qty else -m.qty end)
               from stock_movements m
               join scope s2 on s2.id = m.delivery_note_line_id
           ), 0),
           count(*) filter (where s.received_at is not null and s.missing_qty <> 0)
      from scope s;
  end if;
end
$fn$;

revoke all on function inventory_totals(text, text, boolean, date, date) from public, anon;
grant execute on function inventory_totals(text, text, boolean, date, date) to authenticated;


-- ---------------------------------------------------------------------
-- 7. The talab list itself
-- ---------------------------------------------------------------------

create or replace view v_talab_orders as
  select d.id                as delivery_note_id,
         d.dn_number,
         d.so_number,
         d.print_date,
         d.created_at,
         d.workflow_status,
         d.delivered_at,
         d.pdf_storage_path,
         btrim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) as delivered_by_name,
         c.id                as customer_id,
         c.name              as customer_name,
         c.name_ar           as customer_name_ar,
         c.terms             as customer_terms,
         c.phone             as customer_phone,
         l.item_number,
         l.item_description,
         l.uom,
         l.pdf_qty,
         btrim(coalesce(h.first_name, '') || ' ' || coalesce(h.last_name, '')) as holder_name,
         d.holder_role
    from delivery_notes d
    join customers c on c.id = d.customer_id
    left join lateral (
      select l2.item_number, l2.item_description, l2.uom, l2.pdf_qty
        from delivery_note_lines l2
       where l2.delivery_note_id = d.id
       order by l2.line_no
       limit 1
    ) l on true
    left join user_tbl u on u.id = d.delivered_by
    left join user_tbl h on h.id = d.holder_id
   where d.purpose = 'talab'
     and private.has_role('ceo', 'gm', 'manager', 'admin');

-- Names again, and the admin cannot read user_tbl — the same reasoning as
-- v_slip_custody in 0023. The gate above is what keeps others out.
alter view v_talab_orders set (security_invoker = off);

revoke all on v_talab_orders from anon;
grant select on v_talab_orders to authenticated;
