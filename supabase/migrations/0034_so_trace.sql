-- =====================================================================
--  0034 — Following a sales order through the yard
--
--  The supplier's slip carries a sales order number, and the client wants
--  to put that number in and see everything that came under it: which
--  slips, what the supplier claimed, what was counted in, what was short,
--  where every bag went afterwards, and what is still on the floor
--  (decisions D79–D81).
--
--  Nothing new is recorded here. Every fact already exists — the slip and
--  its line, the receipt, each movement out, and, for a sale, the bill
--  that movement belongs to. These two views only put them side by side:
--
--    v_slip_trace            one row per slip line: claimed, arrived,
--                            missing, in, out, left
--    v_slip_trace_movements  one row per movement after the receipt, with
--                            the bill and customer when it was a sale
--
--  A customer order (talab) never becomes stock, so it has no movements;
--  its line carries the customer it went to and the bill written for it.
-- =====================================================================


create or replace view v_slip_trace as
  select l.id                       as line_id,
         d.id                       as delivery_note_id,
         d.dn_number,
         d.so_number,
         d.purpose,
         d.workflow_status,
         d.print_date,
         d.created_at               as uploaded_at,
         l.item_number,
         l.item_description,
         l.uom,
         l.pdf_qty,
         l.arrived_qty,
         l.missing_qty,
         l.status                   as line_status,
         l.received_at,
         coalesce(m.in_qty, 0)      as in_qty,
         coalesce(m.out_qty, 0)     as out_qty,
         coalesce(m.in_qty, 0) - coalesce(m.out_qty, 0) as balance_qty,
         -- Where a customer order went, and the bill written for it.
         cu.name                    as talab_customer_name,
         b.bill_number              as talab_bill_number,
         b.cancelled_at is not null as talab_bill_cancelled
    from delivery_note_lines l
    join delivery_notes d on d.id = l.delivery_note_id
    left join customers cu on cu.id = d.customer_id
    left join lateral (
      select coalesce(sum(s.qty) filter (where s.direction = 'IN'), 0)  as in_qty,
             coalesce(sum(s.qty) filter (where s.direction = 'OUT'), 0) as out_qty
        from stock_movements s
       where s.delivery_note_line_id = l.id
    ) m on true
    left join lateral (
      select bl.bill_number, bl.cancelled_at
        from bills bl
       where bl.delivery_note_id = d.id
       order by bl.cancelled_at nulls first, bl.created_at desc
       limit 1
    ) b on true
   where (select private.has_role('ceo', 'gm', 'manager', 'admin', 'warehouse'));

-- Customer names come from tables the warehouse cannot read directly, so
-- the view runs as its owner and the role check above is the gate — the
-- same arrangement as v_inventory_dashboard.
alter view v_slip_trace set (security_invoker = off);
revoke all on v_slip_trace from anon;
grant select on v_slip_trace to authenticated;


create or replace view v_slip_trace_movements as
  select s.id                as movement_id,
         l.id                as line_id,
         d.id                as delivery_note_id,
         d.dn_number,
         d.so_number,
         l.item_number,
         l.item_description,
         l.uom,
         s.occurred_at,
         s.direction,
         s.movement_type,
         s.qty,
         s.reference_no,
         s.notes,
         s.reversal_of is not null as is_reversal,
         w.name              as warehouse_name,
         bi.bill_number,
         bi.customer_name    as bill_customer_name,
         bi.walk_in_name is not null as bill_is_walk_in,
         bi.cancelled_at is not null as bill_cancelled,
         nullif(btrim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), '')
                             as actor_name
    from stock_movements s
    join delivery_note_lines l on l.id = s.delivery_note_line_id
    join delivery_notes d on d.id = l.delivery_note_id
    left join warehouses w on w.id = s.warehouse_id
    left join user_tbl u on u.id = s.created_by
    left join bill_stock_movements bsm on bsm.stock_movement_id = s.id
    left join bill_lines bl on bl.id = bsm.bill_line_id
    left join bills bi on bi.id = bl.bill_id
   where (select private.has_role('ceo', 'gm', 'manager', 'admin', 'warehouse'));

alter view v_slip_trace_movements set (security_invoker = off);
revoke all on v_slip_trace_movements from anon;
grant select on v_slip_trace_movements to authenticated;


-- Both views are searched by sales order or delivery note number, so the
-- plain-equality path needs an index of its own; the trigram indexes from
-- 0028 already cover "contains" searches.
create index if not exists delivery_notes_so_number_idx on delivery_notes (so_number);
