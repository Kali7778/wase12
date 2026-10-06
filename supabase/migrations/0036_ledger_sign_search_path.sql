-- =====================================================================
--  0036 — Pin the search_path on private.ledger_sign
--
--  Every other function in this database fixes its search_path; this one
--  was added in 0035 without it, and the database linter is right to say
--  so. The body resolves nothing but an enum, so nothing was exploitable
--  — but a function left open to whatever search_path the caller happens
--  to have is a habit worth not starting.
--
--  It also means the function can no longer be inlined into the two
--  employee-ledger views. Those read one small table per employee, so
--  the cost is a function call per row and nothing more.
-- =====================================================================

alter function private.ledger_sign(employee_ledger_kind) set search_path = public;
