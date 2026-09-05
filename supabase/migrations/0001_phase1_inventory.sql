-- =====================================================================
--  LogiFlow — Phase 1: Inventory & Delivery Notes
--  STATUS: PROPOSAL — abhi APPLY NAHI hui. User ki approval ke baad chalegi.
--
--  Core rule (client requirement):
--    PDF Qty  = supplier ka claim  → stock NAHI
--    Arrived  = insaan ne confirm kiya → tab stock banta hai
--    available_qty = IN − OUT   (pdf_qty is formula mein KABHI nahi)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";


-- ---------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------
create type user_role as enum (
  'ceo', 'gm', 'manager', 'dispatcher', 'warehouse', 'driver', 'viewer'
);

-- not_arrived → partial → arrived  (client ka status flow)
create type dn_status as enum ('not_arrived', 'partial', 'arrived', 'cancelled');

create type movement_direction as enum ('IN', 'OUT');

create type movement_type as enum (
  'dn_receipt',          -- IN  : truck aaya, DN receive hua
  'sale',                -- OUT : customer ko becha
  'driver_allocation',   -- OUT : driver ko diya
  'transfer_out',        -- OUT : doosre warehouse ko
  'transfer_in',         -- IN  : doosre warehouse se aaya
  'adjustment',          -- IN/OUT : stock count adjustment
  'reversal'             -- IN/OUT : kisi purani movement ko ulta karna
);

create type extraction_method as enum ('pdf_text', 'vision', 'manual');


-- ---------------------------------------------------------------------
-- 2. user_profiles  (auth.users ka extension — RLS ki buniyad)
-- ---------------------------------------------------------------------
create table user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text        not null,
  role        user_role   not null default 'viewer',
  phone       text,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

comment on table user_profiles is 'Har auth user ka role. RLS policies isi par based hain.';

-- RLS helper. SECURITY DEFINER isliye ke policy ke andar recursion na ho.
create or replace function current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from user_profiles where id = auth.uid() and is_active
$$;

