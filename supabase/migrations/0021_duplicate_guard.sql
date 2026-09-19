-- =====================================================================
--  0021 — Duplicate guard for delivery notes, and a truthful handover log
--
--  PHASE 0 — the handover log recorded the wrong starting state.
--
--    send_dn_to_driver() wrote its log row AFTER `update ... returning *
--    into v_dn`, so `v_dn.workflow_status` already held the new value and
--    every driver handover was logged as `sent_to_driver -> sent_to_driver`.
--    The custody audit that is about to be built reads this log; it has to
--    be right first. Existing rows are repaired from the row before them.
--
--  PHASE 1 — one slip must never become two records.
--
--    1. Delivery note number: already unique, but compared untrimmed, so
--       "9010043974 " slipped past it. Values are now trimmed on the way in
--       and a constraint refuses anything that is not.
--    2. The PDF file itself: its SHA-256 was only checked in the browser.
--       It is now unique in the database. A reissued slip is a different
--       file, so this never blocks a genuine reissue.
--    3. Sales order number: NOT unique. A supplier may split one order
--       across deliveries, and a hard rule would then refuse a real slip.
--       A repeat is refused unless an admin (or superadmin) gives a reason,
--       which is stored with who accepted it and when (decision D35).
--       Enforced in a trigger, so a direct table insert cannot skip it.
--
--  Every rule is in the database. The browser only warns earlier.
--
--  Run after 0020.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PHASE 0 · 1. send_dn_to_driver: capture the state before changing it
-- ---------------------------------------------------------------------

create or replace function send_dn_to_driver(
  p_dn_id            uuid,
  p_driver_id        uuid,
  p_stamped_pdf_path text default null,
  p_note             text default null
)
returns delivery_notes
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_dn   delivery_notes;
  v_from dn_workflow_status;
begin
  if not has_role('gm', 'ceo') then
    raise exception 'Permission denied: only the GM or a superadmin can hand a slip to a driver.';
  end if;

  if not exists (select 1 from user_tbl where id = p_driver_id and is_driver and is_active) then
    raise exception 'The selected recipient is not an active driver.';
  end if;

  select * into v_dn from delivery_notes where id = p_dn_id for update;
  if not found then
    raise exception 'Delivery note not found: %', p_dn_id;
  end if;

  if v_dn.workflow_status not in ('sent_to_gm', 'gm_approved') then
    raise exception 'Delivery note % cannot be handed over from its current state (%).',
      v_dn.dn_number, v_dn.workflow_status;
  end if;

  -- Read before the update below overwrites v_dn.
  v_from := v_dn.workflow_status;

  update delivery_notes
     set workflow_status    = 'sent_to_driver',
         assigned_driver_id = p_driver_id,
         driver_sent_at     = now(),
         driver_sent_by     = auth.uid(),
         stamped_pdf_path   = coalesce(p_stamped_pdf_path, stamped_pdf_path)
   where id = p_dn_id
   returning * into v_dn;

  insert into dn_workflow_log (delivery_note_id, from_status, to_status, assigned_to, note, actor)
  values (p_dn_id, v_from, 'sent_to_driver', p_driver_id, p_note, auth.uid());

  return v_dn;
end
$$;

revoke all on function send_dn_to_driver(uuid, uuid, text, text) from public, anon;
grant execute on function send_dn_to_driver(uuid, uuid, text, text) to authenticated;


-- ---------------------------------------------------------------------
-- PHASE 0 · 2. Repair the rows the bug already wrote
--
-- A handover to a driver always follows another logged step for the same
-- note, and that step's `to_status` is the true starting state. Rows with
-- no earlier entry are left alone rather than guessed at.
-- ---------------------------------------------------------------------

update dn_workflow_log l
   set from_status = (
         select p.to_status
           from dn_workflow_log p
          where p.delivery_note_id = l.delivery_note_id
            and p.created_at < l.created_at
          order by p.created_at desc
          limit 1
       )
 where l.from_status = 'sent_to_driver'
   and l.to_status   = 'sent_to_driver'
   and exists (
         select 1
           from dn_workflow_log p
          where p.delivery_note_id = l.delivery_note_id
            and p.created_at < l.created_at
       );


-- ---------------------------------------------------------------------
-- PHASE 1 · 1. Shape of the identifying values
-- ---------------------------------------------------------------------

