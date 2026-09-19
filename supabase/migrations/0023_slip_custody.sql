-- =====================================================================
--  0023 — Custody: who is holding a slip, and the trail of who had it
--
--  The workflow used to be a single line: admin -> GM -> driver. The
--  client's real one is a small graph (decisions D29, D30, D37, D38, D39,
--  D45):
--
--      admin  -> GM | warehouse | driver      (full control, D37)
--      GM     -> warehouse | driver
--      warehouse -> driver
--      driver -> acknowledges receipt         (D38)
--      GM     -> may change the driver        (D39)
--
--  Two rules shape the design:
--
--    * ONE custodian at a time (D30). `delivery_notes.holder_id` is the
--      person responsible right now; the ledger says how it got there.
--      Supervisors can see everything, but only one person holds it.
--
--    * Counting still happens through a driver (D29). A slip handed to the
--      warehouse cannot be received; the warehouse passes it to a driver,
--      the driver brings the goods, and the count happens then. That rule
--      already lives in `receive_delivery_note_line` and is unchanged.
--
--  The handover ledger is `dn_workflow_log`, extended rather than
--  duplicated, and it becomes append-only here: an audit trail that can be
--  edited afterwards is not an audit trail.
--
--  Run after 0022.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Who holds the slip
-- ---------------------------------------------------------------------

alter table delivery_notes
  add column holder_id       uuid references user_tbl(id),
  add column holder_role     user_role,
  add column holder_since    timestamptz,
  -- Set when a driver confirms the slip reached them (D38). Cleared by
  -- every handover, because the next person has not confirmed anything.
  add column acknowledged_at timestamptz,
  add constraint holder_complete check (
    (holder_id is null and holder_role is null and holder_since is null)
    or (holder_id is not null and holder_role is not null and holder_since is not null)
  ),
  add constraint acknowledged_needs_holder check (
    acknowledged_at is null or holder_id is not null
  );

comment on column delivery_notes.holder_id is
  'The one person responsible for this slip right now. NULL once it is received or rejected.';

-- "What is in my hands" is the query every screen opens with.
create index delivery_notes_holder_idx
  on delivery_notes (holder_id, workflow_status)
  where holder_id is not null;

-- Backfill from what the old columns already say.
update delivery_notes
   set holder_id    = assigned_driver_id,
       holder_role  = 'driver',
       holder_since = coalesce(driver_sent_at, updated_at, created_at)
 where workflow_status = 'sent_to_driver'
   and assigned_driver_id is not null;

update delivery_notes
   set holder_id    = assigned_to,
       holder_role  = 'gm',
       holder_since = coalesce(sent_at, updated_at, created_at)
 where workflow_status in ('sent_to_gm', 'gm_approved')
   and assigned_to is not null;

-- A slip nobody has sent anywhere is still with whoever uploaded it.
update delivery_notes d
   set holder_id    = d.created_by,
       holder_role  = u.role,
       holder_since = d.created_at
  from user_tbl u
 where u.id = d.created_by
   and d.workflow_status = 'draft'
   and d.created_by is not null;

-- `received` and `rejected` keep holder NULL: the journey is over.

-- A slip that has just been uploaded is in the uploader's hands. Written as
-- a trigger rather than inside `create_delivery_note`, so that it also holds
-- for a row inserted any other way, and so the upload function does not have
-- to be reopened for it.
create or replace function private.set_initial_holder()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if new.holder_id is null and auth.uid() is not null then
    new.holder_id    := auth.uid();
    new.holder_role  := private.current_user_role();
    new.holder_since := now();
  end if;
  return new;
end
$$;

revoke all on function private.set_initial_holder() from public, anon, authenticated;

create trigger delivery_notes_set_initial_holder
  before insert on delivery_notes
  for each row execute function private.set_initial_holder();


-- ---------------------------------------------------------------------
-- 2. The ledger
--
-- `assigned_to` already holds the recipient of each step, so it is the
-- "to" side and is not duplicated. What was missing is who it came from,
-- what kind of step it was, and the recipient's role.
-- ---------------------------------------------------------------------

alter table dn_workflow_log
  add column holder_from uuid references user_tbl(id),
  add column to_role     user_role,
  add column action      text;

comment on column dn_workflow_log.action is
  'hand_over | reassign_driver | acknowledge | approve | reject | receive';

