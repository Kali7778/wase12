-- =====================================================================
--  0025 — Reissued slips
--
--  The supplier hands the driver a delivery note. It is lost, or soaked,
--  or wrong, and the supplier prints another one for the same goods. The
--  new sheet carries a new delivery note number, a new sales order number
--  and a new barcode: no rule in this system can tell that the two sheets
--  are one delivery. Only a person can, and so a person must say so.
--
--  What that buys us is the month-end conversation. The supplier counts
--  the slips they issued and reaches a higher number than ours; this is
--  the record that says which of their sheets were replacements, who said
--  so, and why (decisions D32, D33, D46, D47, D48).
--
--  Rules, all enforced here rather than on a screen:
--
--    * A replacement must name the slip it replaces. "This is a duplicate"
--      with nothing attached proves nothing at month end (D32).
--    * The original is never deleted or overwritten. It becomes
--      `replaced`, keeps its history, and the two point at each other.
--    * The original leaves the expected quantity the moment it is
--      replaced, and can no longer be counted. Otherwise 750 bags on two
--      sheets would read as 1,500 expected and 750 missing (D46).
--    * One original, one replacement. A chain of replacements is allowed
--      (A -> B -> C), but two live replacements of the same sheet are not.
--    * A driver cannot create a delivery note. They can report a reissue
--      from the yard, with a photo, and an admin or the GM turns it into
--      one after reading the numbers off it (D34, D47).
--
--  Run after 0024.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Why a slip was reissued
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'dn_reissue_reason') then
    create type dn_reissue_reason as enum (
      'lost',                -- gone missing, usually at the supplier's yard
      'damaged',             -- torn, soaked, unreadable
      'supplier_correction', -- the supplier reprinted it with something fixed
      'other'
    );
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 2. The link between the two sheets
-- ---------------------------------------------------------------------

alter table delivery_notes
  add column replaces_dn_id uuid references delivery_notes(id),
  add column reissue_reason dn_reissue_reason,
  add column reissue_note   text,
  -- The three travel together: a replacement names what it replaces and
  -- why, and nothing else carries a reason.
  add constraint reissue_complete check (
    (replaces_dn_id is null and reissue_reason is null)
    or (replaces_dn_id is not null and reissue_reason is not null)
  ),
  add constraint reissue_other_needs_note check (
    reissue_reason is distinct from 'other'
    or coalesce(btrim(reissue_note), '') <> ''
  ),
  add constraint reissue_not_itself check (replaces_dn_id is distinct from id);

comment on column delivery_notes.replaces_dn_id is
  'The delivery note this one was issued to replace. The original is kept and marked replaced.';

-- One live replacement per original. A replacement that is itself
-- replaced is fine, because that one is no longer the live link.
create unique index delivery_notes_one_replacement_idx
  on delivery_notes (replaces_dn_id)
  where replaces_dn_id is not null;

-- The month-end register reads these newest first.
create index delivery_notes_reissue_idx
  on delivery_notes (created_at desc)
  where replaces_dn_id is not null;

-- Replacing is its own kind of step in the custody ledger.
alter table dn_workflow_log drop constraint if exists action_is_known;
alter table dn_workflow_log add constraint action_is_known check (
  action in ('hand_over', 'reassign_driver', 'acknowledge',
             'approve', 'reject', 'receive', 'replace')
);


-- ---------------------------------------------------------------------
-- 3. What a driver reports from the yard
--
-- A driver may not create a delivery note — the numbers on the sheet are
-- what everything else keys off, and they have to be read by somebody who
-- can check them. So the driver's report lives here until an admin or the
-- GM turns it into a slip (D34, D47).
-- ---------------------------------------------------------------------

