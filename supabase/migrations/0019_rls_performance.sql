-- =====================================================================
--  0019 — RLS performance
--
--  Two problems, both confirmed by the Supabase advisor and both costing
--  work on every single row read.
--
--  1. Per-row helper calls
--     `private.has_role(...)` and `private.current_user_role()` do not
--     depend on the row, but written bare in a policy they are evaluated
--     once PER ROW. Wrapping each call in a scalar subquery turns it into
--     an InitPlan: evaluated once per statement, then reused. With 18
--     policies all built on these two helpers, this is the single biggest
--     read cost in the schema.
--
--  2. `FOR ALL` write policies also run on SELECT
--     Five tables carried a `_read` policy plus a `_write` policy declared
--     `FOR ALL`. `ALL` includes SELECT, so every read evaluated BOTH — a
--     `current_user_role()` call and a `has_role()` call, where one was
--     needed. Splitting the write policy into explicit INSERT / UPDATE /
--     DELETE removes it from the read path.
--
--  Neither change alters who can do what. Reads stay governed by the
--  `_read` policy, which is the broader of the two in every case, so no
--  role loses access. Writes keep exactly the same role lists.
--
--  Run after 0018.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Master data — read for everyone signed in, write for the roles that
--    maintain it. The write policy no longer touches the read path.
-- ---------------------------------------------------------------------
drop policy if exists suppliers_read  on suppliers;
drop policy if exists suppliers_write on suppliers;

create policy suppliers_read on suppliers
  for select to authenticated
  using ((select private.current_user_role()) is not null);

create policy suppliers_insert on suppliers
  for insert to authenticated
  with check ((select private.has_role('admin', 'manager', 'gm', 'ceo')));

create policy suppliers_update on suppliers
  for update to authenticated
  using ((select private.has_role('admin', 'manager', 'gm', 'ceo')))
  with check ((select private.has_role('admin', 'manager', 'gm', 'ceo')));

create policy suppliers_delete on suppliers
  for delete to authenticated
  using ((select private.has_role('admin', 'manager', 'gm', 'ceo')));


drop policy if exists items_read  on items;
drop policy if exists items_write on items;

create policy items_read on items
  for select to authenticated
  using ((select private.current_user_role()) is not null);

create policy items_insert on items
  for insert to authenticated
  with check ((select private.has_role('admin', 'manager', 'gm', 'ceo')));

create policy items_update on items
  for update to authenticated
  using ((select private.has_role('admin', 'manager', 'gm', 'ceo')))
  with check ((select private.has_role('admin', 'manager', 'gm', 'ceo')));

create policy items_delete on items
  for delete to authenticated
  using ((select private.has_role('admin', 'manager', 'gm', 'ceo')));


drop policy if exists warehouses_read  on warehouses;
drop policy if exists warehouses_write on warehouses;

create policy warehouses_read on warehouses
  for select to authenticated
  using ((select private.current_user_role()) is not null);

create policy warehouses_insert on warehouses
  for insert to authenticated
  with check ((select private.has_role('manager', 'gm', 'ceo')));

create policy warehouses_update on warehouses
  for update to authenticated
  using ((select private.has_role('manager', 'gm', 'ceo')))
  with check ((select private.has_role('manager', 'gm', 'ceo')));

create policy warehouses_delete on warehouses
  for delete to authenticated
  using ((select private.has_role('manager', 'gm', 'ceo')));


drop policy if exists batches_read  on upload_batches;
drop policy if exists batches_write on upload_batches;

create policy batches_read on upload_batches
  for select to authenticated
  using ((select private.current_user_role()) is not null);

