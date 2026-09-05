-- =====================================================================
--  LogiFlow — Phase 1 (part 2): Auth bootstrap, Storage, Seed data
--  0001_phase1_inventory.sql ke BAAD chalayen.
--  STATUS: PROPOSAL — abhi APPLY NAHI hui.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Naya user sign up kare to profile khud ban jaye
--    Role default 'viewer' — yaani naya user by default kuch nahi kar sakta.
--    Upgrade sirf CEO/GM karega (section 5 dekhein).
-- ---------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'viewer'
  )
  on conflict (id) do nothing;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ---------------------------------------------------------------------
-- 2. Storage — DN PDFs ka PRIVATE bucket
--    public = false. Files sirf signed URL se khulengi.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'delivery-notes',
  'delivery-notes',
  false,                                   -- ★ PRIVATE ★
  10485760,                                -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Parhna: har active user
create policy "dn_pdf_read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'delivery-notes'
    and current_user_role() is not null
  );

-- Upload: dispatcher aur us se upar
create policy "dn_pdf_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'delivery-notes'
    and has_role('dispatcher', 'warehouse', 'manager', 'gm', 'ceo')
  );

-- Delete: sirf GM/CEO (source document hai, aasani se na mite)
create policy "dn_pdf_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'delivery-notes'
    and has_role('gm', 'ceo')
  );

-- NOTE: driver-documents (Iqama/Rukhsa) bucket Phase 1 mein NAHI hai.
--       Jab woh phase aayega, woh bhi PRIVATE hi banega — public kabhi nahi.


-- ---------------------------------------------------------------------
-- 3. Seed — Supplier (asal PDFs se liya gaya)
-- ---------------------------------------------------------------------
insert into suppliers (code, name_en, name_ar, cr_number, vat_number, address, phone)
values (
  'ELKHAYYAT',
  'El-Khayyat Gypsum Factories',
  'مصانع الخياط للجبس',
  '4030169349',
  '300696451500003',
  '6507 Andalus, Abdullah Muhari, Jeddah 23322, KSA',
  '0126633337 / 0126651039'
)
on conflict (code) do nothing;


-- ---------------------------------------------------------------------
-- 4. Seed — Items (23 reference PDFs mein sirf yeh do item numbers thay)
-- ---------------------------------------------------------------------
insert into items (item_number, description_en, description_ar, uom, unit_weight_kg)
values
  ('1290000001', 'Bags - Regular 40 kg Gypsum Powder', 'أكياس - جبس عادي 40 كجم',  'BAG', 40),
  ('1290000002', 'Bags - Special 40 kg Gypsum Powder', 'أكياس - جبس خاص 40 كجم',   'BAG', 40)
on conflict (item_number) do nothing;


-- ---------------------------------------------------------------------
-- 5. Seed — Warehouse
--    ⚠️ PLACEHOLDER: client se asal warehouse ka naam/code confirm karna hai.
--       Ek se zyada warehouse hon to yahan add karein.
-- ---------------------------------------------------------------------
insert into warehouses (code, name, name_ar)
values ('MAIN', 'Main Warehouse', 'المستودع الرئيسي')
on conflict (code) do nothing;


-- ---------------------------------------------------------------------
-- 6. PEHLA ADMIN banana
--
--    Naya user sign up karne par 'viewer' banta hai — woh kuch nahi kar sakta.
--    Pehle admin ko HATH se promote karna hoga (bas ek dafa).
--
--    Tareeqa:
--      1. App ya Supabase Dashboard → Authentication se user sign up karein
--      2. Neeche wali line ka comment hata kar, email daal kar SQL Editor mein chalayen
--
--    update user_profiles
--       set role = 'ceo', full_name = 'YAHAN NAAM'
--     where id = (select id from auth.users where email = 'YAHAN@EMAIL.COM');
--
--    Uske baad woh CEO dusre users ke roles app se set kar sakega.
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- 7. Verification — apply karne ke baad yeh chala kar check karein
--    (sab rows mein rls_enabled = true hona chahiye)
--
--    select tablename, rowsecurity as rls_enabled
--      from pg_tables
--     where schemaname = 'public'
--     order by tablename;
--
--    select id, public from storage.buckets;   -- public = false hona chahiye
-- ---------------------------------------------------------------------
