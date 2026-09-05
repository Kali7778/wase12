-- =====================================================================
--  LogiFlow — Phase 1 (part 4): Private schema + function grants
--
--  Wajah: `get_advisors(security)` ne teen cheezein pakrin —
--    1. anon teeno business RPC call kar sakta tha (Postgres har function
--       par PUBLIC ko EXECUTE deta hai — mera `grant to authenticated`
--       ne kuch add hi nahi kiya tha)
--    2. handle_new_user() (trigger function) API par expose thi
--    3. Do trigger functions mein `set search_path` reh gaya tha
--
--  has_role() / current_user_role() ko sirf revoke NAHI kiya ja sakta —
--  yeh 18 RLS policies ke andar chalti hain, aur policy expression
--  invoking user ke ikhtiyar se evaluate hota hai. EXECUTE hatane se
--  saari RLS tut jati. Isliye inhein `private` schema mein le ja rahe hain:
--  PostgREST sirf `public` expose karta hai, to API se ghayab ho jayengi
--  magar policies chalti rahengi.
--
--  0003 ke BAAD chalayen.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. private schema — PostgREST ise expose nahi karta
-- ---------------------------------------------------------------------
create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;


-- ---------------------------------------------------------------------
-- 2. Helper functions private mein
-- ---------------------------------------------------------------------
create or replace function private.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_profiles where id = auth.uid() and is_active
$$;

-- coalesce lazmi hai — NULL `if not ...` check ko chupke se bypass kar deta hai (0003 dekhein)
create or replace function private.has_role(variadic p_roles user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_user_role() = any(p_roles), false)
$$;

revoke all on function private.current_user_role()            from public, anon;
revoke all on function private.has_role(user_role[])          from public, anon;
grant execute on function private.current_user_role()         to authenticated;
grant execute on function private.has_role(user_role[])       to authenticated;


-- ---------------------------------------------------------------------
-- 3. Purani policies hatayen (public.has_role par depend karti hain)
-- ---------------------------------------------------------------------
drop policy if exists up_select_self     on user_profiles;
drop policy if exists up_admin_write     on user_profiles;
drop policy if exists suppliers_read     on suppliers;
drop policy if exists suppliers_write    on suppliers;
drop policy if exists items_read         on items;
drop policy if exists items_write        on items;
drop policy if exists warehouses_read    on warehouses;
drop policy if exists warehouses_write   on warehouses;
drop policy if exists dn_read            on delivery_notes;
drop policy if exists dn_insert          on delivery_notes;
drop policy if exists dn_update          on delivery_notes;
drop policy if exists dn_delete          on delivery_notes;
drop policy if exists dnl_read           on delivery_note_lines;
drop policy if exists dnl_insert         on delivery_note_lines;
drop policy if exists sm_read            on stock_movements;

drop policy if exists "dn_pdf_read"      on storage.objects;
drop policy if exists "dn_pdf_insert"    on storage.objects;
drop policy if exists "dn_pdf_delete"    on storage.objects;


-- ---------------------------------------------------------------------
-- 4. RPC functions ka search_path — ab private.has_role resolve hogi
--    (function body ko chhue baghair — sirf config badal rahe hain)
-- ---------------------------------------------------------------------
alter function receive_delivery_note_line(uuid, numeric, uuid, text, text)
  set search_path = public, private;
alter function issue_stock(uuid, uuid, numeric, movement_type, text, text)
  set search_path = public, private;
alter function reverse_stock_movement(uuid, text)
  set search_path = public, private;


-- ---------------------------------------------------------------------
-- 5. public wali helper functions drop
-- ---------------------------------------------------------------------
drop function if exists public.has_role(user_role[]);
drop function if exists public.current_user_role();


-- ---------------------------------------------------------------------
-- 6. Policies dobara — ab private.* ke saath
-- ---------------------------------------------------------------------

-- user_profiles
create policy up_select_self on user_profiles
  for select to authenticated
  using (id = auth.uid() or private.has_role('ceo', 'gm', 'manager'));

create policy up_admin_write on user_profiles
  for all to authenticated
  using (private.has_role('ceo', 'gm'))
  with check (private.has_role('ceo', 'gm'));