create table dn_reissue_submissions (
  id             uuid primary key default gen_random_uuid(),
  original_dn_id uuid not null references delivery_notes(id),

  reason         dn_reissue_reason not null,
  note           text,

  -- The photo or PDF of the new sheet, in the private bucket.
  file_path      text,
  file_type      text not null default 'image',

  -- Filled in if the submitter could read them; the approver confirms.
  dn_number      text,
  so_number      text,

  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),

  submitted_by   uuid not null references user_tbl(id),
  submitted_at   timestamptz not null default now(),

  decided_by     uuid references user_tbl(id),
  decided_at     timestamptz,
  -- Required when rejecting: the driver has to know what was wrong (D48).
  decision_note  text,
  created_dn_id  uuid references delivery_notes(id),

  constraint reissue_other_needs_note check (
    reason is distinct from 'other' or coalesce(btrim(note), '') <> ''
  ),
  constraint decision_is_complete check (
    (status = 'pending'  and decided_by is null and decided_at is null)
    or (status = 'approved' and decided_by is not null and decided_at is not null
        and created_dn_id is not null)
    or (status = 'rejected' and decided_by is not null and decided_at is not null
        and coalesce(btrim(decision_note), '') <> '')
  )
);

comment on table dn_reissue_submissions is
  'A reissued sheet reported from the yard, waiting for an admin or the GM to read its numbers.';

-- The approval queue is the only hot query, and it stays small.
create index dn_reissue_submissions_pending_idx
  on dn_reissue_submissions (submitted_at desc)
  where status = 'pending';

create index dn_reissue_submissions_mine_idx
  on dn_reissue_submissions (submitted_by, submitted_at desc);

alter table dn_reissue_submissions enable row level security;

-- Readable by the person who reported it and by anybody who can act on it.
create policy reissue_sub_read on dn_reissue_submissions
  for select to authenticated
  using (
    submitted_by = (select auth.uid())
    or (select private.has_role('admin', 'manager', 'gm', 'ceo'))
  );

-- Written only through the functions below, which check far more than a
-- policy can.
revoke insert, update, delete on dn_reissue_submissions from authenticated;


-- ---------------------------------------------------------------------
-- 4. Marking the original replaced
--
-- Shared by both routes into a reissue, so the rule exists once.
-- ---------------------------------------------------------------------

create or replace function private.mark_replaced(p_original uuid, p_replacement uuid)
returns delivery_notes
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_original delivery_notes;
  v_from     dn_workflow_status;
begin
  select * into v_original from delivery_notes where id = p_original for update;
  if not found then
    raise exception 'The delivery note being replaced does not exist.';
  end if;

  if v_original.workflow_status = 'replaced' then
    raise exception 'Delivery note % has already been replaced.', v_original.dn_number;
  end if;

  -- Goods that have been counted are stock. A sheet reprinted afterwards
  -- is a paperwork matter, not a delivery, and must not touch the count.
  if v_original.workflow_status = 'received' then
    raise exception
      'Delivery note % has already been counted in, so it cannot be replaced.',
      v_original.dn_number;
  end if;

  -- Read before the update overwrites it: the log has to say where the
  -- slip actually was (the same trap 0021 fixed for driver handovers).
  v_from := v_original.workflow_status;

  update delivery_notes
     set workflow_status = 'replaced'
   where id = p_original
   returning * into v_original;

  -- Custody of the original ends here; the trigger below clears the
  -- holder, and this row says why.
  insert into dn_workflow_log (
    delivery_note_id, from_status, to_status, action, note, actor
  ) values (
    p_original, v_from, 'replaced', 'replace',
    'Replaced by delivery note ' || (select dn_number from delivery_notes where id = p_replacement),
    auth.uid()
  );

  return v_original;
end
$fn$;

revoke all on function private.mark_replaced(uuid, uuid) from public, anon, authenticated;

-- A replaced sheet is void: nobody is responsible for it any more. The
-- trigger from 0023 already did this for `received` and `rejected`; a
-- replacement ends a slip's journey the same way.
create or replace function private.clear_holder_when_closed()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if new.workflow_status in ('received', 'rejected', 'replaced')
     and old.workflow_status is distinct from new.workflow_status then
    new.holder_id       := null;
    new.holder_role     := null;
    new.holder_since    := null;
    new.acknowledged_at := null;
  end if;
  return new;
end
$$;

revoke all on function private.clear_holder_when_closed() from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 5. Uploading a replacement directly (admin, GM, superadmin)
--
-- The signature grows by three, so the old function is dropped first.
-- ---------------------------------------------------------------------

