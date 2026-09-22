-- =====================================================================
--  0032 — Bills
--
--  Phase C. A bill is written by an admin, the GM or a superadmin (D58),
--  in one of two ways:
--
--    * From a customer order (talab) slip — one live bill per slip (D60),
--      allowed as soon as the slip is saved (D66). The goods never touched
--      our stock, so the bill moves none. Its quantity starts at the
--      slip's and may be lowered, never raised (D69).
--
--    * From warehouse stock — any priced products that are in stock. The
--      goods leave the oldest stock first (D68): each line is drawn from
--      the lots in the order they were counted in, across as many lots as
--      it takes, and every draw is an ordinary OUT movement in the stock
--      ledger. Stock can never go below zero.
--
--  Every bill has a name on it (D71): a customer from the list, or — for
--  someone paying on the spot — a name typed in, with an optional phone.
--  A cash customer's bill, and every walk-in's, is paid the moment it is
--  written (D67). Weekly customers' bills stay unpaid; settling them is
--  Phase D.
--
--  Each goods line keeps the list price and the price actually charged
--  (D53); a different figure may carry a reason, but need not (D72).
--  Transport and labour are lines of their own, amount typed in (D55).
--
--  A bill is never edited or deleted (D59). A wrong one is cancelled with
--  a reason — its stock comes back through reversal rows — and a new one
--  is written. Numbers run INV-000001, INV-000002, … with no gaps (D62):
--  they come from a single locked counter, not a sequence, because a
--  sequence skips a number whenever a transaction rolls back.
--
--  The company details are copied onto the bill when it is written, so a
--  later change of address does not rewrite old bills.
--
--  No VAT yet (D54). Totals are never stored: they are summed from the
--  lines, which cannot change.
-- =====================================================================


do $$
begin
  if not exists (select 1 from pg_type where typname = 'bill_kind') then
    create type bill_kind as enum ('talab', 'stock');
  end if;
  if not exists (select 1 from pg_type where typname = 'bill_line_kind') then
    create type bill_line_kind as enum ('goods', 'transport', 'labour');
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. The counter
-- ---------------------------------------------------------------------

create table bill_counter (
  id           boolean primary key default true,
  last_number  integer not null default 0,
  constraint bill_counter_single_row check (id),
  constraint bill_counter_not_negative check (last_number >= 0)
);

insert into bill_counter (id, last_number) values (true, 0) on conflict (id) do nothing;

-- Nobody reads or writes it directly; create_bill() is its only user.
alter table bill_counter enable row level security;


-- ---------------------------------------------------------------------
-- 2. Bills and their lines
-- ---------------------------------------------------------------------

create table bills (
  id                 uuid primary key default gen_random_uuid(),
  seq                integer not null unique,
  bill_number        text not null unique,
  kind               bill_kind not null,

  delivery_note_id   uuid references delivery_notes(id),

  -- Who it is for. A customer from the list, or a name typed at the till.
  customer_id        uuid references customers(id),
  walk_in_name       text,
  walk_in_phone      text,

  -- What was printed, as it was on the day.
  customer_name      text not null,
  customer_name_ar   text,
  customer_phone     text,
  customer_terms     customer_terms not null,
  company            jsonb not null,

  note               text,
  created_at         timestamptz not null default now(),
  created_by         uuid not null references user_tbl(id),

  paid_at            timestamptz,
  paid_by            uuid references user_tbl(id),

  cancelled_at       timestamptz,
  cancelled_by       uuid references user_tbl(id),
  cancel_reason      text,

  constraint bill_number_matches_seq check (bill_number = 'INV-' || lpad(seq::text, 6, '0')),
  constraint talab_bill_has_slip check ((kind = 'talab') = (delivery_note_id is not null)),
  constraint bill_names_someone check (
    (customer_id is not null and walk_in_name is null and walk_in_phone is null)
    or (customer_id is null and nullif(btrim(walk_in_name), '') is not null)
  ),
  constraint walk_in_is_stock_sale check (customer_id is not null or kind = 'stock'),
  constraint walk_in_pays_cash check (customer_id is not null or customer_terms = 'cash'),
  constraint payment_is_complete check ((paid_at is null) = (paid_by is null)),
  constraint cancel_is_complete check (
    (cancelled_at is null and cancelled_by is null and cancel_reason is null)
    or (cancelled_at is not null and cancelled_by is not null
        and nullif(btrim(cancel_reason), '') is not null)
  )
);

