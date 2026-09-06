-- =====================================================================
--  0015 — Add the `received` workflow status
--
--  Without it a delivery note stays `sent_to_driver` forever: the driver
--  would keep seeing a slip he has already delivered, and the warehouse
--  receiving queue would never empty.
--
--  ALTER TYPE ... ADD VALUE cannot be used in the same transaction that
--  adds it, so this migration contains nothing else. The columns and
--  functions that use the value live in 0016.
--
--  Run after 0014.
-- =====================================================================

alter type dn_workflow_status add value if not exists 'received';
