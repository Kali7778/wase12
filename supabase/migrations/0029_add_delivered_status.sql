-- =====================================================================
--  0029 — A slip can end by being delivered, without ever being stock
--
--  Some loads never come to the warehouse. The client buys them from the
--  supplier in their own name, but the goods go straight from the plant to
--  somebody else's yard — a "talab" (decision D49). Such a slip is real
--  paperwork with a real supplier bill behind it, but it is not stock and
--  never will be, so it cannot end as `received`, which in this system
--  means "counted into the warehouse".
--
--  It ends as `delivered` instead: the office says the customer has it.
--
--  `alter type ... add value` cannot run in the same transaction as any
--  statement that uses the new value, so this file contains nothing else.
-- =====================================================================

alter type dn_workflow_status add value if not exists 'delivered';