comment on table bills is
  'Customer bills. Never edited or deleted: a wrong bill is cancelled with a reason and written again.';

-- One live bill per customer order slip (D60). A cancelled one does not count.
create unique index bills_one_live_per_slip
  on bills (delivery_note_id)
  where delivery_note_id is not null and cancelled_at is null;

create index bills_created_idx  on bills (created_at desc);
create index bills_customer_idx on bills (customer_id, created_at desc) where customer_id is not null;


create table bill_lines (
  id           uuid primary key default gen_random_uuid(),
  bill_id      uuid not null references bills(id),
  line_no      integer not null,
  kind         bill_line_kind not null,

  item_id      uuid references items(id),
  description  text not null,
  uom          text,
  qty          numeric(14, 3) not null,
  -- The price on the list when the bill was written; goods only.
  list_price   numeric(12, 2),
  -- What was actually charged per unit.
  unit_price   numeric(12, 2) not null,
  revise_note  text,

  unique (bill_id, line_no),
  constraint bill_line_qty_positive   check (qty > 0),
  constraint bill_line_price_positive check (unit_price > 0),
  constraint goods_line_is_a_product check (
    (kind = 'goods' and item_id is not null and list_price is not null)
    or (kind <> 'goods' and item_id is null and list_price is null and qty = 1)
  )
);

create index bill_lines_bill_idx on bill_lines (bill_id, line_no);


-- Which stock movements a goods line drew on — one line may draw on
-- several lots. Kept beside the ledger rather than in it, so the stock
-- table itself is untouched.
create table bill_stock_movements (
  bill_line_id       uuid not null references bill_lines(id),
  stock_movement_id  uuid not null references stock_movements(id),
  primary key (bill_line_id, stock_movement_id)
);

create index bill_stock_movements_mv_idx on bill_stock_movements (stock_movement_id);


-- ---------------------------------------------------------------------
-- 3. Nothing written is rewritten
-- ---------------------------------------------------------------------

create or replace function private.block_bill_record_write()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  raise exception 'A bill, once written, cannot be %. Cancel it and write a new one.',
    case tg_op when 'UPDATE' then 'changed' else 'removed' end;
end
$$;

revoke all on function private.block_bill_record_write() from public, anon, authenticated;

create trigger bill_lines_no_update before update on bill_lines
  for each row execute function private.block_bill_record_write();
create trigger bill_lines_no_delete before delete on bill_lines
  for each row execute function private.block_bill_record_write();
create trigger bill_stock_movements_no_update before update on bill_stock_movements
  for each row execute function private.block_bill_record_write();
create trigger bill_stock_movements_no_delete before delete on bill_stock_movements
  for each row execute function private.block_bill_record_write();
create trigger bills_no_delete before delete on bills
  for each row execute function private.block_bill_record_write();

-- A bill may change in exactly two ways: it is paid, or it is cancelled.
-- Everything printed on it is frozen.
create or replace function private.freeze_bill()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if (new.seq, new.bill_number, new.kind, new.delivery_note_id, new.customer_id,
      new.walk_in_name, new.walk_in_phone, new.customer_name, new.customer_name_ar,
      new.customer_phone, new.customer_terms, new.company, new.note,
      new.created_at, new.created_by)
     is distinct from
     (old.seq, old.bill_number, old.kind, old.delivery_note_id, old.customer_id,
      old.walk_in_name, old.walk_in_phone, old.customer_name, old.customer_name_ar,
      old.customer_phone, old.customer_terms, old.company, old.note,
      old.created_at, old.created_by)
  then
    raise exception 'A bill, once written, cannot be changed. Cancel it and write a new one.';
  end if;
  if old.cancelled_at is not null then
    raise exception 'Bill % is cancelled and cannot change.', old.bill_number;
  end if;
  if old.paid_at is not null and new.paid_at is distinct from old.paid_at then
    raise exception 'Bill % is already paid.', old.bill_number;
  end if;
  return new;
end
$$;

revoke all on function private.freeze_bill() from public, anon, authenticated;

create trigger bills_frozen before update on bills
  for each row execute function private.freeze_bill();


-- ---------------------------------------------------------------------
-- 4. Who may read
-- ---------------------------------------------------------------------