alter table delivery_notes
  add constraint dn_number_trimmed
    check (dn_number = btrim(dn_number) and dn_number <> ''),
  add constraint so_number_trimmed
    check (so_number = btrim(so_number) and so_number <> ''),
  -- crypto.subtle.digest output, hex-encoded. Anything else is not a hash
  -- of the file and must not be able to occupy the unique slot below.
  add constraint pdf_sha256_format
    check (pdf_sha256 is null or pdf_sha256 ~ '^[0-9a-f]{64}$');


-- ---------------------------------------------------------------------
-- PHASE 1 · 2. The same file cannot be stored twice
--
-- Replaces the plain index from 0009; lookups use this one just as well.
-- ---------------------------------------------------------------------

drop index if exists delivery_notes_pdf_sha256_idx;

create unique index delivery_notes_pdf_sha256_key
  on delivery_notes (pdf_sha256)
  where pdf_sha256 is not null;


-- ---------------------------------------------------------------------
-- PHASE 1 · 3. A repeated sales order needs an admin and a reason
-- ---------------------------------------------------------------------

alter table delivery_notes
  add column so_override_reason text,
  add column so_override_by     uuid references user_tbl(id),
  add column so_override_at     timestamptz,
  -- All three together or none: a reason nobody owns is not an approval.
  add constraint so_override_complete check (
    (so_override_reason is null and so_override_by is null and so_override_at is null)
    or (so_override_reason is not null and so_override_by is not null and so_override_at is not null)
  );

comment on column delivery_notes.so_override_reason is
  'Why an admin accepted a sales order number that is already on another delivery note.';

create index if not exists delivery_notes_so_override_idx
  on delivery_notes (so_override_at desc)
  where so_override_reason is not null;

create or replace function private.guard_so_number()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_other text;
begin
  -- The override columns are written here and nowhere else. An update that
  -- does not change the sales order keeps whatever was recorded, so nobody
  -- can attach a reason or a name to an approval after the fact.
  if tg_op = 'UPDATE' and new.so_number = old.so_number then
    new.so_override_reason := old.so_override_reason;
    new.so_override_by     := old.so_override_by;
    new.so_override_at     := old.so_override_at;
    return new;
  end if;

  -- Two uploads of the same sales order at the same moment would each see
  -- no other row and both pass. The lock makes the second one wait for the
  -- first to commit; each query below takes a fresh snapshot, so it then
  -- sees that row. It is released at the end of the transaction.
  perform pg_advisory_xact_lock(hashtextextended('delivery_notes.so_number:' || new.so_number, 0));

  select d.dn_number into v_other
    from delivery_notes d
   where d.so_number = new.so_number
     and d.id <> new.id
   order by d.created_at
   limit 1;

  if v_other is null then
    -- Nothing to explain.
    new.so_override_reason := null;
    new.so_override_by     := null;
    new.so_override_at     := null;
    return new;
  end if;

  if coalesce(btrim(new.so_override_reason), '') = '' then
    raise exception 'Sales order % is already on delivery note %.', new.so_number, v_other
      using hint = 'so_number_in_use';
  end if;

  if not has_role('admin', 'ceo') then
    raise exception 'Only an admin can accept a sales order number that is already in use.';
  end if;

  new.so_override_reason := btrim(new.so_override_reason);
  new.so_override_by     := auth.uid();
  new.so_override_at     := now();
  return new;
end
$$;

revoke all on function private.guard_so_number() from public, anon, authenticated;

create trigger delivery_notes_guard_so_number
  before insert or update of so_number, so_override_reason, so_override_by, so_override_at
  on delivery_notes
  for each row execute function private.guard_so_number();


-- ---------------------------------------------------------------------
-- PHASE 1 · 4. The pre-upload check also reports sales orders
--
-- The return type changes, so the function is dropped and recreated.
-- `matched_on` tells the screen which kind of match it is: a file or a
-- delivery note number can never be saved again; a sales order can, with
-- an admin's reason.
-- ---------------------------------------------------------------------

drop function if exists check_dn_duplicates(text[], text[]);

