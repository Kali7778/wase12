-- =====================================================================
--  LogiFlow — Phase 1 (part 11): create_delivery_note()
--
--  Writes the header and its line in one transaction. Doing this from the
--  client as two inserts risks leaving a delivery note with no line.
--
--  Run after 0010.
-- =====================================================================

create or replace function create_delivery_note(
  p_dn_number        text,
  p_so_number        text,
  p_supplier_code    text,
  p_item_number      text,
  p_item_description text,
  p_uom              text,
  p_pdf_qty          numeric,
  p_customer_number  text default null,
  p_customer_name    text default null,
  p_shipping_ref     text default null,
  p_ship_from        text default null,
  p_ship_to          text default null,
  p_salesman         text default null,
  p_print_date       date default null,
  p_order_date       date default null,
  p_batch_id         uuid default null,
  p_pdf_path         text default null,
  p_pdf_file_name    text default null,
  p_pdf_sha256       text default null,
  p_file_type        text default 'pdf',
  p_extraction       extraction_method default 'pdf_text',
  p_confidence       numeric default null,
  p_needs_review     text[] default '{}'
)
returns delivery_notes
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_supplier uuid;
  v_item     uuid;
  v_dn       delivery_notes;
begin
  if not has_role('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo') then
    raise exception 'Permission denied: you are not allowed to upload delivery notes.';
  end if;

  if coalesce(btrim(p_dn_number), '') = '' then
    raise exception 'Delivery note number is required.';
  end if;
  if p_pdf_qty is null or p_pdf_qty <= 0 then
    raise exception 'Quantity must be greater than zero.';
  end if;

  select id into v_supplier from suppliers where code = coalesce(p_supplier_code, 'ELKHAYYAT');
  if v_supplier is null then
    raise exception 'Supplier % is not set up.', coalesce(p_supplier_code, 'ELKHAYYAT');
  end if;

  select id into v_item from items where item_number = p_item_number;
  if v_item is null then
    raise exception 'Item % is not in the item master. Add it before uploading this slip.', p_item_number;
  end if;

  if exists (select 1 from delivery_notes where dn_number = p_dn_number) then
    raise exception 'Delivery note % has already been uploaded.', p_dn_number;
  end if;

  insert into delivery_notes (
    dn_number, so_number, supplier_id, customer_number, customer_name,
    shipping_reference, ship_from, ship_to, salesman, print_date, order_date,
    upload_batch_id, pdf_storage_path, pdf_file_name, pdf_sha256,
    source_file_type, extraction_method, extraction_confidence,
    needs_review_fields, created_by
  ) values (
    p_dn_number, p_so_number, v_supplier, p_customer_number, p_customer_name,
    p_shipping_ref, p_ship_from, p_ship_to, p_salesman, p_print_date, p_order_date,
    p_batch_id, p_pdf_path, p_pdf_file_name, p_pdf_sha256,
    p_file_type, p_extraction, p_confidence,
    coalesce(p_needs_review, '{}'), auth.uid()
  )
  returning * into v_dn;

  -- pdf_qty only. arrived_qty stays NULL until a person confirms the arrival:
  -- a supplier's claim is not stock.
  insert into delivery_note_lines (
    delivery_note_id, line_no, item_id, item_number, item_description, uom, pdf_qty
  ) values (
    v_dn.id, 1, v_item, p_item_number, p_item_description, p_uom, p_pdf_qty
  );

  return v_dn;
end
$$;

revoke all on function create_delivery_note(
  text, text, text, text, text, text, numeric, text, text, text, text, text, text,
  date, date, uuid, text, text, text, text, extraction_method, numeric, text[]
) from public, anon;

grant execute on function create_delivery_note(
  text, text, text, text, text, text, numeric, text, text, text, text, text, text,
  date, date, uuid, text, text, text, text, extraction_method, numeric, text[]
) to authenticated;
