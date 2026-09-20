-- =====================================================================
--  0026 — What happened to the slips today
--
--  The intake screen has always said how many slips came in on a given
--  day. Nobody could see the other half: how many went out. The client
--  asked for it per person — the admin's own dashboard shows what the
--  admin passed on, the GM's shows the GM's (decision D36).
--
--  Two details decide whether these numbers are true:
--
--    * A day is a day in Jeddah, not in UTC (D44). The server runs in
--      UTC, so a slip handed over at 1am Riyadh would otherwise be
--      counted against yesterday.
--    * Slips are counted, not handovers (D44). A slip that went out,
--      came back and went out again is one slip out, not two.
--
--  Run after 0025.
-- =====================================================================

-- Counting a date range over the intake means reading it by date.
create index if not exists delivery_notes_created_idx
  on delivery_notes (created_at desc);


create or replace function daily_slip_counts(p_days integer default 14)
returns table (
  day           date,
  uploaded      integer,
  sent_by_me    integer,
  out_to_driver integer,
  received      integer,
  reissued      integer
)
language sql
stable
security definer
set search_path = public, private
as $$
  with window_days as (
    -- At most two months: this feeds a strip on a dashboard, not a report.
    select greatest(least(coalesce(p_days, 14), 60), 1) as days
  ),
  calendar as (
    select (((now() at time zone 'Asia/Riyadh')::date) - offset_days) as day
      from window_days, generate_series(0, (select days from window_days) - 1) as offset_days
  ),
  span as (
    -- Midnight in Jeddah on the first day of the window, as an instant.
    select (min(day)::timestamp at time zone 'Asia/Riyadh') as starts_at from calendar
  ),
  intake as (
    select ((d.created_at at time zone 'Asia/Riyadh')::date) as day,
           count(*) filter (where d.replaces_dn_id is null)     as uploaded,
           count(*) filter (where d.replaces_dn_id is not null) as reissued
      from delivery_notes d, span
     where d.created_at >= span.starts_at
     group by 1
  ),
  steps as (
    select ((l.created_at at time zone 'Asia/Riyadh')::date) as day,
           -- Slips, not steps: one slip sent out twice in a day is one.
           count(distinct l.delivery_note_id)
             filter (where l.actor = auth.uid()
                       and l.action in ('hand_over', 'reassign_driver')) as sent_by_me,
           count(distinct l.delivery_note_id)
             filter (where l.to_role = 'driver'
                       and l.action in ('hand_over', 'reassign_driver')) as out_to_driver,
           count(distinct l.delivery_note_id)
             filter (where l.action = 'receive')                         as received
      from dn_workflow_log l, span
     where l.created_at >= span.starts_at
     group by 1
  )
  select c.day,
         coalesce(i.uploaded, 0)::integer,
         coalesce(s.sent_by_me, 0)::integer,
         coalesce(s.out_to_driver, 0)::integer,
         coalesce(s.received, 0)::integer,
         coalesce(i.reissued, 0)::integer
    from calendar c
    left join intake i on i.day = c.day
    left join steps  s on s.day = c.day
   where private.has_role('ceo', 'gm', 'manager', 'admin', 'dispatcher')
   order by c.day desc
$$;

comment on function daily_slip_counts(integer) is
  'Per-day slip movement in Asia/Riyadh time. `sent_by_me` is the caller''s own.';

revoke all on function daily_slip_counts(integer) from public, anon;
grant execute on function daily_slip_counts(integer) to authenticated;