alter table bills enable row level security;
alter table bill_lines enable row level security;
alter table bill_stock_movements enable row level security;

create policy bills_read on bills
  for select to authenticated
  using ((select private.has_role('ceo', 'gm', 'manager', 'admin')));

create policy bill_lines_read on bill_lines
  for select to authenticated
  using ((select private.has_role('ceo', 'gm', 'manager', 'admin')));

create policy bill_stock_movements_read on bill_stock_movements
  for select to authenticated
  using ((select private.has_role('ceo', 'gm', 'manager', 'admin')));

-- No write policies anywhere: bills are written by create_bill() and
-- changed only by cancel_bill().


-- ---------------------------------------------------------------------
-- 5. What can be sold from the warehouse
--
-- Every active product with its current price and what is in stock of it.
-- Only stock slips count; a customer order slip never holds stock.
-- ---------------------------------------------------------------------

create or replace view v_sellable_items as
  select i.id           as item_id,
         i.item_number,
         i.description_en,
         i.description_ar,
         i.uom,
         p.price,
         coalesce(s.in_stock, 0) as in_stock
    from items i
    left join lateral (
      select ip.price
        from item_prices ip
       where ip.item_id = i.id
       order by ip.created_at desc, ip.id desc
       limit 1
    ) p on true
    left join lateral (
      select sum(case m.direction when 'IN' then m.qty else -m.qty end) as in_stock
        from stock_movements m
        join delivery_note_lines l on l.id = m.delivery_note_line_id
        join delivery_notes d on d.id = l.delivery_note_id
       where m.item_id = i.id
         and d.purpose = 'stock'
    ) s on true
   where i.is_active
     and (select private.has_role('ceo', 'gm', 'manager', 'admin'));

alter view v_sellable_items set (security_invoker = off);
revoke all on v_sellable_items from anon;
grant select on v_sellable_items to authenticated;


-- ---------------------------------------------------------------------
-- 6. Writing a bill
--
-- p_lines is a JSON array of goods lines:
--   [{ "item_id": "…", "qty": 750, "unit_price": 18.50, "revise_note": "…" }]
-- `unit_price` is left out to charge the list price.
-- ---------------------------------------------------------------------

create or replace function create_bill(
  p_kind              bill_kind,
  p_lines             jsonb,
  p_customer_id       uuid    default null,
  p_walk_in_name      text    default null,
  p_walk_in_phone     text    default null,
  p_delivery_note_id  uuid    default null,
  p_transport         numeric default null,
  p_labour            numeric default null,
  p_note              text    default null
)
returns bills
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_seq        integer;
  v_company    company_profile;
  v_customer   customers;
  v_slip       delivery_notes;
  v_bill       bills;
  v_line       jsonb;
  v_item       items;
  v_item_id    uuid;
  v_qty        numeric;
  v_list       numeric;
  v_unit       numeric;
  v_revise     text;
  v_line_no    integer := 0;
  v_line_id    uuid;
  v_slip_qty   numeric;
  v_left       numeric;
  v_take       numeric;
  v_lot        record;
  v_mv_id      uuid;
  v_seen       uuid[] := '{}';
  v_walk_name  text := nullif(btrim(coalesce(p_walk_in_name, '')), '');
  v_walk_phone text := nullif(btrim(coalesce(p_walk_in_phone, '')), '');