create function check_dn_duplicates(
  p_sha256     text[],
  p_dn_numbers text[],
  p_so_numbers text[] default null
)
returns table (
  matched_on      text,
  dn_number       text,
  so_number       text,
  pdf_sha256      text,
  uploaded_at     timestamptz,
  workflow_status dn_workflow_status
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  if private.current_user_role() is null then
    raise exception 'Permission denied: sign in to check for duplicates.';
  end if;

  -- A drop of files is tens of slips. The cap keeps one call from being
  -- turned into a scan of the table.
  if coalesce(array_length(p_sha256, 1), 0) > 500
     or coalesce(array_length(p_dn_numbers, 1), 0) > 500
     or coalesce(array_length(p_so_numbers, 1), 0) > 500 then
    raise exception 'Check at most 500 slips at a time.';
  end if;

  return query
    select 'file'::text, d.dn_number, d.so_number, d.pdf_sha256, d.created_at, d.workflow_status
      from delivery_notes d
     where p_sha256 is not null
       and d.pdf_sha256 = any (select lower(btrim(x)) from unnest(p_sha256) x)
    union all
    select 'dn_number', d.dn_number, d.so_number, d.pdf_sha256, d.created_at, d.workflow_status
      from delivery_notes d
     where p_dn_numbers is not null
       and d.dn_number = any (select btrim(x) from unnest(p_dn_numbers) x)
    union all
    select 'so_number', d.dn_number, d.so_number, d.pdf_sha256, d.created_at, d.workflow_status
      from delivery_notes d
     where p_so_numbers is not null
       and d.so_number = any (select btrim(x) from unnest(p_so_numbers) x);
end
$$;

revoke all on function check_dn_duplicates(text[], text[], text[]) from public, anon;
grant execute on function check_dn_duplicates(text[], text[], text[]) to authenticated;


-- ---------------------------------------------------------------------
-- PHASE 1 · 5. create_delivery_note: trimmed values, readable refusals,
--              and the sales order reason
--
-- A new parameter changes the signature, so the old one is dropped first;
-- leaving it would make the two overloads ambiguous to PostgREST.
-- ---------------------------------------------------------------------

drop function if exists create_delivery_note(
  text, text, text, text, text, text, numeric, text, text, text, text, text, text,
  date, date, uuid, text, text, text, text, extraction_method, numeric, text[]
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
  p_so_override_reason text default null
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
    -- `on conflict do nothing` covers two slips carrying the same new item
    -- being uploaded at the same moment; the unique index on item_number is
    -- what actually guarantees one product cannot be recorded twice.
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

  -- An existing item is left exactly as it is. Once somebody has corrected a
  -- description or filled in a unit weight, the next PDF carrying a slightly
  -- different spelling must not undo that work.

  begin
    insert into delivery_notes (
      dn_number, so_number, supplier_id, customer_number, customer_name,
      shipping_reference, ship_from, ship_to, salesman, print_date, order_date,
      upload_batch_id, pdf_storage_path, pdf_file_name, pdf_sha256,
      source_file_type, extraction_method, extraction_confidence,
      needs_review_fields, created_by, so_override_reason
    ) values (
      v_dn_number, v_so_number, v_supplier, p_customer_number, p_customer_name,
      p_shipping_ref, p_ship_from, p_ship_to, p_salesman, p_print_date, p_order_date,
      p_batch_id, p_pdf_path, p_pdf_file_name, v_sha256,
      p_file_type, p_extraction, p_confidence,
      coalesce(p_needs_review, '{}'), auth.uid(), nullif(btrim(p_so_override_reason), '')
    )
    returning * into v_dn;
  exception
    -- The checks above cannot see a slip another upload is saving at this
    -- very moment. The unique indexes can; turn their refusal into the same
    -- sentence the checks would have given.
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'delivery_notes_pdf_sha256_key' then
        raise exception 'This file has already been uploaded.';
      end if;
      raise exception 'Delivery note % has already been uploaded.', v_dn_number;
  end;

  -- pdf_qty only. arrived_qty stays NULL until a person confirms the arrival:
  -- a supplier's claim is not stock.
  insert into delivery_note_lines (
    delivery_note_id, line_no, item_id, item_number, item_description, uom, pdf_qty
  ) values (
    v_dn.id, 1, v_item, btrim(p_item_number), p_item_description, p_uom, p_pdf_qty
  );

  return v_dn;
end
$fn$;

revoke all on function create_delivery_note(
  text, text, text, text, text, text, numeric, text, text, text, text, text, text,
  date, date, uuid, text, text, text, text, extraction_method, numeric, text[], text
) from public, anon;

grant execute on function create_delivery_note(
  text, text, text, text, text, text, numeric, text, text, text, text, text, text,
  date, date, uuid, text, text, text, text, extraction_method, numeric, text[], text
) to authenticated;
