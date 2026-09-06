-- =====================================================================
--  0014 — Warehouse keeper role
--
--  Arrival counting needs an owner. Until now the only flags were
--  superadmin / GM / admin / driver, so nobody could confirm an arrival
--  except the GM — and the `warehouse` value in the user_role enum was
--  unreachable.
--
--  The driver is deliberately NOT given this power. Whoever carried the
--  goods must not be the one who counts them, or a shortage can never be
--  detected: the same person would be reporting it. Carrying and counting
--  stay in different hands.
--
--  Run after 0013.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. The flag
--    `warehouse` already exists in the user_role enum (0001), so no
--    ALTER TYPE is needed and this migration stays in one transaction.
-- ---------------------------------------------------------------------
alter table user_tbl
  add column if not exists is_warehouse boolean not null default false;

comment on column user_tbl.is_warehouse is
  'Warehouse keeper: counts goods on arrival and confirms the received quantity.';


-- ---------------------------------------------------------------------
-- 2. Still exactly one role per person
-- ---------------------------------------------------------------------
alter table user_tbl drop constraint if exists user_tbl_single_role_flag;
alter table user_tbl add constraint user_tbl_single_role_flag check (
  (is_superadmin::int + is_gm::int + is_admin::int + is_driver::int + is_warehouse::int) <= 1
);


-- ---------------------------------------------------------------------
-- 3. Flags drive the role column
-- ---------------------------------------------------------------------
create or replace function sync_user_role()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  new.role := case
                when new.is_superadmin then 'ceo'::user_role
                when new.is_gm         then 'gm'::user_role
                when new.is_admin      then 'admin'::user_role
                when new.is_warehouse  then 'warehouse'::user_role
                when new.is_driver     then 'driver'::user_role
                else 'viewer'::user_role
              end;
  return new;
end
$fn$;

revoke all on function sync_user_role() from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 4. The user administration functions carry the new flag
--
--    The signature changes, so the old ones are dropped rather than
--    replaced: an extra defaulted argument would leave two overloads
--    behind and PostgREST could not tell them apart.
-- ---------------------------------------------------------------------
drop function if exists create_app_user(text, text, text, text, boolean, boolean, boolean, boolean);
drop function if exists set_user_flags(uuid, boolean, boolean, boolean, boolean);


create function create_app_user(
  p_email         text,
  p_password      text,
  p_first_name    text,
  p_last_name     text default '',
  p_is_superadmin boolean default false,
  p_is_gm         boolean default false,
  p_is_admin      boolean default false,
  p_is_driver     boolean default false,
  p_is_warehouse  boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth, extensions
as $fn$
declare
  v_id    uuid := gen_random_uuid();
  v_email text := lower(btrim(p_email));
begin
  if not has_role('ceo', 'gm') then
    raise exception 'Permission denied: only a superadmin or GM can create users.';
  end if;

  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'A valid email address is required.';
  end if;

  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Password must be at least 8 characters long.';
  end if;

  if (p_is_superadmin::int + p_is_gm::int + p_is_admin::int
      + p_is_driver::int + p_is_warehouse::int) > 1 then
    raise exception 'A user can hold only one role.';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'A user with this email address already exists.';
  end if;

  -- GoTrue reads the token columns into non-nullable Go strings, so they
  -- must be '' and never NULL, otherwise every sign-in fails with
  -- "Database error querying schema".
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name),
    '', '', '', '', '', '', '', ''
  );

  -- An auth.identities row is required for email sign-in.
  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    v_id::text, v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_email,
                       'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );

  -- handle_new_user has already inserted the row; apply names and flags.
  update user_tbl
     set first_name    = p_first_name,
         last_name     = p_last_name,
         email         = v_email,
         is_superadmin = p_is_superadmin,
         is_gm         = p_is_gm,
         is_admin      = p_is_admin,
         is_driver     = p_is_driver,
         is_warehouse  = p_is_warehouse
   where id = v_id;

  return v_id;
end
$fn$;


create function set_user_flags(
  p_user_id       uuid,
  p_is_superadmin boolean default false,
  p_is_gm         boolean default false,
  p_is_admin      boolean default false,
  p_is_driver     boolean default false,
  p_is_warehouse  boolean default false
)
returns user_tbl
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_row user_tbl;
begin
  if not has_role('ceo', 'gm') then
    raise exception 'Permission denied: only a superadmin or GM can change roles.';
  end if;

  if (p_is_superadmin::int + p_is_gm::int + p_is_admin::int
      + p_is_driver::int + p_is_warehouse::int) > 1 then
    raise exception 'A user can hold only one role.';
  end if;

  if p_user_id = auth.uid() and not p_is_superadmin then
    raise exception 'You cannot remove your own superadmin role.';
  end if;

  update user_tbl
     set is_superadmin = p_is_superadmin,
         is_gm         = p_is_gm,
         is_admin      = p_is_admin,
         is_driver     = p_is_driver,
         is_warehouse  = p_is_warehouse
   where id = p_user_id
   returning * into v_row;

  if not found then
    raise exception 'User not found: %', p_user_id;
  end if;

  return v_row;
end
$fn$;


-- ---------------------------------------------------------------------
-- 5. Grants — Postgres grants EXECUTE to PUBLIC by default, so the
--    revoke is what actually closes the door. The grant alone does not.
-- ---------------------------------------------------------------------
revoke all on function create_app_user(text, text, text, text, boolean, boolean, boolean, boolean, boolean)
  from public, anon;
revoke all on function set_user_flags(uuid, boolean, boolean, boolean, boolean, boolean)
  from public, anon;

grant execute on function create_app_user(text, text, text, text, boolean, boolean, boolean, boolean, boolean)
  to authenticated;
grant execute on function set_user_flags(uuid, boolean, boolean, boolean, boolean, boolean)
  to authenticated;