drop function if exists create_delivery_note(
  text, text, text, text, text, text, numeric, text, text, text, text, text, text,
  date, date, uuid, text, text, text, text, extraction_method, numeric, text[], text
);

create function create_delivery_note(
  p_dn_number          text,
  p_so_number          text,
  p_supplier_code      text,
  p_item_number        text,
  p_item_description   text,
  p_uom                text,
  p_pdf_qty            numeric,
  p_customer_number    text default null,
  p_customer_name      text default null,
  p_shipping_ref       text default null,
  p_ship_from          text default null,
  p_ship_to            text default null,
  p_salesman           text default null,
  p_print_date         date default null,
  p_order_date         date default null,
  p_batch_id           uuid default null,
  p_pdf_path           text default null,
  p_pdf_file_name      text default null,
  p_pdf_sha256         text default null,
  p_file_type          text default 'pdf',
  p_extraction         extraction_method default 'pdf_text',
  p_confidence         numeric default null,
  p_needs_review       text[] default '{}',
  p_so_override_reason text default null,
  p_replaces_dn_id     uuid default null,
  p_reissue_reason     dn_reissue_reason default null,
  p_reissue_note       text default null
)
returns delivery_notes
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_dn_number  text := btrim(coalesce(p_dn_number, ''));
  v_so_number  text := btrim(coalesce(p_so_number, ''));
  v_sha256     text := lower(nullif(btrim(coalesce(p_pdf_sha256, '')), ''));
  v_supplier   uuid;
  v_item       uuid;
  v_dn         delivery_notes;
  v_original   delivery_notes;
  v_other      text;
  v_constraint text;