begin
  if not has_role('admin', 'gm', 'ceo') then
    raise exception 'Permission denied: only an admin, the GM or a superadmin can write a bill.';
  end if;

  -- Bills are written one at a time: the counter row is the queue. This is
  -- what keeps the numbers gapless and stops two bills drawing on the same
  -- stock at once.
  select last_number + 1 into v_seq from bill_counter where id for update;

  select * into v_company from company_profile where id;
  if v_company.name_en is null then
    raise exception 'Fill in the company details first — they head every bill.';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Add at least one product to the bill.';
  end if;

  -- ---- who it is for ----------------------------------------------------
  if p_kind = 'talab' then
    if p_delivery_note_id is null then
      raise exception 'Choose the customer order this bill is for.';
    end if;
    select * into v_slip from delivery_notes where id = p_delivery_note_id for update;
    if not found then
      raise exception 'That delivery note does not exist.';
    end if;
    if v_slip.purpose <> 'talab' then
      raise exception 'Delivery note % is warehouse stock. Sell it from stock instead.', v_slip.dn_number;
    end if;
    if v_slip.workflow_status in ('rejected', 'replaced') then
      raise exception 'Delivery note % was %, so it cannot be billed.',
        v_slip.dn_number, v_slip.workflow_status;
    end if;
    if exists (select 1 from bills b
                where b.delivery_note_id = v_slip.id and b.cancelled_at is null) then
      raise exception 'Delivery note % already has a bill. Cancel that one first to write another.',
        v_slip.dn_number;
    end if;
    if v_walk_name is not null or v_walk_phone is not null then
      raise exception 'A customer order is billed to the customer on the slip.';
    end if;
    if p_customer_id is not null and p_customer_id <> v_slip.customer_id then
      raise exception 'A customer order is billed to the customer on the slip.';
    end if;
    select * into v_customer from customers where id = v_slip.customer_id;
  else
    if p_delivery_note_id is not null then
      raise exception 'A sale from stock is not tied to one delivery note.';
    end if;
    if p_customer_id is not null and v_walk_name is not null then
      raise exception 'Choose a customer from the list or type a name, not both.';
    end if;
    if p_customer_id is null and v_walk_name is null then
      raise exception 'Every bill needs a name: choose a customer, or tick "on the spot" and type one.';
    end if;
    if v_walk_name is null and v_walk_phone is not null then
      raise exception 'A phone number is only typed in for an on-the-spot customer.';
    end if;
    if p_customer_id is not null then
      select * into v_customer from customers where id = p_customer_id;
      if not found then
        raise exception 'That customer does not exist.';
      end if;
      if not v_customer.is_active then
        raise exception '% is retired. Restore them on the Customers screen to bill them.', v_customer.name;
      end if;
    end if;
  end if;

  if p_transport is not null and (p_transport <= 0 or p_transport <> round(p_transport, 2)) then
    raise exception 'Transport must be more than zero, with at most two decimals.';
  end if;
  if p_labour is not null and (p_labour <= 0 or p_labour <> round(p_labour, 2)) then
    raise exception 'Labour must be more than zero, with at most two decimals.';
  end if;

  -- ---- the bill ---------------------------------------------------------
  update bill_counter set last_number = v_seq where id;

  insert into bills (
    seq, bill_number, kind, delivery_note_id,
    customer_id, walk_in_name, walk_in_phone,
    customer_name, customer_name_ar, customer_phone, customer_terms,
    company, note, created_by, paid_at, paid_by
  ) values (
    v_seq, 'INV-' || lpad(v_seq::text, 6, '0'), p_kind, p_delivery_note_id,
    v_customer.id, v_walk_name, v_walk_phone,
    coalesce(v_customer.name, v_walk_name), v_customer.name_ar,
    coalesce(v_customer.phone, v_walk_phone),
    coalesce(v_customer.terms, 'cash'),
    jsonb_build_object(
      'name_en', v_company.name_en, 'name_ar', v_company.name_ar,
      'address_en', v_company.address_en, 'address_ar', v_company.address_ar,
      'phone', v_company.phone, 'cr_number', v_company.cr_number,
      'vat_number', v_company.vat_number, 'logo_path', v_company.logo_path
    ),
    nullif(btrim(coalesce(p_note, '')), ''),
    auth.uid(),
    -- Cash customers and walk-ins pay as they buy (D67).
    case when coalesce(v_customer.terms, 'cash') = 'cash' then now() end,
    case when coalesce(v_customer.terms, 'cash') = 'cash' then auth.uid() end
  )
  returning * into v_bill;

  -- ---- the goods --------------------------------------------------------
  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    begin
      v_item_id := (v_line ->> 'item_id')::uuid;
      v_qty     := (v_line ->> 'qty')::numeric;
      v_unit    := (v_line ->> 'unit_price')::numeric;
    exception when others then
      raise exception 'A line on the bill is not readable: %', v_line;
    end;
    v_revise := nullif(btrim(coalesce(v_line ->> 'revise_note', '')), '');

    select * into v_item from items where id = v_item_id;
    if not found then
      raise exception 'A product on the bill does not exist.';
    end if;
    if v_item_id = any (v_seen) then
      raise exception 'Put % on the bill once, with the whole quantity.', v_item.description_en;
    end if;
    v_seen := v_seen || v_item_id;

    if v_qty is null or v_qty <= 0 then
      raise exception 'The quantity of % must be more than zero.', v_item.description_en;
    end if;
    if v_qty <> round(v_qty, 3) then
      raise exception 'The quantity of % has too many decimals.', v_item.description_en;
    end if;

    select price into v_list
      from item_prices where item_id = v_item_id
     order by created_at desc, id desc limit 1;
    if v_list is null then
      raise exception '% has no price yet. Set it on the Prices screen first.', v_item.description_en;
    end if;

    v_unit := coalesce(v_unit, v_list);
    if v_unit <= 0 or v_unit <> round(v_unit, 2) then
      raise exception 'The price of % must be more than zero, with at most two decimals.',
        v_item.description_en;
    end if;
    -- A reason belongs to a changed price only.
    if v_unit = v_list then
      v_revise := null;
    end if;

    if p_kind = 'talab' then
      -- The bill can only carry what the slip carries, and no more of it (D69).
      select sum(l.pdf_qty) into v_slip_qty
        from delivery_note_lines l
       where l.delivery_note_id = v_slip.id and l.item_id = v_item_id;
      if v_slip_qty is null then
        raise exception '% is not on delivery note %.', v_item.description_en, v_slip.dn_number;
      end if;
      if v_qty > v_slip_qty then
        raise exception 'Delivery note % has % of %; the bill cannot charge for more.',
          v_slip.dn_number, trim_scale(v_slip_qty), v_item.description_en;
      end if;
    end if;

    v_line_no := v_line_no + 1;
    insert into bill_lines (bill_id, line_no, kind, item_id, description, uom, qty,
                            list_price, unit_price, revise_note)
    values (v_bill.id, v_line_no, 'goods', v_item_id, v_item.description_en, v_item.uom, v_qty,
            v_list, v_unit, v_revise)
    returning id into v_line_id;

    if p_kind = 'stock' then
      -- Oldest stock first (D68): lots in the order they were counted in.
      v_left := v_qty;
      for v_lot in
        select l.id as lot_id, m.warehouse_id,
               min(m.occurred_at) filter (where m.direction = 'IN') as first_in,
               sum(case m.direction when 'IN' then m.qty else -m.qty end) as balance
          from delivery_note_lines l
          join delivery_notes d on d.id = l.delivery_note_id
          join stock_movements m on m.delivery_note_line_id = l.id
         where l.item_id = v_item_id
           and d.purpose = 'stock'
         group by l.id, m.warehouse_id
        having sum(case m.direction when 'IN' then m.qty else -m.qty end) > 0
         order by first_in, l.id
      loop
        exit when v_left <= 0;
        -- Lock the lot the same way issue_stock() does, so a stock-out on
        -- the other screen cannot draw on it at the same moment.
        perform 1 from delivery_note_lines where id = v_lot.lot_id for update;
        v_take := least(v_left, v_lot.balance);

        insert into stock_movements (item_id, warehouse_id, direction, qty, movement_type,
                                     delivery_note_line_id, reference_no, created_by, notes)
        values (v_item_id, v_lot.warehouse_id, 'OUT', v_take, 'sale',
                v_lot.lot_id, v_bill.bill_number, auth.uid(), 'Sold on ' || v_bill.bill_number)
        returning id into v_mv_id;

        insert into bill_stock_movements (bill_line_id, stock_movement_id)
        values (v_line_id, v_mv_id);

        v_left := v_left - v_take;
      end loop;

      if v_left > 0 then
        raise exception 'Not enough % in stock: % short.', v_item.description_en, trim_scale(v_left);
      end if;
    end if;
  end loop;

  -- ---- the services (D55) ----------------------------------------------
  if p_transport is not null then
    v_line_no := v_line_no + 1;
    insert into bill_lines (bill_id, line_no, kind, description, qty, unit_price)
    values (v_bill.id, v_line_no, 'transport', 'Transport', 1, p_transport);
  end if;
  if p_labour is not null then
    v_line_no := v_line_no + 1;
    insert into bill_lines (bill_id, line_no, kind, description, qty, unit_price)
    values (v_bill.id, v_line_no, 'labour', 'Labour', 1, p_labour);
  end if;

  return v_bill;
