-- =====================================================================
--  0028 — Indexes for a database that has grown
--
--  Measured on 200,000 delivery notes, 200,000 lines, 266,000 handover
--  rows and 2,000 products — roughly ten years of the client's traffic.
--  Most screens were already fast (3ms or less). Four were not:
--
--      Inventory, one page            1,587 ms
--      Inventory, searching for a DN    406 ms
--      Handovers, searching for a DN    272 ms
--      Receiving queue                  146 ms
--
--  Three causes, three fixes:
--
--    1. Searching is `ilike '%...%'`, which no btree index can help with,
--       so every search read all 200,000 rows. Trigram indexes can.
--    2. The inventory register is ordered by when a line was counted in,
--       and there was no index on that, so the whole table was sorted —
--       and the per-line stock totals were computed for all 200,000 rows
--       to return 25 of them.
--    3. The receiving queue is ordered by when a slip went out, and its
--       index only covered the status, so 33,000 rows were sorted.
--
--  Run after 0027.
-- =====================================================================

-- Trigram matching for the "type part of a number" searches. pg_trgm is a
-- standard PostgreSQL extension and ships with Supabase.
create extension if not exists pg_trgm;

-- Searching the register and the handover trail.
create index if not exists delivery_notes_dn_number_trgm
  on delivery_notes using gin (dn_number gin_trgm_ops);

create index if not exists delivery_notes_so_number_trgm
  on delivery_notes using gin (so_number gin_trgm_ops);

-- The same search box also matches the item on the line.
create index if not exists delivery_note_lines_item_number_trgm
  on delivery_note_lines using gin (item_number gin_trgm_ops);

create index if not exists delivery_note_lines_item_description_trgm
  on delivery_note_lines using gin (item_description gin_trgm_ops);

-- The register's default order: newest count first. With this the page can
-- be read off the index instead of sorting every line in the table.
create index if not exists delivery_note_lines_received_idx
  on delivery_note_lines (received_at desc nulls last);

-- The receiving queue is "what is out with a driver, newest first". The
-- partial index from 0016 knew the first half of that; this one knows both.
drop index if exists delivery_notes_receiving_queue_idx;

create index delivery_notes_receiving_queue_idx
  on delivery_notes (driver_sent_at desc nulls last)
  where workflow_status = 'sent_to_driver';


-- The register's own order: newest printed slip first, then by number.
-- Without this the whole table was sorted to show 50 rows, and the stock
-- totals were computed for every one of them (1,136ms for one page).
create index if not exists delivery_notes_print_date_dn_idx
  on delivery_notes (print_date desc nulls last, dn_number desc);


-- ---------------------------------------------------------------------
--  The register has to be able to use those search indexes
--
--  PostgreSQL will not push a filter below a row-level security check
--  unless the operator is "leakproof", and `ilike` is not one. So under
--  RLS the trigram index above could not be used through this view, and
--  searching still read all 200,000 rows (302ms) — while the identical
--  search on the table itself took 8ms.
--
--  The same reasoning as v_slip_custody in 0023 applies: the view runs as
--  its owner and carries its own gate. The roles listed here are exactly
--  the ones the register is offered to; RLS on the tables underneath said
--  the same thing, since every signed-in role may read delivery notes.
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
  and private.has_role('ceo', 'gm', 'manager', 'admin', 'warehouse');

-- Deliberately NOT security_invoker: see the note above.
alter view v_inventory_dashboard set (security_invoker = off);

-- v_lot_balances is read through the view above, and on its own by the
-- stock screens. It keeps running as the caller.
alter view v_lot_balances set (security_invoker = on);


-- ---------------------------------------------------------------------
--  Totalling the register
--
--  The strip above the register (claimed, arrived, missing, left) was
--  added up in the browser: every matching row was fetched and summed in
--  JavaScript. PostgREST returns at most 1,000 rows, so on a register of
--  200,000 lines the strip quietly showed the total of the first 1,000 —
--  750,000 bags claimed instead of 150,011,250. Small data hid it.
--
--  Totals belong in the database. This also skips the per-line stock
--  aggregate the view computes, and adds the movements up once instead.
-- ---------------------------------------------------------------------

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

  /*
   * Two shapes, because one does not serve both.
   *
   * The search matches either the note (number, sales order) or the line
   * (item number, description). Written as a single OR across the two
   * tables the planner cannot use an index for any of it and reads all
   * 200,000 lines — 823ms. As a union of two halves, each half is a
   * trigram index lookup: 17ms.
   */
  if v_term = '' then
    return query
    with scope as (
      select l.id, l.pdf_qty, l.arrived_qty, l.missing_qty, l.received_at
        from delivery_note_lines l
        join delivery_notes d on d.id = l.delivery_note_id
       where d.workflow_status <> 'replaced'
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

comment on function inventory_totals(text, text, boolean, date, date) is
  'Totals for the inventory register, added up in the database rather than in the browser.';

revoke all on function inventory_totals(text, text, boolean, date, date) from public, anon;
grant execute on function inventory_totals(text, text, boolean, date, date) to authenticated;
