-- =====================================================================
--  0031 — What a product sells for, and who is selling it
--
--  The first half of billing (Phase B). Nothing here writes a bill; it
--  lays down the two things every bill will read:
--
--    1. The selling price of each product, with its whole history
--       (decisions D53, D63). A price is never edited or deleted — a new
--       one is added, the way the stock ledger works — so "what did Regular
--       Board sell for on 1 September?" always has an answer. Admin, GM and
--       superadmin may set one (D64); every change carries a name.
--
--       A bill will copy the price onto its own line when it is written,
--       so changing a price later never rewrites an old bill.
--
--    2. The company's own details for the head of a bill: names in English
--       and Arabic, address, phone, CR and VAT numbers, and a logo (D65).
--       The GM or superadmin fills them in on screen. VAT is recorded now
--       and used later (D54); its format is checked today so that the ZATCA
--       work does not begin by cleaning up what was typed in.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Prices
-- ---------------------------------------------------------------------

create table item_prices (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references items(id),
  price       numeric(12, 2) not null,
  note        text,
  set_by      uuid not null references user_tbl(id),
  created_at  timestamptz not null default now(),

  constraint price_is_positive check (price > 0)
);

comment on table item_prices is
  'Selling price history, one row per change. The newest row for an item is its price. Append-only.';

-- The current price is the newest row; this is the index that finds it.
create index item_prices_item_idx on item_prices (item_id, created_at desc, id desc);

alter table item_prices enable row level security;

-- Prices are commercial: the office reads them, the warehouse and drivers
-- have no use for them.
create policy item_prices_read on item_prices
  for select to authenticated
  using ((select private.has_role('ceo', 'gm', 'manager', 'admin')));

-- No insert, update or delete policy. Prices are set only through
-- set_item_price(), and the triggers below refuse any change to one
-- already written — from anybody, the table owner included.

create or replace function private.block_price_history_write()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  raise exception 'A price that has been set cannot be %. Set a new price instead.',
    case tg_op when 'UPDATE' then 'changed' else 'removed' end;
end
$$;

revoke all on function private.block_price_history_write() from public, anon, authenticated;

create trigger item_prices_no_update
  before update on item_prices
  for each row execute function private.block_price_history_write();

create trigger item_prices_no_delete
  before delete on item_prices
  for each row execute function private.block_price_history_write();


create or replace function set_item_price(
  p_item_id uuid,
  p_price   numeric,
  p_note    text default null
)
returns item_prices
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_item    items;
  v_current numeric;
  v_row     item_prices;
begin
  if not has_role('admin', 'gm', 'ceo') then
    raise exception 'Permission denied: only an admin, the GM or a superadmin can set a price.';
  end if;

  select * into v_item from items where id = p_item_id;
  if not found then
    raise exception 'That product does not exist.';
  end if;
  if not v_item.is_active then
    raise exception 'Product % is switched off. Switch it back on before pricing it.', v_item.item_number;
  end if;

  if p_price is null or p_price <= 0 then
    raise exception 'A price must be more than zero.';
  end if;
  if p_price <> round(p_price, 2) then
    raise exception 'A price has at most two decimals (halalas).';
  end if;

  select price into v_current
    from item_prices
   where item_id = p_item_id
   order by created_at desc, id desc
   limit 1;

  -- Saving the same figure again would add a line to the history that
  -- records nothing.
  if v_current is not null and v_current = p_price then
    raise exception 'The price of % is already % SAR.', v_item.item_number, v_current;
  end if;

  insert into item_prices (item_id, price, note, set_by)
  values (p_item_id, p_price, nullif(btrim(coalesce(p_note, '')), ''), auth.uid())
  returning * into v_row;

  return v_row;
end
$fn$;

revoke all on function set_item_price(uuid, numeric, text) from public, anon;
grant execute on function set_item_price(uuid, numeric, text) to authenticated;


-- Every product with the price it sells for now. Products that have never
-- been priced are listed too, with no price, so the gap is visible.
create or replace view v_item_current_price as
  select i.id               as item_id,
         i.item_number,
         i.description_en,
         i.description_ar,
         i.uom,
         i.is_active,
         p.price,
         p.created_at       as price_since,
         p.note             as price_note,
         nullif(btrim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), '')
                            as price_set_by_name
    from items i
    left join lateral (
      select ip.price, ip.created_at, ip.note, ip.set_by
        from item_prices ip
       where ip.item_id = i.id
       order by ip.created_at desc, ip.id desc
       limit 1
    ) p on true
    left join user_tbl u on u.id = p.set_by
   where (select private.has_role('ceo', 'gm', 'manager', 'admin'));

-- The setter's name comes from user_tbl, which an admin cannot read, so
-- the view runs as its owner and the role check above is the gate — the
-- same arrangement as v_slip_custody (0023) and v_talab_orders (0030).
alter view v_item_current_price set (security_invoker = off);
revoke all on v_item_current_price from anon;
grant select on v_item_current_price to authenticated;


