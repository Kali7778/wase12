-- =====================================================================
--  0018 — Fix reverse_stock_movement()
--
--  The function has been broken since 0001 and failed on every call with:
--
--      42804: column "direction" is of type movement_direction but
--             expression is of type text
--
--  A CASE with two string branches resolves to `text`, and there is no
--  implicit cast from text to an enum. A bare literal would have coerced
--  from `unknown`; two of them in a CASE do not.
--
--  It went unnoticed because nothing calls it: it is the documented way
--  to correct a stock mistake, and correcting a mistake is exactly the
--  moment when a broken function costs the most.
--
--  Run after 0017.
-- =====================================================================

create or replace function reverse_stock_movement(p_movement_id uuid, p_reason text)
returns stock_movements
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_orig stock_movements;
  v_new  stock_movements;
begin
  -- The warehouse keeper is not on this list on purpose: undoing your own
  -- count should need a second pair of eyes.
  if not has_role('manager', 'gm', 'ceo') then
    raise exception 'Permission denied: only a manager or above can reverse a stock movement.';
  end if;

  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'A reason is required to reverse a stock movement.';
  end if;

  select * into v_orig from stock_movements where id = p_movement_id;
  if not found then
    raise exception 'Stock movement not found.';
  end if;

  if v_orig.movement_type = 'reversal' then
    raise exception 'A reversal cannot itself be reversed.';
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
    -- The explicit cast is the fix.
    (case when v_orig.direction = 'IN' then 'OUT' else 'IN' end)::movement_direction,
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
$fn$;

revoke all on function reverse_stock_movement(uuid, text) from public, anon;
grant execute on function reverse_stock_movement(uuid, text) to authenticated;
