-- =====================================================================
--  LogiFlow — Phase 1 (part 5): English user-facing messages
--
--  Every `raise exception` message reaches the end user through PostgREST
--  (error code P0001). Those messages were written in Roman Urdu; the
--  deliverable must be English only.
--
--  Function bodies are otherwise unchanged. Note that CREATE OR REPLACE
--  resets a function's SET clauses, so `search_path` is re-declared here.
--
--  Run after 0004.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Append-only guard on stock_movements
-- ---------------------------------------------------------------------
create or replace function block_stock_movement_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'stock_movements is append-only; % is not permitted. Use reverse_stock_movement() to correct an entry.',
    tg_op;
end
$$;


-- ---------------------------------------------------------------------
-- 2. Confirm arrival of a delivery note line
--    Atomic: update the line, add the stock IN movement, roll up the header.
-- ---------------------------------------------------------------------
create or replace function receive_delivery_note_line(
  p_line_id            uuid,
  p_arrived_qty        numeric,
  p_warehouse_id       uuid,
  p_discrepancy_reason text default null,
  p_notes              text default null
)
returns delivery_note_lines
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_line   delivery_note_lines;
  v_status dn_status;
begin
  if not has_role('warehouse', 'dispatcher', 'manager', 'gm', 'ceo') then
    raise exception 'Permission denied: only warehouse, dispatcher or manager users can confirm an arrival.';
  end if;

  select * into v_line from delivery_note_lines where id = p_line_id for update;
  if not found then
    raise exception 'Delivery note line not found: %', p_line_id;
  end if;

  if v_line.arrived_qty is not null then
    raise exception 'This line has already been received (arrived quantity: %). Reverse the movement to change it.',
      v_line.arrived_qty;
  end if;

  if p_arrived_qty is null or p_arrived_qty < 0 then
    raise exception 'Arrived quantity must be zero or greater.';
  end if;

  if p_arrived_qty > v_line.pdf_qty then
    raise exception 'Arrived quantity (%) cannot exceed the quantity stated on the PDF (%).',
      p_arrived_qty, v_line.pdf_qty;
  end if;

  -- A shortage is never recorded without a reason — this is the supplier
  -- accountability rule at the heart of Phase 1.
  if p_arrived_qty < v_line.pdf_qty
     and coalesce(btrim(p_discrepancy_reason), '') = '' then
    raise exception 'A discrepancy reason is required when quantity is short by %.',
      v_line.pdf_qty - p_arrived_qty;
  end if;

  v_status := case
                when p_arrived_qty = 0              then 'not_arrived'
                when p_arrived_qty < v_line.pdf_qty then 'partial'
                else 'arrived'
              end;

  update delivery_note_lines
     set arrived_qty        = p_arrived_qty,
         status             = v_status,
         received_at        = now(),
         received_by        = auth.uid(),
         discrepancy_reason = p_discrepancy_reason,
         notes              = coalesce(p_notes, notes)
   where id = p_line_id
   returning * into v_line;

  -- Stock increases only at this point — never on PDF upload.
  if p_arrived_qty > 0 then
    insert into stock_movements (
      item_id, warehouse_id, direction, qty, movement_type,
      delivery_note_line_id, reference_no, created_by, notes
    )
    select v_line.item_id, p_warehouse_id, 'IN', p_arrived_qty, 'dn_receipt',
           v_line.id, dn.dn_number, auth.uid(), p_notes
    from delivery_notes dn where dn.id = v_line.delivery_note_id;
  end if;

  -- Roll the header status up from its lines.
  update delivery_notes dn
     set status = sub.rolled_up,
         arrived_at = case when sub.rolled_up in ('arrived', 'partial')
                           then coalesce(dn.arrived_at, now()) end
    from (
      select case
               when bool_and(l.status = 'arrived')              then 'arrived'::dn_status
               when bool_or(l.status in ('arrived', 'partial')) then 'partial'::dn_status
               else 'not_arrived'::dn_status
             end as rolled_up
      from delivery_note_lines l
      where l.delivery_note_id = v_line.delivery_note_id
    ) sub
   where dn.id = v_line.delivery_note_id;

  return v_line;
end
$$;


-- ---------------------------------------------------------------------
-- 3. Issue stock out of a lot (sale, driver allocation, transfer)
-- ---------------------------------------------------------------------
create or replace function issue_stock(
  p_lot_id        uuid,
  p_warehouse_id  uuid,
  p_qty           numeric,
  p_movement_type movement_type,
  p_reference_no  text default null,
  p_notes         text default null
)
returns stock_movements
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_lot     delivery_note_lines;
  v_balance numeric;
  v_mv      stock_movements;