end
$fn$;

revoke all on function create_bill(bill_kind, jsonb, uuid, text, text, uuid, numeric, numeric, text)
  from public, anon;
grant execute on function create_bill(bill_kind, jsonb, uuid, text, text, uuid, numeric, numeric, text)
  to authenticated;


-- ---------------------------------------------------------------------
-- 7. Cancelling one (D59)
-- ---------------------------------------------------------------------

create or replace function cancel_bill(p_bill_id uuid, p_reason text)
returns bills
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  v_bill bills;
  v_mv   stock_movements;
begin
  if not has_role('admin', 'gm', 'ceo') then
    raise exception 'Permission denied: only an admin, the GM or a superadmin can cancel a bill.';
  end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Say why the bill is being cancelled.';
  end if;

  select * into v_bill from bills where id = p_bill_id for update;
  if not found then
    raise exception 'That bill does not exist.';
  end if;
  if v_bill.cancelled_at is not null then
    raise exception 'Bill % is already cancelled.', v_bill.bill_number;
  end if;

  -- Stock sold on the bill goes back where it came from — as new rows,
  -- the ledger is never edited.
  for v_mv in
    select m.*
      from bill_stock_movements bsm
      join bill_lines bl on bl.id = bsm.bill_line_id
      join stock_movements m on m.id = bsm.stock_movement_id
     where bl.bill_id = v_bill.id
  loop
    insert into stock_movements (item_id, warehouse_id, direction, qty, movement_type,
                                 delivery_note_line_id, reference_no, reversal_of,
                                 created_by, notes)
    values (v_mv.item_id, v_mv.warehouse_id, 'IN', v_mv.qty, 'reversal',
            v_mv.delivery_note_line_id, v_bill.bill_number, v_mv.id,
            auth.uid(), 'Bill ' || v_bill.bill_number || ' cancelled: ' || btrim(p_reason));
  end loop;

  update bills
     set cancelled_at  = now(),
         cancelled_by  = auth.uid(),
         cancel_reason = btrim(p_reason)
   where id = v_bill.id
  returning * into v_bill;

  return v_bill;