-- suppliers
create policy suppliers_read on suppliers
  for select to authenticated using (private.current_user_role() is not null);
create policy suppliers_write on suppliers
  for all to authenticated
  using (private.has_role('manager', 'gm', 'ceo'))
  with check (private.has_role('manager', 'gm', 'ceo'));

-- items
create policy items_read on items
  for select to authenticated using (private.current_user_role() is not null);
create policy items_write on items
  for all to authenticated
  using (private.has_role('manager', 'gm', 'ceo'))
  with check (private.has_role('manager', 'gm', 'ceo'));

-- warehouses
create policy warehouses_read on warehouses
  for select to authenticated using (private.current_user_role() is not null);
create policy warehouses_write on warehouses
  for all to authenticated
  using (private.has_role('manager', 'gm', 'ceo'))
  with check (private.has_role('manager', 'gm', 'ceo'));

-- delivery_notes
create policy dn_read on delivery_notes
  for select to authenticated using (private.current_user_role() is not null);
create policy dn_insert on delivery_notes
  for insert to authenticated
  with check (private.has_role('dispatcher', 'warehouse', 'manager', 'gm', 'ceo'));
create policy dn_update on delivery_notes
  for update to authenticated
  using (private.has_role('dispatcher', 'warehouse', 'manager', 'gm', 'ceo'))
  with check (private.has_role('dispatcher', 'warehouse', 'manager', 'gm', 'ceo'));
create policy dn_delete on delivery_notes
  for delete to authenticated using (private.has_role('gm', 'ceo'));

-- delivery_note_lines
-- NOTE: UPDATE ki koi policy nahi — arrival sirf receive_delivery_note_line() se
create policy dnl_read on delivery_note_lines
  for select to authenticated using (private.current_user_role() is not null);
create policy dnl_insert on delivery_note_lines
  for insert to authenticated
  with check (private.has_role('dispatcher', 'warehouse', 'manager', 'gm', 'ceo'));

-- stock_movements — sirf parhna. Likhna SIRF RPC se.
create policy sm_read on stock_movements
  for select to authenticated using (private.current_user_role() is not null);

-- storage: delivery-notes bucket
create policy "dn_pdf_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'delivery-notes' and private.current_user_role() is not null);

create policy "dn_pdf_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'delivery-notes'
    and private.has_role('dispatcher', 'warehouse', 'manager', 'gm', 'ceo')
  );

create policy "dn_pdf_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'delivery-notes' and private.has_role('gm', 'ceo'));


-- ---------------------------------------------------------------------
-- 7. Trigger functions — search_path + PUBLIC se execute revoke
--    Yeh sirf triggers se chalti hain, API se kabhi nahi
-- ---------------------------------------------------------------------
alter function block_stock_movement_mutation() set search_path = public;
alter function set_updated_at()                set search_path = public;

revoke all on function block_stock_movement_mutation() from public, anon, authenticated;
revoke all on function set_updated_at()                from public, anon, authenticated;
revoke all on function handle_new_user()               from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 8. Business RPC — anon se poori tarah revoke, sirf authenticated
--    (Postgres by default PUBLIC ko EXECUTE deta hai — isi liye
--     anon andar tak pohanch raha tha)
-- ---------------------------------------------------------------------
revoke all on function receive_delivery_note_line(uuid, numeric, uuid, text, text)
  from public, anon;
revoke all on function issue_stock(uuid, uuid, numeric, movement_type, text, text)
  from public, anon;
revoke all on function reverse_stock_movement(uuid, text)
  from public, anon;

grant execute on function receive_delivery_note_line(uuid, numeric, uuid, text, text)
  to authenticated;
grant execute on function issue_stock(uuid, uuid, numeric, movement_type, text, text)
  to authenticated;
grant execute on function reverse_stock_movement(uuid, text)
  to authenticated;


-- ---------------------------------------------------------------------
-- 9. Verification
--
--    select * from pg_policies where schemaname in ('public','storage');
--      → 18 policies, sab `private.` use karti hui
--
--    get_advisors(security) → security_definer wali warnings khatam honi chahiyen
-- ---------------------------------------------------------------------
