-- =====================================================================
--  0039 — The employee ledger is for the staff who carry money and goods
--
--  The list showed every account, the superadmin included, and the GM
--  asked why. A ledger is kept for the people who handle cash and stock
--  on the road: drivers and warehouse keepers (D89). Office accounts do
--  not belong on it.
--
--  Two halves, so that the rule cannot be dodged and cannot hide money:
--
--    * a new entry is refused for anybody else, in the function — the
--      list alone would not stop an entry written through the API;
--
--    * the list still shows anybody who already has entries, whatever
--      their role is today. A driver promoted to the office must not
--      take an unpaid balance out of sight with him.
-- =====================================================================


create or replace function add_employee_entry(
  p_employee_id    uuid,
  p_kind           employee_ledger_kind,
  p_amount         numeric,
  p_description    text,
  p_remarks        text           default null,
  p_occurred_on    date           default null,
  p_violation_type violation_type default null
)
returns employee_ledger
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_employee user_tbl;
  v_row      employee_ledger;
begin
  if not has_role('gm', 'ceo') then
    raise exception 'Permission denied: only the GM or a superadmin can write in an employee ledger.';
  end if;
  -- A shortfall is never typed in: it is what a collection left behind.
  if p_kind = 'shortfall' then
    raise exception 'A shortfall is recorded when the money is taken in, not by hand.';
  end if;

  select * into v_employee from user_tbl where id = p_employee_id;
  if not found then
    raise exception 'That employee does not exist.';
  end if;
  if v_employee.role not in ('driver', 'warehouse') then
    raise exception 'A ledger is kept for drivers and warehouse keepers only.';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'An amount must be more than zero, with at most two decimals.';
  end if;
  if nullif(btrim(coalesce(p_description, '')), '') is null then
    raise exception 'Say what this entry is for.';
  end if;
  if p_occurred_on is not null and p_occurred_on > (now() at time zone 'Asia/Riyadh')::date then
    raise exception 'That date is in the future.';
  end if;

  if p_kind = 'fine' and p_violation_type is null then
    raise exception 'Say which rule the fine is for.';
  end if;
  if p_kind <> 'fine' and p_violation_type is not null then
    raise exception 'A violation type belongs on a fine only.';
  end if;

  insert into employee_ledger (employee_id, kind, amount, occurred_on, description, remarks,
                               violation_type, created_by)
  values (p_employee_id, p_kind, p_amount,
          coalesce(p_occurred_on, (now() at time zone 'Asia/Riyadh')::date),
          btrim(p_description), nullif(btrim(coalesce(p_remarks, '')), ''),
          p_violation_type, auth.uid())
  returning * into v_row;

  return v_row;
end
$fn$;


create or replace view v_employee_balances as
  select u.id                                           as employee_id,
         btrim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) as employee_name,
         u.email,
         u.is_active,
         coalesce(l.owed, 0)                            as owed,
         coalesce(l.settled, 0)                         as settled,
         coalesce(l.owed, 0) - coalesce(l.settled, 0)   as balance,
         l.last_entry_on
    from user_tbl u
    left join lateral (
      select sum(e.amount) filter (where private.ledger_sign(e.kind) = 1)  as owed,
             sum(e.amount) filter (where private.ledger_sign(e.kind) = -1) as settled,
             max(e.occurred_on)                                            as last_entry_on
        from employee_ledger e
       where e.employee_id = u.id
    ) l on true
   where (select private.has_role('gm', 'ceo'))
     -- Field staff, plus anybody who already has a line on the ledger.
     and (u.role in ('driver', 'warehouse') or l.last_entry_on is not null);

alter view v_employee_balances set (security_invoker = off);
revoke all on v_employee_balances from anon;
grant select on v_employee_balances to authenticated;
