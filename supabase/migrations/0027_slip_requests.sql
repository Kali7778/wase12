-- =====================================================================
--  0027 — Asking for a slip
--
--  Until now a slip only ever moved because the person holding it decided
--  to pass it on. The people waiting at the other end — the warehouse
--  keeper who needs the paperwork for a truck that is already loading, the
--  driver standing at the gate — had no way to ask except a phone call,
--  which leaves no record of who asked, for what, and whether anybody
--  answered.
--
--  Who asks whom (decisions D31, D40, D41):
--
--      warehouse -> the office   (admin AND the GM both see it; whoever
--                                 gets there first answers)
--      driver    -> the warehouse
--
--  A request carries one of four kinds and a message. Turning one down
--  needs no reason — a reason is welcome, not required — but the person
--  who asked is told either way (D31).
--
--  Run after 0026.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. What is being asked, and of whom
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'slip_request_type') then
    create type slip_request_type as enum (
      'slip_for_delivery',  -- "send me the slip for the load I am about to move"
      'lost_slip',          -- the sheet is gone
      'damaged_slip',       -- the sheet is unreadable
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'slip_request_target') then
    -- Not a role: "the office" is the admin and the GM together, because
    -- either of them can answer and neither should have to wait (D40).
    create type slip_request_target as enum ('office', 'warehouse');
  end if;
end $$;


create table slip_requests (
  id                uuid primary key default gen_random_uuid(),
  request_type      slip_request_type not null,
  message           text,

  -- Set when the request is about one particular slip.
  delivery_note_id  uuid references delivery_notes(id),

  requested_by      uuid not null references user_tbl(id),
  requested_by_role user_role not null,
  target            slip_request_target not null,

  status            text not null default 'pending'
                    check (status in ('pending', 'fulfilled', 'declined', 'cancelled')),

  decided_by        uuid references user_tbl(id),
  decided_at        timestamptz,
  -- Optional when declining (D31); this is also where a note about how a
  -- request was answered goes.
  decision_note     text,
  -- The slip that was handed over in answer, when there was one.
  fulfilled_dn_id   uuid references delivery_notes(id),

  created_at        timestamptz not null default now(),

  constraint other_needs_a_message check (
    request_type <> 'other' or coalesce(btrim(message), '') <> ''
  ),
  constraint decision_is_complete check (
    (status = 'pending' and decided_by is null and decided_at is null)
    or (status <> 'pending' and decided_by is not null and decided_at is not null)
  )
);

comment on table slip_requests is
  'Somebody asking for a slip: the warehouse asking the office, or a driver asking the warehouse.';

-- The inbox is the hot query, and it only ever holds what is unanswered.
create index slip_requests_open_idx
  on slip_requests (target, created_at desc)
  where status = 'pending';

create index slip_requests_mine_idx
  on slip_requests (requested_by, created_at desc);

alter table slip_requests enable row level security;

-- You can see what you asked for, and what is being asked of you.
create policy slip_requests_read on slip_requests
  for select to authenticated
  using (
    requested_by = (select auth.uid())
    or (target = 'office'    and (select private.has_role('admin', 'manager', 'gm', 'ceo')))
    or (target = 'warehouse' and (select private.has_role('warehouse', 'gm', 'ceo', 'admin')))
  );

-- Everything is written through the functions below, which check more
-- than a policy can.
revoke insert, update, delete on slip_requests from authenticated;


-- ---------------------------------------------------------------------
-- 2. Asking
-- ---------------------------------------------------------------------

create or replace function create_slip_request(
  p_request_type     slip_request_type,
  p_message          text default null,
  p_delivery_note_id uuid default null
)
returns slip_requests
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_role   user_role := private.current_user_role();
  v_target slip_request_target;
  v_row    slip_requests;
begin
  if v_role is null then
    raise exception 'Permission denied: sign in to ask for a slip.';
  end if;

  v_target := case v_role
                when 'warehouse' then 'office'::slip_request_target
                when 'driver'    then 'warehouse'::slip_request_target
              end;

  if v_target is null then
    raise exception
      'Only the warehouse or a driver can ask for a slip; the % hands them out.', v_role;
  end if;

  if p_request_type = 'other' and coalesce(btrim(p_message), '') = '' then
    raise exception 'Say what you need when choosing "Other".';
  end if;

  if p_delivery_note_id is not null
     and not exists (select 1 from delivery_notes where id = p_delivery_note_id) then
    raise exception 'That delivery note does not exist.';
  end if;

  -- Asking twice for the same thing does not make it arrive sooner, and it
  -- buries the first one in whoever's list.
  if exists (
    select 1 from slip_requests
     where requested_by = auth.uid()
       and status = 'pending'
       and request_type = p_request_type
       and delivery_note_id is not distinct from p_delivery_note_id
  ) then
    raise exception 'You have already asked for this, and nobody has answered yet.';
  end if;

  insert into slip_requests (
    request_type, message, delivery_note_id, requested_by, requested_by_role, target
  ) values (
    p_request_type, nullif(btrim(p_message), ''), p_delivery_note_id, auth.uid(), v_role, v_target
  )
  returning * into v_row;

  return v_row;