create or replace function has_role(variadic p_roles user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_user_role() = any(p_roles)
$$;


-- ---------------------------------------------------------------------
-- 3. Master data
-- ---------------------------------------------------------------------
create table suppliers (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,          -- 'ELKHAYYAT'
  name_en     text not null,                 -- 'El-Khayyat Gypsum Factories'
  name_ar     text,                          -- 'مصانع الخياط للجبس'
  cr_number   text,                          -- '4030169349'
  vat_number  text,                          -- '300696451500003'
  address     text,
  phone       text,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

create table items (
  id             uuid primary key default gen_random_uuid(),
  item_number    text not null unique,       -- '1290000001'
  description_en text not null,              -- 'Bags - Regular 40 kg Gypsum Powder'
  description_ar text,
  uom            text not null,              -- 'BAG'
  unit_weight_kg numeric(12,3),              -- 40
  is_active      boolean     not null default true,
  created_at     timestamptz not null default now()
);

create table warehouses (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  name_ar    text,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 4. delivery_notes  — SOURCE DOCUMENT (PDF se bana)
-- ---------------------------------------------------------------------
create table delivery_notes (
  id                    uuid primary key default gen_random_uuid(),

  -- PDF ke do numbers
  dn_number             text not null unique,   -- '9010043974'
  so_number             text not null,          -- '9100042877'
  shipping_reference    text,                   -- '750 SPECIAL'

  supplier_id           uuid not null references suppliers(id),

  -- PDF par jo chhapa hai (snapshot — baad mein master badle to yeh na badle)
  customer_number       text,                   -- '1100187'
  customer_name         text,                   -- 'مؤسسة صرح البنيان للتجارة'
  ship_from             text,                   -- 'El-Khayyat Gypsum Plant'
  ship_to               text,
  salesman              text,                   -- 'sherief abdelkudous'
  print_date            date,
  order_date            date,

  status                dn_status not null default 'not_arrived',

  -- Asal PDF (private bucket)
  pdf_storage_path      text,
  pdf_file_name         text,
  pdf_sha256            text,                   -- duplicate upload pakadne ke liye

  -- Extraction ki shafafiyat — kabhi fake confidence na dikhayen
  extraction_method     extraction_method,
  extraction_confidence numeric(5,2) check (extraction_confidence between 0 and 100),
  needs_review_fields   text[] not null default '{}',

  arrived_at            timestamptz,
  notes                 text,

  created_at            timestamptz not null default now(),
  created_by            uuid references user_profiles(id),
  updated_at            timestamptz not null default now()
);

create index on delivery_notes (supplier_id);
create index on delivery_notes (status);
create index on delivery_notes (so_number);
create index on delivery_notes (print_date desc);

comment on column delivery_notes.status is
  'Lines se roll-up hota hai: sab arrived → arrived, koi partial/kuch arrived → partial, warna not_arrived';


-- ---------------------------------------------------------------------
-- 5. delivery_note_lines — YAHI EK LOT HAI
--    (abhi PDFs par 1 line hoti hai, magar model N lines support karta hai)
-- ---------------------------------------------------------------------
create table delivery_note_lines (
  id                  uuid primary key default gen_random_uuid(),
  delivery_note_id    uuid not null references delivery_notes(id) on delete cascade,
  line_no             int  not null default 1,

  item_id             uuid not null references items(id),
  -- PDF par jo chhapa tha (snapshot)
  item_number         text not null,
  item_description    text not null,
  uom                 text not null,

  -- ★ CORE RULE ★
  pdf_qty             numeric(14,3) not null check (pdf_qty > 0),
  arrived_qty         numeric(14,3) check (arrived_qty >= 0),

  -- Derive kiya jata hai, kabhi hath se set nahi hota
  missing_qty         numeric(14,3)
                      generated always as (pdf_qty - coalesce(arrived_qty, 0)) stored,

  status              dn_status not null default 'not_arrived',

  received_at         timestamptz,
  received_by         uuid references user_profiles(id),
  discrepancy_reason  text,          -- shortage par lazmi (RPC enforce karta hai)
  notes               text,

  created_at          timestamptz not null default now(),

  unique (delivery_note_id, line_no),

  -- Supplier ke bheje se zyada receive nahi ho sakta
  constraint arrived_lte_pdf
    check (arrived_qty is null or arrived_qty <= pdf_qty),

  -- Status aur arrived_qty hamesha aapas mein mutabiq rahen
  constraint status_matches_arrived check (
    (status = 'cancelled')
    or (status = 'not_arrived' and coalesce(arrived_qty, 0) = 0)
    or (status = 'partial'     and arrived_qty > 0 and arrived_qty < pdf_qty)
    or (status = 'arrived'     and arrived_qty = pdf_qty)
  )
);

create index on delivery_note_lines (delivery_note_id);
create index on delivery_note_lines (item_id);
create index on delivery_note_lines (status);


-- ---------------------------------------------------------------------
-- 6. stock_movements — APPEND-ONLY LEDGER
--    Balance yahan store NAHI hota. Hamesha inhi rows se calculate hota hai.
-- ---------------------------------------------------------------------
create table stock_movements (
  id                    uuid primary key default gen_random_uuid(),

  item_id               uuid not null references items(id),
  warehouse_id          uuid not null references warehouses(id),

  direction             movement_direction not null,
  qty                   numeric(14,3) not null check (qty > 0),  -- hamesha musbat; direction sign deta hai
  movement_type         movement_type not null,

  -- Kis lot se aaya / nikla (traceability)
  delivery_note_line_id uuid references delivery_note_lines(id),

  reference_no          text,
  reversal_of           uuid references stock_movements(id),

  occurred_at           timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  created_by            uuid references user_profiles(id),
  notes                 text,

  -- IN via DN hamesha lot se juda hoga
  constraint dn_receipt_needs_lot
    check (movement_type <> 'dn_receipt' or delivery_note_line_id is not null)
);

create index on stock_movements (item_id, warehouse_id);
create index on stock_movements (delivery_note_line_id);
create index on stock_movements (occurred_at desc);

-- Append-only: UPDATE/DELETE dono band. Ghalti sudharne ke liye reversal row daalein.
create or replace function block_stock_movement_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'stock_movements append-only hai — % ki ijazat nahi. Ghalti sudharne ke liye reverse_stock_movement() use karein.',
    tg_op;
end
$$;

create trigger stock_movements_block_update
  before update on stock_movements
  for each row execute function block_stock_movement_mutation();

create trigger stock_movements_block_delete
  before delete on stock_movements
  for each row execute function block_stock_movement_mutation();


-- ---------------------------------------------------------------------
-- 7. updated_at trigger
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger delivery_notes_updated_at
  before update on delivery_notes
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------
-- 8. VIEWS — saare calculated numbers yahan
-- ---------------------------------------------------------------------

-- 8a. Per-lot balance (ek DN line = ek lot)
create view v_lot_balances as
select
  l.id                                     as lot_id,
  l.delivery_note_id,
  l.item_id,
  l.item_number,
  l.item_description,
  l.uom,
  l.pdf_qty,
  l.arrived_qty,
  l.missing_qty,
  l.status,
  coalesce(sum(m.qty) filter (where m.direction = 'IN'),  0) as in_qty,
  coalesce(sum(m.qty) filter (where m.direction = 'OUT'), 0) as out_qty,
  coalesce(sum(m.qty) filter (where m.direction = 'IN'),  0)
    - coalesce(sum(m.qty) filter (where m.direction = 'OUT'), 0) as balance_qty
from delivery_note_lines l
left join stock_movements m on m.delivery_note_line_id = l.id
group by l.id;

-- 8b. Client ka dashboard — bilkul wohi columns jo unhon ne maange
create view v_inventory_dashboard as
select
  dn.id            as delivery_note_id,
  dn.dn_number     as "DN No",
  dn.so_number     as "SO No",
  dn.print_date,
  s.name_en        as supplier,
  b.item_number,
  b.item_description as "Item",
  b.uom            as "UOM",
  b.pdf_qty        as "PDF Qty",
  coalesce(b.arrived_qty, 0) as "Arrived Qty",
  b.missing_qty    as "Missing Qty",
  b.in_qty         as "In Qty",
  b.out_qty        as "Out Qty",
  b.balance_qty    as "Balance",
  b.status         as "Status"
from v_lot_balances b
join delivery_notes dn on dn.id = b.delivery_note_id
join suppliers      s  on s.id  = dn.supplier_id;

-- 8c. Per-item / per-warehouse total stock
create view v_item_stock as
select
  i.id   as item_id,
  i.item_number,
  i.description_en,
  i.uom,
  w.id   as warehouse_id,
  w.code as warehouse_code,
  coalesce(sum(m.qty) filter (where m.direction = 'IN'),  0) as in_qty,
  coalesce(sum(m.qty) filter (where m.direction = 'OUT'), 0) as out_qty,
  coalesce(sum(m.qty) filter (where m.direction = 'IN'),  0)
    - coalesce(sum(m.qty) filter (where m.direction = 'OUT'), 0) as available_qty
from stock_movements m
join items      i on i.id = m.item_id
join warehouses w on w.id = m.warehouse_id
group by i.id, w.id;


-- ---------------------------------------------------------------------
-- 9. RPC — atomic business operations
--    Frontend seedha stock_movements mein likh NAHI sakta (section 10 dekhein)
-- ---------------------------------------------------------------------

-- 9a. Truck aaya → arrival confirm karein
--     Ek transaction mein: line update + stock IN + header roll-up
create or replace function receive_delivery_note_line(
  p_line_id            uuid,
  p_arrived_qty        numeric,
  p_warehouse_id       uuid,
  p_discrepancy_reason text default null,
  p_notes              text default null
)
returns delivery_note_lines
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line   delivery_note_lines;
  v_status dn_status;
begin
  if not has_role('warehouse', 'dispatcher', 'manager', 'gm', 'ceo') then
    raise exception 'Ijazat nahi: arrival sirf warehouse/dispatcher/manager confirm kar sakta hai';
  end if;

  select * into v_line from delivery_note_lines where id = p_line_id for update;
  if not found then
    raise exception 'DN line nahi mili: %', p_line_id;
  end if;

  if v_line.arrived_qty is not null then
    raise exception 'Yeh line pehle hi receive ho chuki hai (arrived_qty = %). Tabdeeli ke liye reversal karein.',
      v_line.arrived_qty;
  end if;

  if p_arrived_qty is null or p_arrived_qty < 0 then
    raise exception 'arrived_qty 0 ya us se zyada honi chahiye';
  end if;

  if p_arrived_qty > v_line.pdf_qty then
    raise exception 'arrived_qty (%) pdf_qty (%) se zyada nahi ho sakti', p_arrived_qty, v_line.pdf_qty;
  end if;

  -- Shortage bina wajah ke record nahi hogi — supplier accountability
  if p_arrived_qty < v_line.pdf_qty
     and coalesce(btrim(p_discrepancy_reason), '') = '' then
    raise exception 'Shortage (% missing) par discrepancy_reason lazmi hai',
      v_line.pdf_qty - p_arrived_qty;
  end if;

  v_status := case
                when p_arrived_qty = 0            then 'not_arrived'
                when p_arrived_qty < v_line.pdf_qty then 'partial'
                else 'arrived'
              end;

  update delivery_note_lines
     set arrived_qty        = p_arrived_qty,
         status             = v_status,
         received_at        = now(),
         received_by        = auth.uid(),
         discrepancy_reason = p_discrepancy_reason,
         notes              = coalesce(p_notes, notes)
   where id = p_line_id
   returning * into v_line;

  -- Stock sirf ab barhta hai — PDF upload par nahi
  if p_arrived_qty > 0 then
    insert into stock_movements (
      item_id, warehouse_id, direction, qty, movement_type,
      delivery_note_line_id, reference_no, created_by, notes
    )
    select v_line.item_id, p_warehouse_id, 'IN', p_arrived_qty, 'dn_receipt',
           v_line.id, dn.dn_number, auth.uid(), p_notes
    from delivery_notes dn where dn.id = v_line.delivery_note_id;
  end if;

  -- Header status lines se roll-up
  update delivery_notes dn
     set status = sub.rolled_up,
         arrived_at = case when sub.rolled_up in ('arrived', 'partial')
                           then coalesce(dn.arrived_at, now()) end
    from (
      select case
               when bool_and(l.status = 'arrived')     then 'arrived'::dn_status
               when bool_or(l.status in ('arrived','partial')) then 'partial'::dn_status
               else 'not_arrived'::dn_status
             end as rolled_up
      from delivery_note_lines l
      where l.delivery_note_id = v_line.delivery_note_id
    ) sub
   where dn.id = v_line.delivery_note_id;

  return v_line;
end
$$;


-- 9b. Stock nikalna (sale / driver / transfer) — lot ke against
create or replace function issue_stock(
  p_lot_id        uuid,
  p_warehouse_id  uuid,
  p_qty           numeric,
  p_movement_type movement_type,
  p_reference_no  text default null,
  p_notes         text default null
)
returns stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot     delivery_note_lines;
  v_balance numeric;
  v_mv      stock_movements;
begin
  if not has_role('warehouse', 'dispatcher', 'manager', 'gm', 'ceo') then
    raise exception 'Ijazat nahi: stock issue karne ka haq nahi';
  end if;

  if p_movement_type not in ('sale', 'driver_allocation', 'transfer_out', 'adjustment') then
    raise exception 'issue_stock ke liye ghalat movement_type: %', p_movement_type;
  end if;

  if p_qty is null or p_qty <= 0 then
    raise exception 'qty 0 se zyada honi chahiye';
  end if;

  -- Lot lock karein taake do requests ek saath same stock na nikalen
  select * into v_lot from delivery_note_lines where id = p_lot_id for update;
  if not found then
    raise exception 'Lot (DN line) nahi mila: %', p_lot_id;
  end if;

  select coalesce(sum(qty) filter (where direction = 'IN'),  0)
       - coalesce(sum(qty) filter (where direction = 'OUT'), 0)
    into v_balance
  from stock_movements
  where delivery_note_line_id = p_lot_id
    and warehouse_id = p_warehouse_id;

  if p_qty > v_balance then
    raise exception 'Stock kaafi nahi: is lot mein % available hai, % maanga gaya', v_balance, p_qty;
  end if;

  insert into stock_movements (
    item_id, warehouse_id, direction, qty, movement_type,
    delivery_note_line_id, reference_no, created_by, notes
  )
  values (
    v_lot.item_id, p_warehouse_id, 'OUT', p_qty, p_movement_type,
    p_lot_id, p_reference_no, auth.uid(), p_notes
  )
  returning * into v_mv;

  return v_mv;
end
$$;


-- 9c. Ghalti sudharna — row delete nahi, ulti row daalna
create or replace function reverse_stock_movement(
  p_movement_id uuid,
  p_reason      text
)
returns stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orig stock_movements;
  v_new  stock_movements;
begin
  if not has_role('manager', 'gm', 'ceo') then
    raise exception 'Ijazat nahi: reversal sirf manager ya us se upar kar sakta hai';
  end if;

  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'Reversal ki wajah lazmi hai';
  end if;

  select * into v_orig from stock_movements where id = p_movement_id;
  if not found then
    raise exception 'Movement nahi mili: %', p_movement_id;
  end if;

  if exists (select 1 from stock_movements where reversal_of = p_movement_id) then
    raise exception 'Yeh movement pehle hi reverse ho chuki hai';
  end if;

  insert into stock_movements (
    item_id, warehouse_id, direction, qty, movement_type,
    delivery_note_line_id, reference_no, reversal_of, created_by, notes
  )
  values (
    v_orig.item_id,
    v_orig.warehouse_id,
    case when v_orig.direction = 'IN' then 'OUT' else 'IN' end,
    v_orig.qty,
    'reversal',
    v_orig.delivery_note_line_id,
    v_orig.reference_no,
    v_orig.id,
    auth.uid(),
    p_reason
  )
  returning * into v_new;

  return v_new;
end
$$;


-- ---------------------------------------------------------------------
-- 10. RLS — har table par ON
--     anon key browser mein public hai, isliye yeh optional nahi
-- ---------------------------------------------------------------------
alter table user_profiles        enable row level security;
alter table suppliers            enable row level security;
alter table items                enable row level security;
alter table warehouses           enable row level security;
alter table delivery_notes       enable row level security;
alter table delivery_note_lines  enable row level security;
alter table stock_movements      enable row level security;

-- user_profiles: apni profile parh sakte hain; sirf CEO/GM roles badal sakte hain
create policy up_select_self on user_profiles
  for select to authenticated
  using (id = auth.uid() or has_role('ceo', 'gm', 'manager'));

create policy up_admin_write on user_profiles
  for all to authenticated
  using (has_role('ceo', 'gm')) with check (has_role('ceo', 'gm'));

-- Master data: sab active users parh sakte hain, manager+ likh sakta hai
create policy suppliers_read on suppliers
  for select to authenticated using (current_user_role() is not null);
create policy suppliers_write on suppliers
  for all to authenticated
  using (has_role('manager', 'gm', 'ceo')) with check (has_role('manager', 'gm', 'ceo'));

create policy items_read on items
  for select to authenticated using (current_user_role() is not null);
create policy items_write on items
  for all to authenticated
  using (has_role('manager', 'gm', 'ceo')) with check (has_role('manager', 'gm', 'ceo'));

create policy warehouses_read on warehouses
  for select to authenticated using (current_user_role() is not null);
create policy warehouses_write on warehouses
  for all to authenticated
  using (has_role('manager', 'gm', 'ceo')) with check (has_role('manager', 'gm', 'ceo'));

-- Delivery notes: sab parh sakte hain; dispatcher+ bana sakta hai
create policy dn_read on delivery_notes
  for select to authenticated using (current_user_role() is not null);
create policy dn_insert on delivery_notes
  for insert to authenticated
  with check (has_role('dispatcher', 'warehouse', 'manager', 'gm', 'ceo'));
create policy dn_update on delivery_notes
  for update to authenticated
  using (has_role('dispatcher', 'warehouse', 'manager', 'gm', 'ceo'))
  with check (has_role('dispatcher', 'warehouse', 'manager', 'gm', 'ceo'));
create policy dn_delete on delivery_notes
  for delete to authenticated using (has_role('gm', 'ceo'));

create policy dnl_read on delivery_note_lines
  for select to authenticated using (current_user_role() is not null);
create policy dnl_insert on delivery_note_lines
  for insert to authenticated
  with check (has_role('dispatcher', 'warehouse', 'manager', 'gm', 'ceo'));
-- NOTE: UPDATE ki koi policy nahi — arrival sirf receive_delivery_note_line() se

-- stock_movements: sirf parhna. Likhna SIRF RPC functions se.
create policy sm_read on stock_movements
  for select to authenticated using (current_user_role() is not null);

revoke insert, update, delete on stock_movements from authenticated;
revoke update on delivery_note_lines from authenticated;

grant execute on function receive_delivery_note_line(uuid, numeric, uuid, text, text) to authenticated;
grant execute on function issue_stock(uuid, uuid, numeric, movement_type, text, text)  to authenticated;
grant execute on function reverse_stock_movement(uuid, text)                           to authenticated;
