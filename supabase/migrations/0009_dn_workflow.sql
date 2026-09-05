-- =====================================================================
--  LogiFlow — Phase 1 (part 9): delivery note workflow + upload batches
--
--  Flow: the admin uploads the day's slips, then hands each one to the GM.
--  "Sending" is a workflow handoff, not a file transfer: the slip changes
--  status, gets assigned, and the move is written to an audit log.
--
--  Run after 0008.
-- =====================================================================

create type dn_workflow_status as enum (
  'draft',        -- uploaded, still with the admin
  'sent_to_gm',   -- handed to the GM, awaiting review
  'gm_approved',
  'rejected'
);

-- A day's intake of slips. "20 slips arrived today" is one batch.
create table upload_batches (
  id          uuid primary key default gen_random_uuid(),
  batch_date  date not null default current_date,
  note        text,
  created_at  timestamptz not null default now(),
  created_by  uuid references user_tbl(id)
);

create index on upload_batches (batch_date desc);

comment on table upload_batches is
  'One bulk upload of delivery slips, grouped by the date they were received.';

alter table delivery_notes
  add column workflow_status  dn_workflow_status not null default 'draft',
  add column assigned_to      uuid references user_tbl(id),
  add column sent_at          timestamptz,
  add column sent_by          uuid references user_tbl(id),
  add column upload_batch_id  uuid references upload_batches(id) on delete set null,
  add column source_file_type text;

create index on delivery_notes (workflow_status);
create index on delivery_notes (assigned_to);
create index on delivery_notes (upload_batch_id);
create index on delivery_notes (pdf_sha256);

comment on column delivery_notes.workflow_status is
  'Where the slip sits in the admin -> GM handoff. Changed only through send_dn_to_gm / decide_dn.';
comment on column delivery_notes.source_file_type is
  'pdf, image or doc. Only text PDFs can be parsed automatically.';

-- Audit trail: who moved a slip, when, to whom, and why.
create table dn_workflow_log (
  id               uuid primary key default gen_random_uuid(),
  delivery_note_id uuid not null references delivery_notes(id) on delete cascade,
  from_status      dn_workflow_status,
  to_status        dn_workflow_status not null,
  assigned_to      uuid references user_tbl(id),
  note             text,
  actor            uuid references user_tbl(id),
  created_at       timestamptz not null default now()
);

create index on dn_workflow_log (delivery_note_id, created_at desc);

comment on table dn_workflow_log is
  'Append-only history of workflow transitions for each delivery note.';

alter table upload_batches  enable row level security;
alter table dn_workflow_log enable row level security;

create policy batches_read on upload_batches
  for select to authenticated using (private.current_user_role() is not null);
create policy batches_write on upload_batches
  for all to authenticated
  using (private.has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo'))
  with check (private.has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo'));

create policy wf_log_read on dn_workflow_log
  for select to authenticated using (private.current_user_role() is not null);

-- The log is written only by the workflow functions.
revoke insert, update, delete on dn_workflow_log from authenticated;
