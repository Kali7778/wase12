-- =====================================================================
--  0017 — Make the reporting views scale
--
--  v_lot_balances aggregated the ENTIRE stock ledger against the ENTIRE
--  line table and only then let the caller filter. Asking for a single
--  delivery note produced:
--
--      Seq Scan on stock_movements        <- the whole ledger
--      Seq Scan on delivery_note_lines    <- every line ever
--      HashAggregate                      <- grouped, then thrown away
--
--  Cost therefore grew with the size of the database rather than with the
--  size of the answer. Fine at 23 delivery notes; several seconds per page
--  load once a real year of trading is in there, for every user at once.
--
--  The fix is a LATERAL aggregate: the movements are summed per line, so
--  the planner can drive the query from whatever the caller filtered on
--  and touch only the matching ledger rows through the existing
--  stock_movements(delivery_note_line_id) index.
--
--      Index Scan on delivery_notes
--      Index Scan on delivery_note_lines
--      Bitmap Index Scan on stock_movements
--
--  Nothing is cached and nothing is stored: the balance is still derived
--  from the append-only ledger on every read. Only the plan changes.
--
--  Run after 0016.
-- =====================================================================


-- v_inventory_dashboard is built on v_lot_balances, so it goes first.
drop view if exists v_inventory_dashboard;
drop view if exists v_lot_balances;


-- ---------------------------------------------------------------------
-- 1. Per-lot balance (one delivery note line = one lot)
-- ---------------------------------------------------------------------
create view v_lot_balances as
select
  l.id               as lot_id,
  l.delivery_note_id,
  l.item_id,
  l.item_number,
  l.item_description,
  l.uom,
  l.pdf_qty,
  l.arrived_qty,
  l.missing_qty,
  l.status,
  l.discrepancy_code,
  l.received_at,
  agg.in_qty,
  agg.out_qty,
  agg.in_qty - agg.out_qty as balance_qty
from delivery_note_lines l
left join lateral (
  select
    coalesce(sum(m.qty) filter (where m.direction = 'IN'),  0) as in_qty,
    coalesce(sum(m.qty) filter (where m.direction = 'OUT'), 0) as out_qty
  from stock_movements m
  where m.delivery_note_line_id = l.id
) agg on true;


-- ---------------------------------------------------------------------
-- 2. The client's dashboard — their columns, in their order
--
--    `Missing Qty` is negative when more arrived than the note claimed.
--    That is deliberate: one signed column reads better than two, and it
--    keeps the sum across a supplier honest.
-- ---------------------------------------------------------------------
create view v_inventory_dashboard as
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
join suppliers      s  on s.id  = dn.supplier_id;


-- ---------------------------------------------------------------------
-- 3. RLS must apply to the caller, not to the view's owner
--
--    PostgreSQL 15+ defaults security_invoker to OFF, which makes a view
--    run as its owner and quietly bypass every policy on the tables
--    underneath. Recreating a view resets this, so it has to be set again
--    every single time — this is the same hole 0003 closed.
-- ---------------------------------------------------------------------
alter view v_lot_balances        set (security_invoker = on);
alter view v_inventory_dashboard set (security_invoker = on);


-- ---------------------------------------------------------------------
-- 4. Grants
--
--    Supabase grants every role full privileges on new public objects.
--    RLS already returns nothing to anon, so this is not a leak — but an
--    unauthenticated caller has no business reaching these views at all,
--    and no caller should hold write privileges on a report.
-- ---------------------------------------------------------------------
revoke all on v_lot_balances, v_inventory_dashboard, v_item_stock from anon;
revoke insert, update, delete, truncate on v_lot_balances, v_inventory_dashboard, v_item_stock
  from authenticated;

grant select on v_lot_balances, v_inventory_dashboard, v_item_stock to authenticated;
