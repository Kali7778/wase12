-- =====================================================================
--  0024 — A slip can be replaced by a reissued one
--
--  When a slip goes missing at the supplier's yard, the supplier prints a
--  fresh one for the same goods. It carries a new delivery note number, a
--  new sales order number and a new barcode, so nothing in the system can
--  tell on its own that the two are the same delivery (decision D32).
--
--  The original is never deleted — at month end the supplier will count
--  the slips they issued, and this is how we show why their count is
--  higher than ours. It is marked `replaced` instead.
--
--  `alter type ... add value` cannot run in the same transaction as any
--  statement that uses the new value, so this file contains nothing else.
-- =====================================================================

alter type dn_workflow_status add value if not exists 'replaced';
