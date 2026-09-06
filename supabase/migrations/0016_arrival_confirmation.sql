-- =====================================================================
--  0016 — Arrival confirmation
--
--  The core of Phase 1: what the supplier's PDF claims and what actually
--  reached the warehouse are two different numbers, and the difference is
--  the whole point of the system.
--
--  Three outcomes, all of them legal:
--
--    arrived_qty = pdf_qty   full delivery
--    arrived_qty < pdf_qty   short  — missing_qty positive
--    arrived_qty > pdf_qty   over   — missing_qty negative
--
--  A shortage is not just an inventory number, it is a question of who
--  answers for it: the supplier who loaded short, or the transport that
--  lost it on the way. A free-text box cannot answer that six months
--  later, so the reason is an enum and the database — not the UI —
--  insists on it.
--
--  Run after 0015.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Why the quantity did not match
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'dn_discrepancy_reason') then
    create type dn_discrepancy_reason as enum (
      'supplier_short_loaded',   -- short: the supplier loaded less than the note claims
      'transit_loss',            -- short: lost between the plant and the warehouse
      'damaged',                 -- short: arrived broken or unusable
      'counting_error',          -- either way: the count was wrong
      'supplier_over_loaded',    -- over:  more arrived than the note claims
      'other'                    -- either way: free text is then required
    );
  end if;
end
$$;


-- ---------------------------------------------------------------------
-- 2. Columns
--    `discrepancy_reason` (text) already exists and stays as the free
--    note. `discrepancy_code` is the part that can be reported on.
-- ---------------------------------------------------------------------
alter table delivery_note_lines
  add column if not exists discrepancy_code   dn_discrepancy_reason,
  add column if not exists arrival_photo_path text;

comment on column delivery_note_lines.discrepancy_code is
  'Structured reason the received quantity did not match the PDF. Drives supplier and transport accountability reporting.';
comment on column delivery_note_lines.arrival_photo_path is
  'Optional evidence photo in the private delivery-notes bucket. Reachable only through a signed URL.';


-- ---------------------------------------------------------------------
-- 3. Constraints
--
--    An over-delivery used to be rejected outright. That was worse than
--    it looks: the keeper would simply type the PDF quantity, and the
--    extra bags would sit in the warehouse with no record anywhere.
--    Recording the truth beats enforcing a tidy number.
-- ---------------------------------------------------------------------
alter table delivery_note_lines drop constraint if exists arrived_lte_pdf;

alter table delivery_note_lines drop constraint if exists status_matches_arrived;
alter table delivery_note_lines add constraint status_matches_arrived check (
  (status = 'cancelled')
  or (status = 'not_arrived' and coalesce(arrived_qty, 0) = 0)
  or (status = 'partial'     and arrived_qty > 0 and arrived_qty < pdf_qty)
  or (status = 'arrived'     and arrived_qty >= pdf_qty)
);

-- A mismatch always carries a reason. This holds no matter how the row is
-- written — RPC, PostgREST, or a hand-typed UPDATE in the SQL editor.
alter table delivery_note_lines drop constraint if exists discrepancy_needs_reason;
alter table delivery_note_lines add constraint discrepancy_needs_reason check (
  arrived_qty is null
  or arrived_qty = pdf_qty
  or discrepancy_code is not null
);

-- And the reason has to point the right way. A shortage blamed on
-- "supplier over loaded" would corrupt every accountability report built
-- on top of this column.
alter table delivery_note_lines drop constraint if exists discrepancy_code_matches_direction;
alter table delivery_note_lines add constraint discrepancy_code_matches_direction check (
  discrepancy_code is null
  or arrived_qty is null
  or (arrived_qty < pdf_qty and discrepancy_code <> 'supplier_over_loaded')
  or (arrived_qty > pdf_qty and discrepancy_code in
        ('supplier_over_loaded', 'counting_error', 'other'))
);


-- ---------------------------------------------------------------------
-- 4. Indexes
--
--    The receiving queue is "notes handed to a driver, newest first".
--    A partial index keeps it the size of the open queue rather than the
--    size of history, so it does not grow as delivered notes pile up.
-- ---------------------------------------------------------------------
create index if not exists delivery_notes_receiving_queue_idx
  on delivery_notes (driver_sent_at desc)
  where workflow_status = 'sent_to_driver';

-- Open lines only — again sized by what is outstanding, not by history.
create index if not exists delivery_note_lines_open_idx
  on delivery_note_lines (delivery_note_id)
  where received_at is null;

-- Discrepancy reporting: "every short or over line, by reason".
create index if not exists delivery_note_lines_discrepancy_idx
  on delivery_note_lines (discrepancy_code, received_at desc)
  where discrepancy_code is not null;


-- ---------------------------------------------------------------------
-- 5. Confirm arrival
--
--    The signature changes (the reason is an enum now), so the old
--    function is dropped rather than replaced.
-- ---------------------------------------------------------------------
drop function if exists receive_delivery_note_line(uuid, numeric, uuid, text, text);

create function receive_delivery_note_line(
  p_line_id            uuid,
  p_arrived_qty        numeric,
  p_warehouse_id       uuid,
  p_discrepancy_code   dn_discrepancy_reason default null,
  p_discrepancy_note   text default null,
  p_arrival_photo_path text default null,
  p_notes              text default null
)
returns delivery_note_lines
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_line       delivery_note_lines;
  v_dn         delivery_notes;
  v_status     dn_status;
  v_all_done   boolean;
  v_mismatched boolean;
