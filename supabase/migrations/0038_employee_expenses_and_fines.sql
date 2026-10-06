-- =====================================================================
--  0038 — Expenses and fines in the employee ledger (D87, D88)
--
--  The GM records two more things by hand:
--
--    expense  what the employee spent on the company's work — a meal on
--             the road, a parking ticket, tea for the loaders. The client
--             wants it on the employee's side of the ledger, not the
--             company's: it adds to what he owes and comes off the next
--             salary like a shortfall does (D87).
--
--    fine     a penalty, which has to say which rule was broken. The
--             reason is not free text buried in a sentence — it is a
--             value, so that "how many traffic tickets this quarter" is
--             a question the database can answer (D88).
--
--  Both sit in the same append-only ledger as everything else. Nothing
--  here can be edited afterwards; a wrong fine is answered with a
--  repayment entry, and the pair stays on the record.
-- =====================================================================


-- What a fine is for. 'other' exists so that an unusual case is still
-- recorded rather than squeezed into the nearest wrong box; the
-- description carries the detail.
create type violation_type as enum (
  'late_arrival',
  'unauthorised_absence',
  'traffic_ticket',
  'cash_mishandling',
  'goods_damaged',
  'vehicle_damage',
  'safety_violation',
  'other'
);


alter table employee_ledger add column violation_type violation_type;

-- A violation belongs to a fine and to nothing else: a meal with a
-- violation type, or a fine without one, is a mistake worth refusing.
alter table employee_ledger
  add constraint violation_belongs_to_a_fine check (
    (violation_type is not null) = (kind = 'fine')
  );

comment on column employee_ledger.violation_type is
  'Which rule was broken. Set on a fine, null on everything else.';


-- ---------------------------------------------------------------------
-- Which way the two new kinds move the balance
--
-- Both add to what the employee owes (D87). Note the search_path: a
-- create-or-replace drops the SET clause 0036 added, so it is written
-- out again here.
-- ---------------------------------------------------------------------

create or replace function private.ledger_sign(p_kind employee_ledger_kind)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_kind
           when 'shortfall' then 1
           when 'charge'    then 1
           when 'expense'   then 1
           when 'fine'      then 1
           else -1
         end;
$$;


-- ---------------------------------------------------------------------
-- The GM's entry, now with a violation type
-- ---------------------------------------------------------------------

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

revoke all on function add_employee_entry(uuid, employee_ledger_kind, numeric, text, text, date, violation_type)
  from public, anon;
grant execute on function add_employee_entry(uuid, employee_ledger_kind, numeric, text, text, date, violation_type)
  to authenticated;

-- The six-argument shape would now be ambiguous with the one above when
-- PostgREST passes six named arguments, so it goes.
drop function if exists add_employee_entry(uuid, employee_ledger_kind, numeric, text, text, date);


-- ---------------------------------------------------------------------
-- Reading it back
--
-- `violation_type` belongs beside `kind`, which create-or-replace cannot
-- do, so the view is written again. It holds no data of its own.
-- ---------------------------------------------------------------------

drop view if exists v_employee_ledger;

create view v_employee_ledger as
  select l.id,
         l.employee_id,
         btrim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) as employee_name,
         l.occurred_on,
         l.created_at,
         l.kind,
         l.violation_type,
         l.description,
         l.remarks,
         l.amount,
         private.ledger_sign(l.kind) * l.amount as signed_amount,
         l.bill_id,
         b.bill_number,
         l.collection_id,
         nullif(btrim(coalesce(cu.first_name, '') || ' ' || coalesce(cu.last_name, '')), '')
           as created_by_name,
         sum(private.ledger_sign(l.kind) * l.amount) over (
           partition by l.employee_id
           order by l.occurred_on, l.created_at
           rows between unbounded preceding and current row
         ) as balance
    from employee_ledger l
    left join user_tbl u on u.id = l.employee_id
    left join user_tbl cu on cu.id = l.created_by
    left join bills b on b.id = l.bill_id
   where (select private.has_role('gm', 'ceo'));

alter view v_employee_ledger set (security_invoker = off);
revoke all on v_employee_ledger from anon;
grant select on v_employee_ledger to authenticated;
