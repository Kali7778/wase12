-- =====================================================================
--  LogiFlow — Phase 1 (part 7): user_tbl
--
--  Renames user_profiles to user_tbl and adds the requested columns.
--
--  Role flags are real columns. The `role` column is derived from them by a
--  trigger, so setting `is_admin = true` is all that is needed and every RLS
--  policy keeps working. A CHECK constraint prevents two flags being true.
--
--  Passwords remain in auth.users (bcrypt). They stay fully readable and
--  updatable over SQL; they are simply never exposed through the REST API.
--
--  Run after 0006.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Rename and extend
--    Renaming keeps every existing RLS policy attached to the table.
-- ---------------------------------------------------------------------
alter table user_profiles rename to user_tbl;

alter table user_tbl
  add column if not exists first_name    text,
  add column if not exists last_name     text,
  add column if not exists email         text,
  add column if not exists is_superadmin boolean not null default false,
  add column if not exists is_gm         boolean not null default false,
  add column if not exists is_admin      boolean not null default false,
  add column if not exists is_driver     boolean not null default false;

alter table user_tbl rename column created_at to account_created_at;
alter table user_tbl drop column if exists full_name;

create unique index if not exists user_tbl_email_key on user_tbl (lower(email));

comment on table user_tbl is
  'Application user record. Linked 1:1 to auth.users, which holds the bcrypt password.';
comment on column user_tbl.role is
  'Derived automatically from the is_* flags by the sync_user_role trigger. Do not set by hand.';


-- ---------------------------------------------------------------------
-- 2. Only one role flag may be true
-- ---------------------------------------------------------------------
alter table user_tbl drop constraint if exists user_tbl_single_role_flag;
alter table user_tbl add constraint user_tbl_single_role_flag check (
  (is_superadmin::int + is_gm::int + is_admin::int + is_driver::int) <= 1
);


-- ---------------------------------------------------------------------
-- 3. Flags drive the role column
-- ---------------------------------------------------------------------
create or replace function sync_user_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.role := case
                when new.is_superadmin then 'ceo'::user_role
                when new.is_gm         then 'gm'::user_role
                when new.is_admin      then 'admin'::user_role
                when new.is_driver     then 'driver'::user_role
                else 'viewer'::user_role
              end;
  return new;
end
$$;

drop trigger if exists user_tbl_sync_role on user_tbl;
create trigger user_tbl_sync_role
  before insert or update on user_tbl
  for each row execute function sync_user_role();

revoke all on function sync_user_role() from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 4. Point the RLS helper and the signup trigger at the renamed table
-- ---------------------------------------------------------------------
create or replace function private.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_tbl where id = auth.uid() and is_active
$$;

revoke all on function private.current_user_role() from public, anon;
grant execute on function private.current_user_role() to authenticated;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_tbl (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  )
  on conflict (id) do nothing;
  return new;
end
$$;

revoke all on function handle_new_user() from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 5. Policies — renamed for the new table, and 'admin' added where the
--    admin role needs write access (it uploads the delivery slips)
-- ---------------------------------------------------------------------
drop policy if exists up_select_self on user_tbl;
drop policy if exists up_admin_write on user_tbl;

create policy user_tbl_select on user_tbl
  for select to authenticated
  using (id = auth.uid() or private.has_role('ceo', 'gm', 'manager'));

create policy user_tbl_admin_write on user_tbl
  for all to authenticated
  using (private.has_role('ceo', 'gm'))
  with check (private.has_role('ceo', 'gm'));

drop policy if exists dn_insert on delivery_notes;
create policy dn_insert on delivery_notes
  for insert to authenticated
  with check (private.has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo'));

drop policy if exists dn_update on delivery_notes;
create policy dn_update on delivery_notes
  for update to authenticated
  using (private.has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo'))
  with check (private.has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo'));

drop policy if exists dnl_insert on delivery_note_lines;
create policy dnl_insert on delivery_note_lines
  for insert to authenticated
  with check (private.has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo'));

drop policy if exists "dn_pdf_insert" on storage.objects;
create policy "dn_pdf_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'delivery-notes'
    and private.has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo')
  );

drop policy if exists suppliers_write on suppliers;
create policy suppliers_write on suppliers
  for all to authenticated
  using (private.has_role('admin', 'manager', 'gm', 'ceo'))
  with check (private.has_role('admin', 'manager', 'gm', 'ceo'));

drop policy if exists items_write on items;
create policy items_write on items
  for all to authenticated
  using (private.has_role('admin', 'manager', 'gm', 'ceo'))
  with check (private.has_role('admin', 'manager', 'gm', 'ceo'));
