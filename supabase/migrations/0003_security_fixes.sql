-- =====================================================================
--  LogiFlow — Phase 1 (part 3): SECURITY FIXES
--
--  Yeh do bugs live API test se pakre gaye (0001/0002 apply karne ke baad).
--  Data abhi database mein nahi tha, isliye koi leak nahi hua.
--
--  0002 ke BAAD chalayen.
-- =====================================================================


-- ---------------------------------------------------------------------
--  BUG 1 (CRITICAL) — has_role() NULL return karta tha, aur
--                     `if not NULL then` kabhi chalta hi nahi
--
--  Purana code:
--      select current_user_role() = any(p_roles)
--
--  Bina login ke current_user_role() = NULL hoti hai, to:
--      NULL = any(...)   →  NULL
--      not NULL          →  NULL
--      if NULL then      →  chalta hi nahi  ← exception raise NAHI hua
--
--  Natija: RPC functions ka role check bypass ho gaya. Chunki teeno
--  functions SECURITY DEFINER hain, koi bhi shaks sirf anon key se
--  stock receive/issue kar sakta tha.
--
--  Saboot (live test):
--      POST /rest/v1/rpc/receive_delivery_note_line   (bina login)
--      → "DN line nahi mili: 000...000"     ← role check paar kar gaya
--      → hona chahiye tha: "Ijazat nahi"
--
--  Fix: coalesce(..., false). Ek hi jagah — teeno call sites theek ho jate hain.
-- ---------------------------------------------------------------------
create or replace function has_role(variadic p_roles user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_user_role() = any(p_roles), false)
$$;

comment on function has_role(user_role[]) is
  'Hamesha true/false deta hai, kabhi NULL nahi. NULL "if not ..." check ko chupke se bypass kar deta hai.';


-- ---------------------------------------------------------------------
--  BUG 2 (CRITICAL) — Views RLS bypass kar rahi thin
--
--  Postgres 15+ mein view ka default `security_invoker = off` hota hai,
--  yaani view apne OWNER (postgres) ke ikhtiyar se chalti hai —
--  neeche wali tables ki RLS bilkul lagti hi nahi.
--
--  Supabase in views ko PostgREST par expose bhi karta hai, aur anon ko
--  SELECT grant bhi milta hai. Test mein teeno views ne HTTP 200 diya.
--
--  Abhi khali [] aaya kyunki tables khali thin. Data aate hi
--  v_inventory_dashboard har delivery note kisi bhi anon user ko
--  dikha deti — public key to browser bundle mein hoti hi hai.
--
--  Fix: security_invoker on. Ab view use karne wale ke ikhtiyar se
--  chalegi, aur RLS lagu rahegi.
-- ---------------------------------------------------------------------
alter view v_lot_balances        set (security_invoker = on);
alter view v_inventory_dashboard set (security_invoker = on);
alter view v_item_stock          set (security_invoker = on);


-- ---------------------------------------------------------------------
--  Verification — yeh chala kar check karein
-- ---------------------------------------------------------------------

-- 1. Teeno views par security_invoker = true hona chahiye
--
--    select c.relname as view_name,
--           coalesce(
--             (select option_value from pg_options_to_table(c.reloptions)
--               where option_name = 'security_invoker'),
--             'false'
--           ) as security_invoker
--      from pg_class c
--      join pg_namespace n on n.oid = c.relnamespace
--     where n.nspname = 'public' and c.relkind = 'v'
--     order by 1;

-- 2. has_role bina login ke false deni chahiye (NULL nahi)
--
--    select has_role('ceo') as should_be_false;
--
--    NOTE: SQL Editor postgres user ke tor par chalta hai, isliye
--    asal test app se ya anon key se karein.