-- Older callers (and `receive_delivery_note_line`) do not set `action`.
-- Rather than rewrite them, it is derived from the step they recorded.
create or replace function private.fill_workflow_action()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if new.action is null then
    new.action := case new.to_status
                    when 'received'    then 'receive'
                    when 'gm_approved' then 'approve'
                    when 'rejected'    then 'reject'
                    else 'hand_over'
                  end;
  end if;

  if new.to_role is null and new.assigned_to is not null then
    select u.role into new.to_role from user_tbl u where u.id = new.assigned_to;
  end if;

  return new;
end
$$;

revoke all on function private.fill_workflow_action() from public, anon, authenticated;

create trigger dn_workflow_log_fill_action
  before insert on dn_workflow_log
  for each row execute function private.fill_workflow_action();

update dn_workflow_log l
   set action = case l.to_status
                  when 'received'    then 'receive'
                  when 'gm_approved' then 'approve'
                  when 'rejected'    then 'reject'
                  else 'hand_over'
                end,
       to_role = u.role
  from user_tbl u
 where u.id = l.assigned_to
   and l.action is null;

update dn_workflow_log
   set action = case to_status
                  when 'received'    then 'receive'
                  when 'gm_approved' then 'approve'
                  when 'rejected'    then 'reject'
                  else 'hand_over'
                end
 where action is null;

alter table dn_workflow_log
  alter column action set not null,
  add constraint action_is_known check (
    action in ('hand_over', 'reassign_driver', 'acknowledge', 'approve', 'reject', 'receive')
  );

-- Append-only, the same way the stock ledger is. A record of who had a
-- slip is worth nothing if it can be tidied up afterwards.
create or replace function private.block_workflow_log_write()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  raise exception 'The handover log is a record of what happened and cannot be % .', lower(tg_op);
end
$$;

revoke all on function private.block_workflow_log_write() from public, anon, authenticated;

create trigger dn_workflow_log_no_update
  before update on dn_workflow_log
  for each row execute function private.block_workflow_log_write();

create trigger dn_workflow_log_no_delete
  before delete on dn_workflow_log
  for each row execute function private.block_workflow_log_write();

-- The audit screen reads the newest steps across every slip.
create index if not exists dn_workflow_log_created_idx
  on dn_workflow_log (created_at desc);


-- ---------------------------------------------------------------------
-- 3. Handing a slip on
--
-- One function for every handover, so the rules about who may give what
-- to whom exist in exactly one place.
-- ---------------------------------------------------------------------

create or replace function hand_over_delivery_note(
  p_dn_id   uuid,
  p_to_user uuid,
  p_note    text default null
)
returns delivery_notes
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_caller      uuid      := auth.uid();
  v_caller_role user_role := private.current_user_role();
  v_to          user_tbl;
  v_dn          delivery_notes;
  v_from_status dn_workflow_status;
  v_from_holder uuid;
  v_new_status  dn_workflow_status;
  v_action      text := 'hand_over';