end
$fn$;

revoke all on function cancel_bill(uuid, text) from public, anon;
grant execute on function cancel_bill(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 8. Reading them
-- ---------------------------------------------------------------------

-- One row per bill, with its totals summed from the lines.
create or replace view v_bills as
  select b.id,
         b.bill_number,
         b.seq,
         b.kind,
         b.created_at,
         b.delivery_note_id,
         d.dn_number,
         b.customer_id,
         b.walk_in_name is not null as is_walk_in,
         b.customer_name,
         b.customer_name_ar,
         b.customer_phone,
         b.customer_terms,
         b.company,
         b.note,
         t.goods_total,
         t.services_total,
         t.goods_total + t.services_total as total,
         b.paid_at,
         b.cancelled_at,
         b.cancel_reason,
         nullif(btrim(coalesce(cu.first_name, '') || ' ' || coalesce(cu.last_name, '')), '')
           as created_by_name,
         nullif(btrim(coalesce(xu.first_name, '') || ' ' || coalesce(xu.last_name, '')), '')
           as cancelled_by_name
    from bills b
    left join delivery_notes d on d.id = b.delivery_note_id
    left join lateral (
      select coalesce(sum(round(l.qty * l.unit_price, 2)) filter (where l.kind = 'goods'), 0)
               as goods_total,
             coalesce(sum(l.unit_price) filter (where l.kind <> 'goods'), 0)
               as services_total
        from bill_lines l
       where l.bill_id = b.id
    ) t on true
    left join user_tbl cu on cu.id = b.created_by
    left join user_tbl xu on xu.id = b.cancelled_by
   where (select private.has_role('ceo', 'gm', 'manager', 'admin'));

alter view v_bills set (security_invoker = off);
revoke all on v_bills from anon;
grant select on v_bills to authenticated;


create or replace view v_bill_lines as
  select l.bill_id,
         l.line_no,
         l.kind,
         l.item_id,
         i.item_number,
         l.description,
         l.uom,
         l.qty,
         l.list_price,
         l.unit_price,
         round(l.qty * l.unit_price, 2)                  as amount,
         l.list_price is not null and l.unit_price <> l.list_price as is_revised,
         l.revise_note
    from bill_lines l
    left join items i on i.id = l.item_id
   where (select private.has_role('ceo', 'gm', 'manager', 'admin'));

alter view v_bill_lines set (security_invoker = off);
revoke all on v_bill_lines from anon;
grant select on v_bill_lines to authenticated;