end
$fn$;

revoke all on function create_slip_request(slip_request_type, text, uuid) from public, anon;
grant execute on function create_slip_request(slip_request_type, text, uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 3. Answering
--
-- `private.may_answer()` is the one place that says who a request is
-- addressed to, so the three functions below cannot drift apart.
-- ---------------------------------------------------------------------

create or replace function private.may_answer(p_target slip_request_target)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select case p_target
           when 'office'    then private.has_role('admin', 'manager', 'gm', 'ceo')
           when 'warehouse' then private.has_role('warehouse', 'gm', 'ceo', 'admin')
         end
$$;

revoke all on function private.may_answer(slip_request_target) from public, anon;
grant execute on function private.may_answer(slip_request_target) to authenticated;


/*
 * Answering by handing the slip over.
 *
 * The handover itself goes through hand_over_delivery_note(), so the rules
 * about who may give what to whom (0023) apply here exactly as they do
 * anywhere else. Answering a request is not a way around them.
 */
create or replace function fulfil_slip_request(
  p_request_id uuid,
  p_dn_id      uuid default null,
  p_note       text default null
)
returns slip_requests
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_row slip_requests;
begin
  select * into v_row from slip_requests where id = p_request_id for update;
  if not found then
    raise exception 'That request does not exist.';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'That request was already %.', v_row.status;
  end if;
  if not private.may_answer(v_row.target) then
    raise exception 'Permission denied: that request is not addressed to you.';
  end if;

  if p_dn_id is not null then
    perform hand_over_delivery_note(
      p_dn_id,
      v_row.requested_by,
      coalesce(nullif(btrim(p_note), ''), 'Asked for it')
    );
  end if;

  update slip_requests
     set status = 'fulfilled', decided_by = auth.uid(), decided_at = now(),
         decision_note = nullif(btrim(p_note), ''), fulfilled_dn_id = p_dn_id
   where id = p_request_id
   returning * into v_row;

  return v_row;
end
$fn$;

revoke all on function fulfil_slip_request(uuid, uuid, text) from public, anon;
grant execute on function fulfil_slip_request(uuid, uuid, text) to authenticated;


-- Turning one down. A reason is optional (D31) — what is not optional is
-- that the person who asked finds out.
create or replace function decline_slip_request(p_request_id uuid, p_reason text default null)
returns slip_requests
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_row slip_requests;
begin
  select * into v_row from slip_requests where id = p_request_id for update;
  if not found then
    raise exception 'That request does not exist.';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'That request was already %.', v_row.status;
  end if;
  if not private.may_answer(v_row.target) then
    raise exception 'Permission denied: that request is not addressed to you.';
  end if;

  update slip_requests
     set status = 'declined', decided_by = auth.uid(), decided_at = now(),
         decision_note = nullif(btrim(p_reason), '')
   where id = p_request_id
   returning * into v_row;

  return v_row;
end
$fn$;

revoke all on function decline_slip_request(uuid, text) from public, anon;
grant execute on function decline_slip_request(uuid, text) to authenticated;


-- Withdrawing your own. The truck left, or somebody handed it over in
-- person; either way the list should not keep showing it.
create or replace function cancel_slip_request(p_request_id uuid)
returns slip_requests
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_row slip_requests;
begin
  select * into v_row from slip_requests where id = p_request_id for update;
  if not found then
    raise exception 'That request does not exist.';
  end if;
  if v_row.requested_by <> auth.uid() then
    raise exception 'Only the person who asked can withdraw a request.';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'That request was already %.', v_row.status;
  end if;

  update slip_requests
     set status = 'cancelled', decided_by = auth.uid(), decided_at = now()
   where id = p_request_id
   returning * into v_row;

  return v_row;
end
$fn$;

revoke all on function cancel_slip_request(uuid) from public, anon;
grant execute on function cancel_slip_request(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 4. The list every screen reads
--
-- Names again, and `user_tbl` hides other people from the admin and the
-- warehouse. So this view runs as its owner and carries the same rule the
-- table's policy does — see the note on v_slip_custody in 0023.
-- ---------------------------------------------------------------------

create or replace view v_slip_requests as
  select r.id,
         r.created_at,
         r.request_type,
         r.message,
         r.status,
         r.target,
         r.delivery_note_id,
         d.dn_number,
         r.fulfilled_dn_id,
         f.dn_number       as fulfilled_dn_number,
         r.requested_by,
         btrim(coalesce(q.first_name, '') || ' ' || coalesce(q.last_name, '')) as requested_by_name,
         r.requested_by_role,
         r.decided_by,
         btrim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')) as decided_by_name,
         r.decided_at,
         r.decision_note
    from slip_requests r
    left join delivery_notes d on d.id = r.delivery_note_id
    left join delivery_notes f on f.id = r.fulfilled_dn_id
    left join user_tbl q on q.id = r.requested_by
    left join user_tbl a on a.id = r.decided_by
   where r.requested_by = auth.uid()
      or private.may_answer(r.target);

alter view v_slip_requests set (security_invoker = off);

revoke all on v_slip_requests from anon;
grant select on v_slip_requests to authenticated;