begin
  if v_caller_role is null then
    raise exception 'Permission denied: sign in to hand over a slip.';
  end if;

  select * into v_to from user_tbl where id = p_to_user and is_active;
  if not found then
    raise exception 'The selected recipient is not an active user.';
  end if;

  if v_to.role not in ('gm', 'warehouse', 'driver') then
    raise exception 'A slip can only be handed to the GM, the warehouse or a driver.';
  end if;

  -- Who may hand to whom (D37). The admin and the superadmin have the run
  -- of the board; everybody else passes it forward only.
  if not (
       v_caller_role in ('admin', 'ceo')
    or (v_caller_role = 'gm'        and v_to.role in ('warehouse', 'driver'))
    or (v_caller_role = 'warehouse' and v_to.role = 'driver')
  ) then
    raise exception 'Permission denied: the % cannot hand a slip to the %.',
      v_caller_role, v_to.role;
  end if;

  select * into v_dn from delivery_notes where id = p_dn_id for update;
  if not found then
    raise exception 'Delivery note not found.';
  end if;

  if v_dn.workflow_status = 'received' then
    raise exception 'Delivery note % has already been counted in.', v_dn.dn_number;
  end if;
  if v_dn.workflow_status = 'rejected' then
    raise exception 'Delivery note % was rejected and cannot be handed on.', v_dn.dn_number;
  end if;
  if v_dn.holder_id = v_to.id then
    raise exception 'Delivery note % is already with that person.', v_dn.dn_number;
  end if;

  -- One custodian (D30): you pass on what you are holding. The admin, the
  -- superadmin and the GM can step in — somebody has to be able to move a
  -- slip when a driver is off sick.
  if v_dn.holder_id is not null
     and v_dn.holder_id <> v_caller
     and v_caller_role not in ('admin', 'ceo', 'gm') then
    raise exception 'Delivery note % is not in your hands.', v_dn.dn_number;
  end if;

  -- Once it is out with a driver the only move left is to another driver,
  -- and only the GM may make it (D39).
  if v_dn.workflow_status = 'sent_to_driver' then
    if v_to.role <> 'driver' then
      raise exception
        'Delivery note % is out with a driver; it can only be passed to another driver.',
        v_dn.dn_number;
    end if;
    if v_caller_role not in ('gm', 'ceo', 'admin') then
      raise exception 'Only the GM, the admin or a superadmin can change the driver carrying a slip.';
    end if;
    v_action := 'reassign_driver';
  end if;

  v_from_status := v_dn.workflow_status;
  v_from_holder := v_dn.holder_id;

  v_new_status := case v_to.role
                    when 'gm'        then 'sent_to_gm'
                    when 'warehouse' then 'with_warehouse'
                    else                  'sent_to_driver'
                  end::dn_workflow_status;

  update delivery_notes
     set workflow_status    = v_new_status,
         holder_id          = v_to.id,
         holder_role        = v_to.role,
         holder_since       = now(),
         -- The next person has not confirmed anything yet.
         acknowledged_at    = null,
         assigned_to        = case when v_to.role = 'gm' then v_to.id else assigned_to end,
         sent_at            = case when v_to.role = 'gm' then now() else sent_at end,
         sent_by            = case when v_to.role = 'gm' then v_caller else sent_by end,
         assigned_driver_id = case when v_to.role = 'driver' then v_to.id else assigned_driver_id end,
         driver_sent_at     = case when v_to.role = 'driver' then now() else driver_sent_at end,
         driver_sent_by     = case when v_to.role = 'driver' then v_caller else driver_sent_by end
   where id = p_dn_id
   returning * into v_dn;

  insert into dn_workflow_log (
    delivery_note_id, from_status, to_status, assigned_to,
    holder_from, to_role, action, note, actor
  ) values (
    p_dn_id, v_from_status, v_new_status, v_to.id,
    v_from_holder, v_to.role, v_action, p_note, v_caller
  );

  return v_dn;
end
$fn$;

