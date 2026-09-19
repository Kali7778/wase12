-- =====================================================================
--  0022 — A slip can now sit with the warehouse
--
--  Until now a slip could only travel admin -> GM -> driver. The client
--  also hands slips straight to the warehouse, who then gives them to a
--  driver (decisions D29, D37), and that state had no name.
--
--  `alter type ... add value` cannot run in the same transaction as any
--  statement that uses the new value, so this file contains nothing else.
--  Everything that uses it is in 0023.
-- =====================================================================

alter type dn_workflow_status add value if not exists 'with_warehouse' after 'gm_approved';
