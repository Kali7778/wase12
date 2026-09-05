-- =====================================================================
--  LogiFlow — Phase 1 (part 10): workflow functions
--
--  send_dn_to_gm()        hand one or more slips to the GM (atomic)
--  decide_dn()            GM approves or rejects a slip
--  check_dn_duplicates()  has this file or DN number been uploaded before?
--
--  Run after 0009.
-- =====================================================================

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
  v_dn    record;
begin
  if not has_role('admin', 'manager', 'gm', 'ceo') then
    raise exception 'Permission denied: only an admin or above can send slips to the GM.';
  end if;

  if p_dn_ids is null or array_length(p_dn_ids, 1) is null then
    raise exception 'Select at least one delivery note to send.';
  end if;

  -- Default to the single GM when the caller did not name one.
  if v_gm is null then
    select id into v_gm from user_tbl where is_gm and is_active order by account_created_at limit 1;
    if v_gm is null then
      raise exception 'No active GM exists to send these slips to.';
    end if;
  elsif not exists (select 1 from user_tbl where id = v_gm and is_gm and is_active) then
    raise exception 'The selected recipient is not an active GM.';
  end if;

  for v_dn in
    select id, workflow_status, dn_number
      from delivery_notes
     where id = any(p_dn_ids)
     for update
  loop
    if v_dn.workflow_status <> 'draft' then
      raise exception 'Delivery note % has already been sent (status: %).',
        v_dn.dn_number, v_dn.workflow_status;
    end if;

    update delivery_notes
       set workflow_status = 'sent_to_gm',
           assigned_to     = v_gm,
           sent_at         = now(),
           sent_by         = auth.uid()
     where id = v_dn.id;

    insert into dn_workflow_log (delivery_note_id, from_status, to_status, assigned_to, note, actor)
    values (v_dn.id, v_dn.workflow_status, 'sent_to_gm', v_gm, p_note, auth.uid());

    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'None of the selected delivery notes were found.';
  end if;

  return v_count;
end
$$;

create or replace function decide_dn(
  p_dn_id   uuid,
  p_approve boolean,
  p_note    text default null
)
returns delivery_notes
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_dn  delivery_notes;
  v_new dn_workflow_status;
begin
  if not has_role('gm', 'ceo') then
    raise exception 'Permission denied: only the GM or a superadmin can approve or reject a slip.';
  end if;

  select * into v_dn from delivery_notes where id = p_dn_id for update;
  if not found then
    raise exception 'Delivery note not found: %', p_dn_id;
  end if;

  if v_dn.workflow_status <> 'sent_to_gm' then
    raise exception 'Delivery note % is not awaiting a decision (status: %).',
      v_dn.dn_number, v_dn.workflow_status;
  end if;

  if not p_approve and coalesce(btrim(p_note), '') = '' then
    raise exception 'A reason is required when rejecting a slip.';
  end if;

  v_new := case when p_approve then 'gm_approved'::dn_workflow_status
                else 'rejected'::dn_workflow_status end;

  update delivery_notes set workflow_status = v_new
   where id = p_dn_id returning * into v_dn;

  insert into dn_workflow_log (delivery_note_id, from_status, to_status, assigned_to, note, actor)
  values (p_dn_id, 'sent_to_gm', v_new, v_dn.assigned_to, p_note, auth.uid());

  return v_dn;
end
$$;

-- Duplicate guard. The same slip WILL be uploaded twice sooner or later;
-- without this the stock would be counted twice.
create or replace function check_dn_duplicates(
  p_sha256     text[],
  p_dn_numbers text[]
)
returns table (
  dn_number       text,
  pdf_sha256      text,
  uploaded_at     timestamptz,
  workflow_status dn_workflow_status
)
language sql
stable
security definer
set search_path = public, private
as $$
  select d.dn_number, d.pdf_sha256, d.created_at, d.workflow_status
    from delivery_notes d
   where (p_sha256     is not null and d.pdf_sha256 = any(p_sha256))
      or (p_dn_numbers is not null and d.dn_number  = any(p_dn_numbers))
$$;

revoke all on function send_dn_to_gm(uuid[], uuid, text) from public, anon;
revoke all on function decide_dn(uuid, boolean, text) from public, anon;
revoke all on function check_dn_duplicates(text[], text[]) from public, anon;

grant execute on function send_dn_to_gm(uuid[], uuid, text) to authenticated;
grant execute on function decide_dn(uuid, boolean, text) to authenticated;
grant execute on function check_dn_duplicates(text[], text[]) to authenticated;
