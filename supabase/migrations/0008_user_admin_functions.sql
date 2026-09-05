-- =====================================================================
--  LogiFlow — Phase 1 (part 8): user administration functions
--
--  create_app_user()    create a user with a password and one role flag
--  set_user_password()  change a password AND revoke existing sessions
--  set_user_flags()     change a user's role
--
--  Only a superadmin or GM may call these.
--
--  IMPORTANT — search_path includes `extensions`: Supabase installs pgcrypto
--  into the `extensions` schema, so crypt() and gen_salt() are unreachable
--  without it. Leaving it out fails at runtime with
--  "function gen_salt(unknown) does not exist".
--
--  Run after 0007.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Create a user
--
--    Two traps when creating auth users directly in SQL:
--      a) an auth.identities row is required for email sign-in
--      b) GoTrue reads the token columns into non-nullable Go strings, so
--         they must be '' and never NULL — otherwise every sign-in fails
--         with "Database error querying schema"
-- ---------------------------------------------------------------------
create or replace function create_app_user(
  p_email         text,
  p_password      text,
  p_first_name    text,
  p_last_name     text default '',
  p_is_superadmin boolean default false,
  p_is_gm         boolean default false,
  p_is_admin      boolean default false,
  p_is_driver     boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth, extensions
as $$
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

  if (p_is_superadmin::int + p_is_gm::int + p_is_admin::int + p_is_driver::int) > 1 then
    raise exception 'A user can hold only one role.';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'A user with this email address already exists.';
  end if;

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
         is_driver     = p_is_driver
   where id = v_id;

  return v_id;
end
$$;


-- ---------------------------------------------------------------------
-- 2. Change a password
--
--    Equivalent to:
--      update auth.users set encrypted_password = crypt(pw, gen_salt('bf'))
--    plus revoking existing sessions, which a bare UPDATE does NOT do —
--    an already issued refresh token otherwise keeps working.
-- ---------------------------------------------------------------------
create or replace function set_user_password(
  p_email    text,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public, private, auth, extensions
as $$
declare
  v_id uuid;
begin
  if not has_role('ceo', 'gm') then
    raise exception 'Permission denied: only a superadmin or GM can change passwords.';
  end if;

  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Password must be at least 8 characters long.';
  end if;

  select id into v_id from auth.users where lower(email) = lower(btrim(p_email));
  if v_id is null then
    raise exception 'No user found with email %', p_email;
  end if;

  update auth.users
     set encrypted_password = crypt(p_password, gen_salt('bf')),
         updated_at = now()
   where id = v_id;

  delete from auth.refresh_tokens where user_id = v_id::text;
end
$$;


-- ---------------------------------------------------------------------
-- 3. Change a user's role
-- ---------------------------------------------------------------------
create or replace function set_user_flags(
  p_user_id       uuid,
  p_is_superadmin boolean default false,
  p_is_gm         boolean default false,
  p_is_admin      boolean default false,
  p_is_driver     boolean default false
)
returns user_tbl
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_row user_tbl;
begin
  if not has_role('ceo', 'gm') then
    raise exception 'Permission denied: only a superadmin or GM can change roles.';
  end if;

  if (p_is_superadmin::int + p_is_gm::int + p_is_admin::int + p_is_driver::int) > 1 then
    raise exception 'A user can hold only one role.';
  end if;

  if p_user_id = auth.uid() and not p_is_superadmin then
    raise exception 'You cannot remove your own superadmin role.';
  end if;

  update user_tbl
     set is_superadmin = p_is_superadmin,
         is_gm         = p_is_gm,
         is_admin      = p_is_admin,
         is_driver     = p_is_driver
   where id = p_user_id
   returning * into v_row;

  if not found then
    raise exception 'User not found: %', p_user_id;
  end if;

  return v_row;
end
$$;


-- ---------------------------------------------------------------------
-- 4. Grants — signed-in users only; each function checks the caller's role
-- ---------------------------------------------------------------------
revoke all on function create_app_user(text, text, text, text, boolean, boolean, boolean, boolean)
  from public, anon;
revoke all on function set_user_password(text, text) from public, anon;
revoke all on function set_user_flags(uuid, boolean, boolean, boolean, boolean) from public, anon;

grant execute on function create_app_user(text, text, text, text, boolean, boolean, boolean, boolean)
  to authenticated;
grant execute on function set_user_password(text, text) to authenticated;
grant execute on function set_user_flags(uuid, boolean, boolean, boolean, boolean) to authenticated;


-- ---------------------------------------------------------------------
-- 5. Bootstrapping the very first superadmin
--
--    create_app_user() requires an existing superadmin, so the first one has
--    to be inserted directly. Run this once in the SQL editor, with your own
--    email and password:
--
--    do $bootstrap$
--    declare v_id uuid := gen_random_uuid();
--    begin
--      insert into auth.users (
--        instance_id, id, aud, role, email, encrypted_password,
--        email_confirmed_at, created_at, updated_at,
--        raw_app_meta_data, raw_user_meta_data,
--        confirmation_token, recovery_token, email_change_token_new,
--        email_change, email_change_token_current,
--        phone_change, phone_change_token, reauthentication_token
--      ) values (
--        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
--        'you@example.com', extensions.crypt('YourPassword', extensions.gen_salt('bf')),
--        now(), now(), now(),
--        '{"provider":"email","providers":["email"]}'::jsonb,
--        '{"first_name":"Your","last_name":"Name"}'::jsonb,
--        '', '', '', '', '', '', '', ''
--      );
--      insert into auth.identities (
--        provider_id, user_id, identity_data, provider,
--        last_sign_in_at, created_at, updated_at
--      ) values (
--        v_id::text, v_id,
--        jsonb_build_object('sub', v_id::text, 'email', 'you@example.com',
--                           'email_verified', true, 'phone_verified', false),
--        'email', now(), now(), now()
--      );
--      update user_tbl set first_name = 'Your', last_name = 'Name',
--             email = 'you@example.com', is_superadmin = true
--       where id = v_id;
--    end $bootstrap$;
-- ---------------------------------------------------------------------