begin
  if not has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo') then
    raise exception 'Permission denied: you are not allowed to upload delivery notes.';
  end if;

  if v_dn_number = '' then
    raise exception 'Delivery note number is required.';
  end if;
  if v_so_number = '' then
    raise exception 'Sales order number is required.';
  end if;
  if coalesce(btrim(p_item_number), '') = '' then
    raise exception 'Item number is required.';
  end if;
  if p_pdf_qty is null or p_pdf_qty <= 0 then
    raise exception 'Quantity must be greater than zero.';
  end if;

  -- Reissue rules, checked before anything is written.
  if p_replaces_dn_id is not null then
    if not has_role('admin', 'gm', 'ceo') then
      raise exception
        'Permission denied: only an admin, the GM or a superadmin can record a replacement slip.';
    end if;
    if p_reissue_reason is null then
      raise exception 'A reason is required when a slip replaces another one.';
    end if;
    if p_reissue_reason = 'other' and coalesce(btrim(p_reissue_note), '') = '' then
      raise exception 'Please describe the reason when choosing "Other".';
    end if;

    select * into v_original from delivery_notes where id = p_replaces_dn_id;
    if not found then
      raise exception 'The delivery note being replaced does not exist.';
    end if;
    if v_original.workflow_status = 'replaced' then
      raise exception 'Delivery note % has already been replaced.', v_original.dn_number;
    end if;
    if v_original.workflow_status = 'received' then
      raise exception
        'Delivery note % has already been counted in, so it cannot be replaced.',
        v_original.dn_number;
    end if;
  elsif p_reissue_reason is not null then
    raise exception 'A reason for reissue only belongs on a slip that replaces another one.';
  end if;

  -- Checked before anything is written, so a refused slip does not leave
  -- an auto-added product behind.
  select dn_number into v_other from delivery_notes where dn_number = v_dn_number;
  if v_other is not null then
    raise exception 'Delivery note % has already been uploaded.', v_dn_number;
  end if;

  if v_sha256 is not null then
    select dn_number into v_other from delivery_notes where pdf_sha256 = v_sha256;
    if v_other is not null then
      raise exception 'This file has already been uploaded as delivery note %.', v_other;
    end if;
  end if;

  select id into v_supplier from suppliers where code = coalesce(p_supplier_code, 'ELKHAYYAT');
  if v_supplier is null then
    raise exception 'Supplier % is not set up.', coalesce(p_supplier_code, 'ELKHAYYAT');
  end if;

  -- Find the item, or record the one this note is telling us about.
  select id into v_item from items where item_number = btrim(p_item_number);

  if v_item is null then
    insert into items (item_number, description_en, uom, is_auto_added)
    values (
      btrim(p_item_number),
      coalesce(nullif(btrim(p_item_description), ''), btrim(p_item_number)),
      coalesce(nullif(btrim(p_uom), ''), 'EA'),
      true
    )
    on conflict (item_number) do nothing;

    select id into v_item from items where item_number = btrim(p_item_number);
  end if;

  begin
    insert into delivery_notes (
      dn_number, so_number, supplier_id, customer_number, customer_name,
      shipping_reference, ship_from, ship_to, salesman, print_date, order_date,
      upload_batch_id, pdf_storage_path, pdf_file_name, pdf_sha256,
      source_file_type, extraction_method, extraction_confidence,
      needs_review_fields, created_by, so_override_reason,
      replaces_dn_id, reissue_reason, reissue_note
    ) values (
      v_dn_number, v_so_number, v_supplier, p_customer_number, p_customer_name,
      p_shipping_ref, p_ship_from, p_ship_to, p_salesman, p_print_date, p_order_date,
      p_batch_id, p_pdf_path, p_pdf_file_name, v_sha256,
      p_file_type, p_extraction, p_confidence,
      coalesce(p_needs_review, '{}'), auth.uid(), nullif(btrim(p_so_override_reason), ''),
      p_replaces_dn_id, p_reissue_reason, nullif(btrim(p_reissue_note), '')
    )
    returning * into v_dn;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'delivery_notes_pdf_sha256_key' then
        raise exception 'This file has already been uploaded.';
      end if;
      if v_constraint = 'delivery_notes_one_replacement_idx' then
        raise exception 'That delivery note has already been replaced by another slip.';
      end if;
      raise exception 'Delivery note % has already been uploaded.', v_dn_number;
  end;

  insert into delivery_note_lines (
    delivery_note_id, line_no, item_id, item_number, item_description, uom, pdf_qty
  ) values (
    v_dn.id, 1, v_item, btrim(p_item_number), p_item_description, p_uom, p_pdf_qty
  );

  -- The replacement steps into the original's place: same person holding
  -- it, same stage of the journey. The goods are on the same truck.
  if p_replaces_dn_id is not null then
    perform private.mark_replaced(p_replaces_dn_id, v_dn.id);

    if v_original.holder_id is not null then
      update delivery_notes
         set workflow_status    = v_original.workflow_status,
             holder_id          = v_original.holder_id,
             holder_role        = v_original.holder_role,
             holder_since       = now(),
             assigned_to        = v_original.assigned_to,
             sent_at            = v_original.sent_at,
             sent_by            = v_original.sent_by,
             assigned_driver_id = v_original.assigned_driver_id,
             driver_sent_at     = v_original.driver_sent_at,
             driver_sent_by     = v_original.driver_sent_by
       where id = v_dn.id
       returning * into v_dn;

      insert into dn_workflow_log (
        delivery_note_id, from_status, to_status, assigned_to,
        holder_from, to_role, action, note, actor
      ) values (
        v_dn.id, 'draft', v_original.workflow_status, v_original.holder_id,
        v_original.holder_id, v_original.holder_role, 'hand_over',
        'Replaces delivery note ' || v_original.dn_number, auth.uid()
      );
    end if;
  end if;

  return v_dn;
end
$fn$;

revoke all on function create_delivery_note(
  text, text, text, text, text, text, numeric, text, text, text, text, text, text,
  date, date, uuid, text, text, text, text, extraction_method, numeric, text[], text,
  uuid, dn_reissue_reason, text
) from public, anon;

grant execute on function create_delivery_note(
  text, text, text, text, text, text, numeric, text, text, text, text, text, text,
  date, date, uuid, text, text, text, text, extraction_method, numeric, text[], text,
  uuid, dn_reissue_reason, text
) to authenticated;


-- ---------------------------------------------------------------------
-- 6. The driver's report from the yard
-- ---------------------------------------------------------------------

