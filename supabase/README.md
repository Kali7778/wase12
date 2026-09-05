# Supabase Setup — Phase 1

## Migrations (isi tarteeb mein chalayen)

| # | File | Kya karti hai |
|---|---|---|
| 1 | [0001_phase1_inventory.sql](migrations/0001_phase1_inventory.sql) | Enums, 7 tables, views, 3 RPC functions, RLS policies |
| 2 | [0002_auth_storage_seed.sql](migrations/0002_auth_storage_seed.sql) | Auth trigger, private storage bucket, seed data |

## Apply kaise karein

**Supabase Dashboard → SQL Editor**

1. `0001_phase1_inventory.sql` ka poora content copy karein → paste → **Run**
2. `0002_auth_storage_seed.sql` ka poora content copy karein → paste → **Run**

⚠️ Tarteeb zaroori hai — `0002` ka `has_role()` function `0001` mein banta hai.

## Apply karne ke baad verify karein

```sql
-- 1. Har table par RLS on hona chahiye
select tablename, rowsecurity as rls_enabled
  from pg_tables where schemaname = 'public' order by tablename;

-- 2. Bucket PRIVATE hona chahiye (public = false)
select id, public from storage.buckets;

-- 3. Seed data aa gaya?
select code, name_en from suppliers;
select item_number, description_en, uom from items;
select code, name from warehouses;
```

## Pehla admin banayein

Naya user sign up karne par role **`viewer`** milta hai — woh kuch nahi kar sakta.
Pehle admin ko ek dafa hath se promote karna hoga:

```sql
update user_profiles
   set role = 'ceo', full_name = 'Apna Naam'
 where id = (select id from auth.users where email = 'apna@email.com');
```

Uske baad woh CEO baaki users ke roles app se set kar sakega.

---

## Core rule — DB kaise enforce karta hai

> **PDF Qty = supplier ka claim. Arrived Qty = jo waqai mila. Stock sirf doosre se banta hai.**

| Rule | Enforcement |
|---|---|
| PDF upload par stock na barhe | DN insert sirf row banata hai — koi `stock_movements` row nahi |
| `arrived_qty` confirm hone tak khaali | Column **NULL** rehta hai, default 0 nahi |
| Supplier se zyada receive na ho | `check (arrived_qty <= pdf_qty)` |
| Missing qty chhupayi na ja sake | Generated column — hath se set ho hi nahi sakti |
| Shortage bina wajah record na ho | RPC exception phenkta hai agar `discrepancy_reason` khaali ho |
| `available = IN − OUT` | View `v_lot_balances` — `pdf_qty` formula mein hai hi nahi |
| Ledger na badla ja sake | `stock_movements` par UPDATE/DELETE trigger se block |
| Frontend cheat na kar sake | `authenticated` se write **revoked** — sab kuch sirf RPC se |

## RPC functions

```sql
-- Truck aaya → arrival confirm (atomic: line + stock IN + header roll-up)
select * from receive_delivery_note_line(
  p_line_id            => '<uuid>',
  p_arrived_qty        => 500,
  p_warehouse_id       => '<uuid>',
  p_discrepancy_reason => '250 bags phate hue thay'   -- shortage par lazmi
);

-- Stock nikalna (lot ke against)
select * from issue_stock(
  p_lot_id        => '<uuid>',
  p_warehouse_id  => '<uuid>',
  p_qty           => 200,
  p_movement_type => 'sale',
  p_reference_no  => 'INV-1001'
);

-- Ghalti sudharna (delete nahi — ulti row)
select * from reverse_stock_movement('<movement uuid>', 'Ghalat qty daali gayi thi');
```

## Views

| View | Kya deta hai |
|---|---|
| `v_inventory_dashboard` | Client ki maangi hui table — DN No, SO No, Item, UOM, PDF Qty, Arrived, Missing, In, Out, Balance, Status |
| `v_lot_balances` | Per-lot (per DN line) balance |
| `v_item_stock` | Per-item / per-warehouse total stock |

## Roles

`ceo` › `gm` › `manager` › `dispatcher` › `warehouse` › `driver` › `viewer`

| Kaam | Kaun kar sakta hai |
|---|---|
| DN banana / PDF upload | dispatcher, warehouse, manager, gm, ceo |
| Arrival confirm | warehouse, dispatcher, manager, gm, ceo |
| Stock issue | warehouse, dispatcher, manager, gm, ceo |
| Reversal | manager, gm, ceo |
| Master data (items/suppliers) | manager, gm, ceo |
| Roles badalna | gm, ceo |

---

## Abhi baqi hai (Phase 1 ke andar)

- [ ] Warehouse ka asal naam/code client se confirm (abhi `MAIN` placeholder hai)
- [ ] PDF extraction — Edge Function
- [ ] React app ko Supabase se jorna (abhi `localStorage` par hai)
- [ ] `driver-documents` bucket — apne phase mein, **private** hi banega