-- Every change, newest first, with the figure it replaced.
create or replace view v_item_price_history as
  select ip.id,
         ip.item_id,
         i.item_number,
         i.description_en,
         ip.price,
         lag(ip.price) over (partition by ip.item_id order by ip.created_at, ip.id)
                            as previous_price,
         ip.note,
         ip.created_at,
         nullif(btrim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), '')
                            as set_by_name
    from item_prices ip
    join items i on i.id = ip.item_id
    left join user_tbl u on u.id = ip.set_by
   where (select private.has_role('ceo', 'gm', 'manager', 'admin'));

alter view v_item_price_history set (security_invoker = off);
revoke all on v_item_price_history from anon;
grant select on v_item_price_history to authenticated;


-- ---------------------------------------------------------------------
-- 2. The company on the head of a bill
-- ---------------------------------------------------------------------

create table company_profile (
  -- Exactly one row, ever: the key can only be `true`.
  id          boolean primary key default true,
  name_en     text,
  name_ar     text,
  address_en  text,
  address_ar  text,
  phone       text,
  cr_number   text,
  vat_number  text,
  logo_path   text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references user_tbl(id),

  constraint company_profile_single_row check (id),
  -- Saudi commercial registration: ten digits.
  constraint cr_number_format check (cr_number is null or cr_number ~ '^[0-9]{10}$'),
  -- Saudi VAT number: fifteen digits, first and last are 3.
  constraint vat_number_format check (vat_number is null or vat_number ~ '^3[0-9]{13}3$')
);

comment on table company_profile is
  'The client''s own details, printed at the head of every bill. One row.';

-- The row exists from the start, empty, so the screen only ever edits it.
insert into company_profile (id) values (true) on conflict (id) do nothing;

alter table company_profile enable row level security;

-- Anybody signed in may read it: it is printed on paper handed to customers.
create policy company_profile_read on company_profile
  for select to authenticated
  using ((select private.current_user_role()) is not null);

-- No write policies: changes go through save_company_profile().


create or replace function save_company_profile(
  p_name_en    text,
  p_name_ar    text,
  p_address_en text,
  p_address_ar text,
  p_phone      text,
  p_cr_number  text,
  p_vat_number text,
  p_logo_path  text
)
returns company_profile
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_cr   text := nullif(regexp_replace(coalesce(p_cr_number, ''), '\s', '', 'g'), '');
  v_vat  text := nullif(regexp_replace(coalesce(p_vat_number, ''), '\s', '', 'g'), '');
  v_logo text := nullif(btrim(coalesce(p_logo_path, '')), '');
  v_row  company_profile;
begin
  if not has_role('gm', 'ceo') then
    raise exception 'Permission denied: only the GM or a superadmin can change the company details.';
  end if;

  if nullif(btrim(coalesce(p_name_en, '')), '') is null then
    raise exception 'The company name in English is required — it heads every bill.';
  end if;

  if v_cr is not null and v_cr !~ '^[0-9]{10}$' then
    raise exception 'A commercial registration (CR) number is ten digits.';
  end if;
  if v_vat is not null and v_vat !~ '^3[0-9]{13}3$' then
    raise exception 'A Saudi VAT number is fifteen digits and starts and ends with 3.';
  end if;

  -- The logo must be a file that was actually uploaded to the company
  -- bucket, not a path typed in or borrowed from somewhere else.
  if v_logo is not null and not exists (
    select 1 from storage.objects o
     where o.bucket_id = 'company-assets' and o.name = v_logo
  ) then
    raise exception 'The logo file was not found. Upload it again.';
  end if;

  update company_profile
     set name_en    = btrim(p_name_en),
         name_ar    = nullif(btrim(coalesce(p_name_ar, '')), ''),
         address_en = nullif(btrim(coalesce(p_address_en, '')), ''),
         address_ar = nullif(btrim(coalesce(p_address_ar, '')), ''),
         phone      = nullif(btrim(coalesce(p_phone, '')), ''),
         cr_number  = v_cr,
         vat_number = v_vat,
         logo_path  = v_logo,
         updated_at = now(),
         updated_by = auth.uid()
   where id
  returning * into v_row;

  return v_row;
end
$fn$;

revoke all on function save_company_profile(text, text, text, text, text, text, text, text)
  from public, anon;
grant execute on function save_company_profile(text, text, text, text, text, text, text, text)
  to authenticated;


-- ---------------------------------------------------------------------
-- 3. Where the logo lives
--
-- Its own private bucket rather than a folder in `delivery-notes`: that
-- bucket lets the warehouse and dispatchers upload anywhere in it, and the
-- company's logo is not theirs to replace. Images only, 2 MB at most.
-- Files are never overwritten — each upload has its own name, and the
-- profile points at the one in use.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-assets', 'company-assets', false, 2097152,
        array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy company_assets_read on storage.objects
  for select to authenticated
  using (bucket_id = 'company-assets' and (select private.current_user_role()) is not null);

create policy company_assets_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'company-assets' and (select private.has_role('gm', 'ceo')));