create or replace function submit_reissue(
  p_original_dn_id uuid,
  p_reason         dn_reissue_reason,
  p_note           text default null,
  p_file_path      text default null,
  p_file_type      text default 'image',
  p_dn_number      text default null,
  p_so_number      text default null
)
returns dn_reissue_submissions
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_original delivery_notes;
  v_row      dn_reissue_submissions;
begin
  if private.current_user_role() is null then
    raise exception 'Permission denied: sign in to report a reissued slip.';
  end if;

  if p_reason = 'other' and coalesce(btrim(p_note), '') = '' then
    raise exception 'Please describe the reason when choosing "Other".';
  end if;

  select * into v_original from delivery_notes where id = p_original_dn_id;
  if not found then
    raise exception 'The delivery note being replaced does not exist.';
  end if;

  -- A driver reports what is in their own hands. Everybody else who can
  -- report one can also record it directly, so this is the narrow case.
  if private.current_user_role() = 'driver'
     and v_original.holder_id is distinct from auth.uid() then
    raise exception 'Delivery note % is not with you.', v_original.dn_number;
  end if;

  if v_original.workflow_status = 'replaced' then
    raise exception 'Delivery note % has already been replaced.', v_original.dn_number;
  end if;
  if v_original.workflow_status = 'received' then
    raise exception
      'Delivery note % has already been counted in, so it cannot be replaced.',
      v_original.dn_number;
  end if;

  if exists (
    select 1 from dn_reissue_submissions
     where original_dn_id = p_original_dn_id and status = 'pending'
  ) then
    raise exception
      'A replacement for delivery note % has already been reported and is waiting to be checked.',
      v_original.dn_number;
  end if;

  insert into dn_reissue_submissions (
    original_dn_id, reason, note, file_path, file_type, dn_number, so_number, submitted_by
  ) values (
    p_original_dn_id, p_reason, nullif(btrim(p_note), ''), p_file_path,
    coalesce(nullif(btrim(p_file_type), ''), 'image'),
    nullif(btrim(p_dn_number), ''), nullif(btrim(p_so_number), ''), auth.uid()
  )
  returning * into v_row;

  return v_row;
end
$fn$;

revoke all on function submit_reissue(uuid, dn_reissue_reason, text, text, text, text, text)
  from public, anon;
grant execute on function submit_reissue(uuid, dn_reissue_reason, text, text, text, text, text)
  to authenticated;


-- ---------------------------------------------------------------------
-- 7. Turning a report into a slip, or turning it down
--
-- The approver reads the numbers off the sheet, because everything else
-- in the system keys off them (D47). The quantity comes from the original
-- unless the approver says otherwise: it is the same load.
-- ---------------------------------------------------------------------

create or replace function approve_reissue(
  p_submission_id uuid,
  p_dn_number     text,
  p_so_number     text,
  p_pdf_qty       numeric default null,
  p_note          text default null
)
returns delivery_notes
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_sub      dn_reissue_submissions;
  v_original delivery_notes;
  v_line     delivery_note_lines;
  v_new      delivery_notes;