create policy batches_insert on upload_batches
  for insert to authenticated
  with check ((select private.has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo')));

create policy batches_update on upload_batches
  for update to authenticated
  using ((select private.has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo')))
  with check ((select private.has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo')));

create policy batches_delete on upload_batches
  for delete to authenticated
  using ((select private.has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo')));


-- ---------------------------------------------------------------------
-- 2. user_tbl — a person sees themselves; management sees everyone
-- ---------------------------------------------------------------------
drop policy if exists user_tbl_select      on user_tbl;
drop policy if exists user_tbl_admin_write on user_tbl;

create policy user_tbl_select on user_tbl
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.has_role('ceo', 'gm', 'manager'))
  );

create policy user_tbl_insert on user_tbl
  for insert to authenticated
  with check ((select private.has_role('ceo', 'gm')));

create policy user_tbl_update on user_tbl
  for update to authenticated
  using ((select private.has_role('ceo', 'gm')))
  with check ((select private.has_role('ceo', 'gm')));

create policy user_tbl_delete on user_tbl
  for delete to authenticated
  using ((select private.has_role('ceo', 'gm')));


-- ---------------------------------------------------------------------
-- 3. Delivery notes and the ledger
--
--    These were already split by command; only the per-row helper call
--    changes. `delivery_note_lines` still has no UPDATE policy — arrival
--    is written by receive_delivery_note_line() and nothing else.
-- ---------------------------------------------------------------------
drop policy if exists dn_read   on delivery_notes;
drop policy if exists dn_insert on delivery_notes;
drop policy if exists dn_update on delivery_notes;
drop policy if exists dn_delete on delivery_notes;

create policy dn_read on delivery_notes
  for select to authenticated
  using ((select private.current_user_role()) is not null);

create policy dn_insert on delivery_notes
  for insert to authenticated
  with check ((select private.has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo')));

create policy dn_update on delivery_notes
  for update to authenticated
  using ((select private.has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo')))
  with check ((select private.has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo')));

create policy dn_delete on delivery_notes
  for delete to authenticated
  using ((select private.has_role('gm', 'ceo')));


drop policy if exists dnl_read   on delivery_note_lines;
drop policy if exists dnl_insert on delivery_note_lines;

create policy dnl_read on delivery_note_lines
  for select to authenticated
  using ((select private.current_user_role()) is not null);

create policy dnl_insert on delivery_note_lines
  for insert to authenticated
  with check ((select private.has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo')));


drop policy if exists sm_read on stock_movements;

create policy sm_read on stock_movements
  for select to authenticated
  using ((select private.current_user_role()) is not null);


drop policy if exists wf_log_read on dn_workflow_log;

create policy wf_log_read on dn_workflow_log
  for select to authenticated
  using ((select private.current_user_role()) is not null);


-- ---------------------------------------------------------------------
-- 4. Foreign key indexes
--
--    Only the ones that serve a query this system actually runs. An index
--    is not free — it costs on every insert — so the remaining unindexed
--    foreign keys (delivery_notes.created_by / sent_by / driver_sent_by,
--    upload_batches.created_by, dn_workflow_log.assigned_to) are left
--    alone: nothing filters on them, and user rows are deactivated rather
--    than deleted, so the delete-time check never happens either.
-- ---------------------------------------------------------------------

-- reverse_stock_movement() runs `exists (... where reversal_of = $1)` on
-- every call. Without this it is a full scan of the ledger each time.
create index if not exists stock_movements_reversal_of_idx
  on stock_movements (reversal_of)
  where reversal_of is not null;

-- Per-warehouse stock. The existing (item_id, warehouse_id) index cannot
-- serve a warehouse-only filter, because warehouse_id is the second column.
create index if not exists stock_movements_warehouse_id_idx
  on stock_movements (warehouse_id);

-- Accountability reporting: "every count this keeper recorded".
create index if not exists delivery_note_lines_received_by_idx
  on delivery_note_lines (received_by)
  where received_by is not null;

-- Audit: "everything this person did to delivery notes".
create index if not exists dn_workflow_log_actor_idx
  on dn_workflow_log (actor, created_at desc)
  where actor is not null;
