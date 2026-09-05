-- =====================================================================
--  LogiFlow — Phase 1 (part 6): 'admin' role
--
--  Business roles:
--    Superadmin (CEO)  top level
--    GM                oversight
--    Admin             buys from supplier, pays, uploads delivery slips
--    Driver            transport
--
--  Must run on its own: Postgres will not let a newly added enum value be
--  used inside the same transaction that adds it.
-- =====================================================================

alter type user_role add value if not exists 'admin' before 'dispatcher';