begin
  if not has_role('admin', 'gm', 'ceo') then
    raise exception 'Permission denied: only an admin, the GM or a superadmin can approve a reissue.';
  end if;

  select * into v_sub from dn_reissue_submissions where id = p_submission_id for update;
  if not found then
    raise exception 'That reissue report does not exist.';
  end if;
  if v_sub.status <> 'pending' then
    raise exception 'That reissue report has already been %.', v_sub.status;
  end if;

  if coalesce(btrim(p_dn_number), '') = '' or coalesce(btrim(p_so_number), '') = '' then
    raise exception 'Read the delivery note number and sales order number off the new slip.';
  end if;

  select * into v_original from delivery_notes where id = v_sub.original_dn_id;
  select * into v_line from delivery_note_lines
   where delivery_note_id = v_sub.original_dn_id order by line_no limit 1;

  if v_line is null then
    raise exception 'The delivery note being replaced has no lines.';
  end if;

  v_new := create_delivery_note(
    p_dn_number        => p_dn_number,
    p_so_number        => p_so_number,
    p_supplier_code    => (select code from suppliers where id = v_original.supplier_id),
    p_item_number      => v_line.item_number,
    p_item_description => v_line.item_description,
    p_uom              => v_line.uom,
    p_pdf_qty          => coalesce(p_pdf_qty, v_line.pdf_qty),
    p_customer_number  => v_original.customer_number,
    p_customer_name    => v_original.customer_name,
    p_shipping_ref     => v_original.shipping_reference,
    p_ship_from        => v_original.ship_from,
    p_ship_to          => v_original.ship_to,
    p_salesman         => v_original.salesman,
    p_pdf_path         => v_sub.file_path,
    p_file_type        => v_sub.file_type,
    p_extraction       => 'manual',
    p_replaces_dn_id   => v_sub.original_dn_id,
    p_reissue_reason   => v_sub.reason,
    p_reissue_note     => v_sub.note
  );

  update dn_reissue_submissions
     set status = 'approved', decided_by = auth.uid(), decided_at = now(),
         decision_note = nullif(btrim(p_note), ''), created_dn_id = v_new.id,
         dn_number = btrim(p_dn_number), so_number = btrim(p_so_number)
   where id = p_submission_id;

  return v_new;
end
$fn$;

revoke all on function approve_reissue(uuid, text, text, numeric, text) from public, anon;
grant execute on function approve_reissue(uuid, text, text, numeric, text) to authenticated;


create or replace function reject_reissue(p_submission_id uuid, p_reason text)
returns dn_reissue_submissions
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_row dn_reissue_submissions;
begin
  if not has_role('admin', 'gm', 'ceo') then
    raise exception 'Permission denied: only an admin, the GM or a superadmin can turn down a reissue.';
  end if;

  -- The driver has to know what was wrong with it (D48).
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'A reason is required when turning down a reissue report.';
  end if;

  update dn_reissue_submissions
     set status = 'rejected', decided_by = auth.uid(), decided_at = now(),
         decision_note = btrim(p_reason)
   where id = p_submission_id and status = 'pending'
   returning * into v_row;

  if not found then
    raise exception 'That reissue report does not exist, or it has already been dealt with.';
  end if;

  return v_row;
end
$fn$;

revoke all on function reject_reissue(uuid, text) from public, anon;
grant execute on function reject_reissue(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 6b. A driver may add the photo, and nothing else
--
-- Uploading into the delivery-notes bucket has always been the office's
-- job: a driver who could write anywhere in it could replace a supplier's
-- delivery note with a picture of their own. But the photo of a reissued
-- sheet has to come from the yard, where the driver is.
--
-- So the door opens exactly as far as it has to — the `reissues/` folder,
-- for a driver, on insert only. Reading is unchanged (any signed-in user,
-- through a signed URL) and deleting still needs the GM.
-- ---------------------------------------------------------------------

drop policy if exists "dn_pdf_insert" on storage.objects;

create policy "dn_pdf_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'delivery-notes'
    and (
      private.has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo')
      or (private.has_role('driver') and name like 'reissues/%')
    )
  );


-- ---------------------------------------------------------------------
-- 7b. Slips a new one could be replacing
--
-- The whole scheme leans on somebody ticking a box. Tick nothing and the
-- replacement is filed as an extra delivery, and at month end the count
-- is wrong in the supplier's favour — the exact thing this is here to
-- prevent (D33). So the system looks for itself: same customer, same
-- item, same quantity, still expected, uploaded recently. The screen then
-- has to ask, rather than hope somebody remembers.
-- ---------------------------------------------------------------------

