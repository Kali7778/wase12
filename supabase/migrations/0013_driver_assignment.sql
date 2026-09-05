-- =====================================================================
--  LogiFlow — Phase 1 (part 13): driver assignment + approval stamp
--
--  The supplier's original PDF is evidence and is never modified. The
--  stamped copy handed to the driver is stored alongside it, so it stays
--  possible to show what the supplier actually sent.
--
--  Run after 0012.
-- =====================================================================

alter table delivery_notes
  add column assigned_driver_id uuid references user_tbl(id),
  add column driver_sent_at     timestamptz,
  add column driver_sent_by     uuid references user_tbl(id),
  add column stamped_pdf_path   text;

create index on delivery_notes (assigned_driver_id);

comment on column delivery_notes.stamped_pdf_path is
  'Copy of the delivery note carrying the GM approval stamp. pdf_storage_path keeps the untouched original.';
comment on column delivery_notes.assigned_driver_id is
  'Driver the GM handed this slip to. Set only through send_dn_to_driver().';

-- GM hands an approved slip to a named driver.
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
  v_dn delivery_notes;
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

  update delivery_notes
     set workflow_status    = 'sent_to_driver',
         assigned_driver_id = p_driver_id,
         driver_sent_at     = now(),
         driver_sent_by     = auth.uid(),
         stamped_pdf_path   = coalesce(p_stamped_pdf_path, stamped_pdf_path)
   where id = p_dn_id
   returning * into v_dn;

  insert into dn_workflow_log (delivery_note_id, from_status, to_status, assigned_to, note, actor)
  values (p_dn_id, v_dn.workflow_status, 'sent_to_driver', p_driver_id, p_note, auth.uid());

  return v_dn;
end
$$;

revoke all on function send_dn_to_driver(uuid, uuid, text, text) from public, anon;
grant execute on function send_dn_to_driver(uuid, uuid, text, text) to authenticated;

-- Who a slip may be handed to. The pickers and the handover record read from
-- here rather than querying user_tbl directly.
create or replace function list_recipients(p_kind text)
returns table (id uuid, full_name text, email text)
language sql
stable
security definer
set search_path = public, private
as $$
  select u.id,
         btrim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')),
         u.email
    from user_tbl u
   where u.is_active
     and private.current_user_role() is not null
     and ((p_kind = 'gm' and u.is_gm) or (p_kind = 'driver' and u.is_driver))
   order by 2
$$;

revoke all on function list_recipients(text) from public, anon;
grant execute on function list_recipients(text) to authenticated;