begin
  if not has_role('warehouse', 'dispatcher', 'manager', 'gm', 'ceo') then
    raise exception 'Permission denied: you are not allowed to issue stock.';
  end if;

  if p_movement_type not in ('sale', 'driver_allocation', 'transfer_out', 'adjustment') then
    raise exception 'Invalid movement type for issuing stock: %', p_movement_type;
  end if;

  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantity must be greater than zero.';
  end if;

  -- Lock the lot so two concurrent requests cannot draw down the same stock.
  select * into v_lot from delivery_note_lines where id = p_lot_id for update;
  if not found then
    raise exception 'Lot (delivery note line) not found: %', p_lot_id;
  end if;

  select coalesce(sum(qty) filter (where direction = 'IN'),  0)
       - coalesce(sum(qty) filter (where direction = 'OUT'), 0)
    into v_balance
  from stock_movements
  where delivery_note_line_id = p_lot_id
    and warehouse_id = p_warehouse_id;

  if p_qty > v_balance then
    raise exception 'Insufficient stock: this lot has % available but % was requested.',
      v_balance, p_qty;
  end if;

  insert into stock_movements (
    item_id, warehouse_id, direction, qty, movement_type,
    delivery_note_line_id, reference_no, created_by, notes
  )
  values (
    v_lot.item_id, p_warehouse_id, 'OUT', p_qty, p_movement_type,
    p_lot_id, p_reference_no, auth.uid(), p_notes
  )
  returning * into v_mv;

  return v_mv;
end
$$;


-- ---------------------------------------------------------------------
-- 4. Correct a mistake — never delete a row, insert the opposite one
-- ---------------------------------------------------------------------
create or replace function reverse_stock_movement(
  p_movement_id uuid,
  p_reason      text
)
returns stock_movements
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_orig stock_movements;
  v_new  stock_movements;
begin
  if not has_role('manager', 'gm', 'ceo') then
    raise exception 'Permission denied: only a manager or above can reverse a stock movement.';
  end if;

  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'A reason is required to reverse a stock movement.';
  end if;

  select * into v_orig from stock_movements where id = p_movement_id;
  if not found then
    raise exception 'Stock movement not found: %', p_movement_id;
  end if;

  if exists (select 1 from stock_movements where reversal_of = p_movement_id) then
    raise exception 'This stock movement has already been reversed.';
  end if;

  insert into stock_movements (
    item_id, warehouse_id, direction, qty, movement_type,
    delivery_note_line_id, reference_no, reversal_of, created_by, notes
  )
  values (
    v_orig.item_id,
    v_orig.warehouse_id,
    case when v_orig.direction = 'IN' then 'OUT' else 'IN' end,
    v_orig.qty,
    'reversal',
    v_orig.delivery_note_line_id,
    v_orig.reference_no,
    v_orig.id,
    auth.uid(),
    p_reason
  )
  returning * into v_new;

  return v_new;
end
$$;


-- ---------------------------------------------------------------------
-- 5. Re-apply grants
--    CREATE OR REPLACE preserves privileges, but these are restated so the
--    intended access is explicit and this migration is safe to re-run.
-- ---------------------------------------------------------------------
revoke all on function block_stock_movement_mutation() from public, anon, authenticated;

revoke all on function receive_delivery_note_line(uuid, numeric, uuid, text, text) from public, anon;
revoke all on function issue_stock(uuid, uuid, numeric, movement_type, text, text) from public, anon;
revoke all on function reverse_stock_movement(uuid, text) from public, anon;

grant execute on function receive_delivery_note_line(uuid, numeric, uuid, text, text) to authenticated;
grant execute on function issue_stock(uuid, uuid, numeric, movement_type, text, text) to authenticated;
grant execute on function reverse_stock_movement(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 6. English comments on schema objects
-- ---------------------------------------------------------------------
comment on table user_profiles is
  'Role for each authenticated user. All RLS policies are based on this table.';

comment on column delivery_notes.status is
  'Rolled up from the lines: all arrived -> arrived; any arrived or partial -> partial; otherwise not_arrived.';

comment on column delivery_note_lines.pdf_qty is
  'Quantity claimed by the supplier on the delivery note. This is NOT stock.';

comment on column delivery_note_lines.arrived_qty is
  'Quantity actually received, confirmed by a person. NULL until arrival is confirmed.';

comment on column delivery_note_lines.missing_qty is
  'Generated: pdf_qty - arrived_qty. Cannot be set by hand.';

comment on table stock_movements is
  'Append-only stock ledger. Balances are always derived from these rows, never stored.';

comment on function private.has_role(user_role[]) is
  'Always returns true or false, never NULL. A NULL would silently bypass "if not ..." checks.';