begin
  -- The driver is excluded on purpose: the person who carried the goods
  -- must not be the person who counts them. The admin is excluded too —
  -- they entered the expected quantity from the PDF, so letting them also
  -- confirm the actual quantity would put both numbers in one pair of
  -- hands. GM and superadmin are kept as supervisors.
  if not has_role('warehouse', 'gm', 'ceo') then
    raise exception
      'Permission denied: only the warehouse keeper, the GM or a superadmin can confirm an arrival.';
  end if;

  if p_warehouse_id is null then
    raise exception 'A warehouse must be selected.';
  end if;

  select * into v_line from delivery_note_lines where id = p_line_id for update;
  if not found then
    raise exception 'Delivery note line not found.';
  end if;

  if v_line.received_at is not null then
    raise exception
      'This line was already received (% recorded). Use a reversal to correct it.',
      v_line.arrived_qty;
  end if;

  select * into v_dn from delivery_notes where id = v_line.delivery_note_id;

  -- Stock may only appear through the approved chain. A note still sitting
  -- with the admin, or one the GM rejected, must never become stock.
  if v_dn.workflow_status <> 'sent_to_driver' then
    raise exception
      'This delivery note is not out for delivery (current status: %). Only a note handed to a driver can be received.',
      v_dn.workflow_status;
  end if;

  if p_arrived_qty is null or p_arrived_qty < 0 then
    raise exception 'The received quantity must be zero or more.';
  end if;

  -- Reason rules. The constraints in section 3 enforce the same thing at
  -- the table level; these run first so the keeper gets a sentence rather
  -- than a constraint name.
  if p_arrived_qty <> v_line.pdf_qty and p_discrepancy_code is null then
    raise exception
      'A reason is required: the note says % and % was received.',
      v_line.pdf_qty, p_arrived_qty;
  end if;

  if p_arrived_qty = v_line.pdf_qty and p_discrepancy_code is not null then
    raise exception 'No reason should be given when the quantity matches the delivery note.';
  end if;

  if p_arrived_qty < v_line.pdf_qty and p_discrepancy_code = 'supplier_over_loaded' then
    raise exception 'That reason describes an over-delivery, but the quantity is short.';
  end if;

  if p_arrived_qty > v_line.pdf_qty
     and p_discrepancy_code not in ('supplier_over_loaded', 'counting_error', 'other') then
    raise exception 'That reason describes a shortage, but more arrived than the delivery note claims.';
  end if;

  if p_discrepancy_code = 'other'
     and coalesce(btrim(p_discrepancy_note), '') = '' then
    raise exception 'Please describe the reason when choosing "Other".';
  end if;

  v_status := case
                when p_arrived_qty = 0                then 'not_arrived'
                when p_arrived_qty < v_line.pdf_qty   then 'partial'
                else 'arrived'
              end;

  update delivery_note_lines
     set arrived_qty        = p_arrived_qty,
         status             = v_status,
         received_at        = now(),
         received_by        = auth.uid(),
         discrepancy_code   = p_discrepancy_code,
         discrepancy_reason = nullif(btrim(coalesce(p_discrepancy_note, '')), ''),
         arrival_photo_path = p_arrival_photo_path,
         notes              = coalesce(p_notes, notes)
   where id = p_line_id
   returning * into v_line;

  -- Stock increases only here, and only by what actually arrived.
  -- pdf_qty never enters this number.
  if p_arrived_qty > 0 then
    insert into stock_movements (
      item_id, warehouse_id, direction, qty, movement_type,
      delivery_note_line_id, reference_no, created_by, notes
    ) values (
      v_line.item_id, p_warehouse_id, 'IN', p_arrived_qty, 'dn_receipt',
      v_line.id, v_dn.dn_number, auth.uid(), p_notes
    );
  end if;

  -- Roll the header status up from its lines.
  select
    bool_and(l.received_at is not null),
    bool_or(l.discrepancy_code is not null),
    case
      when bool_and(l.received_at is not null and l.arrived_qty >= l.pdf_qty) then 'arrived'::dn_status
      when bool_or(coalesce(l.arrived_qty, 0) > 0)                            then 'partial'::dn_status
      else 'not_arrived'::dn_status
    end
    into v_all_done, v_mismatched, v_status
  from delivery_note_lines l
  where l.delivery_note_id = v_line.delivery_note_id;

  update delivery_notes
     set status         = v_status,
         arrived_at     = case when v_status in ('arrived', 'partial')
                               then coalesce(arrived_at, now()) end,
         -- The note leaves the driver's list and the receiving queue only
         -- once every line on it has been counted.
         workflow_status = case when v_all_done then 'received'::dn_workflow_status
                                else workflow_status end
   where id = v_line.delivery_note_id;

  if v_all_done then
    insert into dn_workflow_log (delivery_note_id, from_status, to_status, actor, note)
    values (
      v_line.delivery_note_id, 'sent_to_driver', 'received', auth.uid(),
      -- An over-delivery also lands on status 'arrived', so the status
      -- alone cannot tell a clean receipt from a mismatched one.
      case
        when v_mismatched then 'Received with a discrepancy'
        else 'Received in full'
      end
    );
  end if;

  return v_line;
end
$fn$;


-- ---------------------------------------------------------------------
-- 6. Grants — the revoke is what closes the door. Postgres grants
--    EXECUTE to PUBLIC by default, so the grant alone adds nothing.
-- ---------------------------------------------------------------------
revoke all on function receive_delivery_note_line(
  uuid, numeric, uuid, dn_discrepancy_reason, text, text, text) from public, anon;

grant execute on function receive_delivery_note_line(
  uuid, numeric, uuid, dn_discrepancy_reason, text, text, text) to authenticated;