create or replace function find_possible_originals(
  p_item_number     text,
  p_pdf_qty         numeric,
  p_customer_number text default null,
  p_within_days     integer default 45
)
returns table (
  id          uuid,
  dn_number   text,
  so_number   text,
  print_date  date,
  pdf_qty     numeric,
  item_number text,
  workflow_status dn_workflow_status,
  holder_name text
)
language sql
stable
security definer
set search_path = public, private
as $$
  select d.id, d.dn_number, d.so_number, d.print_date, l.pdf_qty, l.item_number,
         d.workflow_status,
         btrim(coalesce(h.first_name, '') || ' ' || coalesce(h.last_name, ''))
    from delivery_notes d
    join delivery_note_lines l on l.delivery_note_id = d.id
    left join user_tbl h on h.id = d.holder_id
   where private.current_user_role() is not null
     -- Still expected: counted or already replaced sheets are not candidates.
     and d.workflow_status not in ('received', 'replaced', 'rejected')
     and l.received_at is null
     and l.item_number = btrim(p_item_number)
     and l.pdf_qty = p_pdf_qty
     -- A customer number narrows the search when both sheets carry one. A
     -- slip typed in by hand may have none, and that must not hide it.
     and (
       p_customer_number is null
       or d.customer_number is null
       or d.customer_number = p_customer_number
     )
     and d.created_at > now() - make_interval(days => greatest(p_within_days, 1))
   order by d.created_at desc
   limit 10
$$;

revoke all on function find_possible_originals(text, numeric, text, integer) from public, anon;
grant execute on function find_possible_originals(text, numeric, text, integer) to authenticated;


-- ---------------------------------------------------------------------
-- 8. A replaced slip leaves the register
--
-- Two sheets for one delivery would otherwise read as twice the expected
-- quantity and a shortage that never happened (D46). The replaced sheet
-- is not lost — it is in the reissue register below, with its reason.
-- ---------------------------------------------------------------------

create or replace view v_inventory_dashboard as
select
  dn.id            as delivery_note_id,
  dn.dn_number     as "DN No",
  dn.so_number     as "SO No",
  dn.print_date,
  s.name_en        as supplier,
  b.item_number,
  b.item_description as "Item",
  b.uom            as "UOM",
  b.pdf_qty        as "PDF Qty",
  coalesce(b.arrived_qty, 0) as "Arrived Qty",
  b.missing_qty    as "Missing Qty",
  b.in_qty         as "In Qty",
  b.out_qty        as "Out Qty",
  b.balance_qty    as "Balance",
  b.status         as "Status",
  b.discrepancy_code as "Discrepancy",
  b.received_at
from v_lot_balances b
join delivery_notes dn on dn.id = b.delivery_note_id
join suppliers      s  on s.id  = dn.supplier_id
where dn.workflow_status <> 'replaced';

-- Recreating a view resets this, every single time.
alter view v_inventory_dashboard set (security_invoker = on);


-- ---------------------------------------------------------------------
-- 9. The month-end register
--
-- One row per replacement: the supplier's two sheets side by side, why
-- there are two, and who said so.
-- ---------------------------------------------------------------------

create or replace view v_reissue_register as
  select
    new.id            as delivery_note_id,
    new.dn_number     as "New DN",
    new.so_number     as "New SO",
    old.id            as replaced_dn_id,
    old.dn_number     as "Replaced DN",
    old.so_number     as "Replaced SO",
    new.reissue_reason as "Reason",
    new.reissue_note   as "Remarks",
    line.item_number   as "Item",
    line.pdf_qty       as "Qty",
    line.uom           as "UOM",
    new.created_at     as "Recorded",
    btrim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) as "Recorded by",
    sub.submitted_at   as "Reported",
    btrim(coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, '')) as "Reported by",
    new.workflow_status as "New slip status",
    old.status          as "Replaced slip arrival status"
  from delivery_notes new
  join delivery_notes old on old.id = new.replaces_dn_id
  left join lateral (
    select l.item_number, l.pdf_qty, l.uom
      from delivery_note_lines l
     where l.delivery_note_id = new.id
     order by l.line_no
     limit 1
  ) line on true
  left join user_tbl u on u.id = new.created_by
  left join dn_reissue_submissions sub on sub.created_dn_id = new.id
  left join user_tbl r on r.id = sub.submitted_by
 where private.has_role('ceo', 'gm', 'manager', 'admin');

-- Same reasoning as v_slip_custody in 0023: this names people, and
-- user_tbl's policy hides other users from the admin. The gate in the
-- `where` clause is what keeps everybody else out.
alter view v_reissue_register set (security_invoker = off);

revoke all on v_reissue_register from anon;
grant select on v_reissue_register to authenticated;