revoke all on function hand_over_delivery_note(uuid, uuid, text) from public, anon;
grant execute on function hand_over_delivery_note(uuid, uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 4. The driver confirms the slip reached them (D38)
--
-- Without this the record only says a slip was sent. "I never got it" is
-- exactly the dispute this is here to settle.
-- ---------------------------------------------------------------------

create or replace function acknowledge_delivery_note(p_dn_id uuid)
returns delivery_notes
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_dn delivery_notes;
begin
  select * into v_dn from delivery_notes where id = p_dn_id for update;
  if not found then
    raise exception 'Delivery note not found.';
  end if;

  if v_dn.holder_id is distinct from auth.uid() then
    raise exception 'Delivery note % is not with you.', v_dn.dn_number;
  end if;
  if v_dn.acknowledged_at is not null then
    raise exception 'Delivery note % was already confirmed.', v_dn.dn_number;
  end if;

  update delivery_notes set acknowledged_at = now()
   where id = p_dn_id returning * into v_dn;

  insert into dn_workflow_log (
    delivery_note_id, from_status, to_status, assigned_to,
    holder_from, to_role, action, actor
  ) values (
    p_dn_id, v_dn.workflow_status, v_dn.workflow_status, v_dn.holder_id,
    v_dn.holder_id, v_dn.holder_role, 'acknowledge', auth.uid()
  );

  return v_dn;
end
$fn$;

revoke all on function acknowledge_delivery_note(uuid) from public, anon;
grant execute on function acknowledge_delivery_note(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 5. The old entry points now go through the new one
--
-- `send_dn_to_gm` stays because the screen hands over a whole day's slips
-- at once. `send_dn_to_driver` is dropped: it carried a stamped-PDF
-- parameter from before stamping was removed (D25), and everything it did
-- now belongs to hand_over_delivery_note.
-- ---------------------------------------------------------------------

drop function if exists send_dn_to_driver(uuid, uuid, text, text);

create or replace function send_dn_to_gm(
  p_dn_ids uuid[],
  p_gm_id  uuid default null,
  p_note   text default null
)
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_gm    uuid := p_gm_id;
  v_count integer := 0;
  v_id    uuid;
begin
  if p_dn_ids is null or array_length(p_dn_ids, 1) is null then
    raise exception 'Select at least one delivery note to send.';
  end if;

  if v_gm is null then
    select id into v_gm from user_tbl where is_gm and is_active order by account_created_at limit 1;
    if v_gm is null then
      raise exception 'No active GM exists to send these slips to.';
    end if;
  end if;

  foreach v_id in array p_dn_ids loop
    perform hand_over_delivery_note(v_id, v_gm, p_note);
    v_count := v_count + 1;
  end loop;

  return v_count;
end
$$;

revoke all on function send_dn_to_gm(uuid[], uuid, text) from public, anon;
grant execute on function send_dn_to_gm(uuid[], uuid, text) to authenticated;

-- The warehouse is a recipient now, so the picker has to be able to list it.
-- The extra `role` column changes the return type, which `create or replace`
-- cannot do: the old function is dropped first.
drop function if exists list_recipients(text);

create function list_recipients(p_kind text)
returns table (id uuid, full_name text, email text, role user_role)
language sql
stable
security definer
set search_path = public, private
as $$
  select u.id,
         btrim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')),
         u.email,
         u.role
    from user_tbl u
   where u.is_active
     and private.current_user_role() is not null
     and case p_kind
           when 'gm'        then u.is_gm
           when 'driver'    then u.is_driver
           when 'warehouse' then u.is_warehouse
           -- Everyone a slip can be handed to, for one picker.
           when 'holder'    then (u.is_gm or u.is_driver or u.is_warehouse)
           else false
         end
   order by u.role, 2
$$;

revoke all on function list_recipients(text) from public, anon;
grant execute on function list_recipients(text) to authenticated;


-- ---------------------------------------------------------------------
-- 6. Custody ends when the count is done
--
-- `receive_delivery_note_line` sets the note to `received` once every line
-- is counted. Clearing the holder there would mean rewriting that whole
-- function; a trigger keeps the rule in one place and also covers any
-- other path that ends a slip's journey.
-- ---------------------------------------------------------------------

create or replace function private.clear_holder_when_closed()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if new.workflow_status in ('received', 'rejected')
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

create trigger delivery_notes_clear_holder
  before update on delivery_notes
  for each row execute function private.clear_holder_when_closed();


-- ---------------------------------------------------------------------
-- 7. The audit the admin and the GM asked for
--
-- "Which driver did the warehouse give this to?" answered by reading, not
-- by joining four tables on a screen.
-- ---------------------------------------------------------------------

-- This view resolves names, and `user_tbl` only lets you read yourself
-- unless you are the CEO, a GM or a manager. The admin files the slips and
-- is one of the two people who asked for this trail, so an invoker view
-- would show them a column of blanks where the names belong.
--
-- It therefore runs as its owner, and carries its own gate instead: the
-- `where` clause below is what RLS would have done, and it is the only way
-- into these rows.
create or replace view v_slip_custody as
  select l.id,
         l.created_at,
         l.delivery_note_id,
         d.dn_number,
         d.so_number,
         l.action,
         l.from_status,
         l.to_status,
         l.note,
         l.actor          as actor_id,
         btrim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')) as actor_name,
         a.role           as actor_role,
         l.holder_from    as from_id,
         btrim(coalesce(f.first_name, '') || ' ' || coalesce(f.last_name, '')) as from_name,
         f.role           as from_role,
         l.assigned_to    as to_id,
         btrim(coalesce(t.first_name, '') || ' ' || coalesce(t.last_name, '')) as to_name,
         l.to_role
    from dn_workflow_log l
    join delivery_notes d on d.id = l.delivery_note_id
    left join user_tbl a on a.id = l.actor
    left join user_tbl f on f.id = l.holder_from
    left join user_tbl t on t.id = l.assigned_to
   where private.has_role('ceo', 'gm', 'manager', 'admin');

-- Deliberately NOT security_invoker: see the note above. The gate in the
-- `where` clause is what keeps everybody else out.
alter view v_slip_custody set (security_invoker = off);

revoke all on v_slip_custody from anon;
grant select on v_slip_custody to authenticated;
