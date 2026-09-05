-- =====================================================================
--  LogiFlow — Phase 1 (part 12): 'sent_to_driver' status
--
--  The GM does not merely approve a slip; they hand it to a named driver.
--  Must run alone: Postgres will not let a new enum value be used in the
--  same transaction that adds it.
-- =====================================================================

alter type dn_workflow_status add value if not exists 'sent_to_driver' after 'gm_approved';
