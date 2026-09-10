import { supabase } from '../lib/supabase';
import { toAppError } from '../lib/errors';
import type {
  InventoryFilter,
  InventoryPage,
  InventoryRow,
  IssueReason,
  LotBalance,
} from '../models/inventory';
import type { Tables } from '../types/database';

/**
 * The register view is spelled with the client's own column headings, spaces
 * and all. Those names work through PostgREST — filtering, ordering, `or()`
 * and pagination were all checked against the live API — but they are ugly to
 * repeat, so they are named once here.
 */
const COL = {
  dn: 'DN No',
  so: 'SO No',
  item: 'Item',
  uom: 'UOM',
  pdfQty: 'PDF Qty',
  arrivedQty: 'Arrived Qty',
  missingQty: 'Missing Qty',
  inQty: 'In Qty',
  outQty: 'Out Qty',
  balance: 'Balance',
  status: 'Status',
  discrepancy: 'Discrepancy',
} as const;

function toRow(row: Tables<'v_inventory_dashboard'>): InventoryRow {
  return {
    deliveryNoteId: row.delivery_note_id ?? '',
    dnNumber: row[COL.dn] ?? '',
    soNumber: row[COL.so] ?? '',
    printDate: row.print_date,
    supplier: row.supplier ?? '',

    itemNumber: row.item_number ?? '',
    itemDescription: row[COL.item] ?? '',
    uom: row[COL.uom] ?? '',

    pdfQty: Number(row[COL.pdfQty] ?? 0),
    arrivedQty: Number(row[COL.arrivedQty] ?? 0),
    missingQty: Number(row[COL.missingQty] ?? 0),
    inQty: Number(row[COL.inQty] ?? 0),
    outQty: Number(row[COL.outQty] ?? 0),
    balanceQty: Number(row[COL.balance] ?? 0),

    status: row[COL.status] ?? 'not_arrived',
    discrepancyCode: row[COL.discrepancy],
    receivedAt: row.received_at,
  };
}

/** `v_lot_balances` with the delivery note header PostgREST embeds alongside it. */
type LotRow = Tables<'v_lot_balances'> & {
  delivery_notes: Pick<Tables<'delivery_notes'>, 'dn_number' | 'so_number'> | null;
};

function toLot(row: LotRow): LotBalance {
  return {
    lotId: row.lot_id ?? '',
    deliveryNoteId: row.delivery_note_id ?? '',
    dnNumber: row.delivery_notes?.dn_number ?? '',
    soNumber: row.delivery_notes?.so_number ?? '',

    itemId: row.item_id ?? '',
    itemNumber: row.item_number ?? '',
    itemDescription: row.item_description ?? '',
    uom: row.uom ?? '',

    pdfQty: Number(row.pdf_qty ?? 0),
    arrivedQty: row.arrived_qty === null ? null : Number(row.arrived_qty),
    missingQty: row.missing_qty === null ? null : Number(row.missing_qty),
    status: row.status ?? 'not_arrived',
    discrepancyCode: row.discrepancy_code,
    receivedAt: row.received_at,

    inQty: Number(row.in_qty ?? 0),
    outQty: Number(row.out_qty ?? 0),
    balanceQty: Number(row.balance_qty ?? 0),
  };
}

const LOT_SELECT = '*, delivery_notes(dn_number, so_number)';

/**
 * Stock, as opposed to delivery notes.
 *
 * Everything here reads from the append-only ledger through `v_lot_balances`,
 * which derives the balance on every read rather than storing it. Writes go
 * through the `issue_stock` RPC — the frontend cannot insert a stock movement
 * directly, and the grant that would let it do so has been revoked.
 */
class InventoryServiceImpl {
  /**
   * A page of the inventory register.
   *
   * Filtering, sorting and paging all happen in the database. Pulling the
   * whole register into the browser and narrowing it there would work today
   * with a handful of rows and quietly stop working later — and the view was
   * rewritten in 0017 precisely so the cost tracks the size of the answer.
   */
  async listPage(
    filter: InventoryFilter = {},
    page = 0,
    pageSize = 50,
  ): Promise<InventoryPage> {
    let q = supabase
      .from('v_inventory_dashboard')
      .select('*', { count: 'exact' });

    const term = filter.search?.trim();
    if (term) {
      const like = `%${term}%`;
      q = q.or(
        [
          `"${COL.dn}".ilike.${like}`,
          `"${COL.so}".ilike.${like}`,
          `item_number.ilike.${like}`,
          `"${COL.item}".ilike.${like}`,
        ].join(','),
      );
    }

    if (filter.status && filter.status !== 'all') {
      q = q.eq(COL.status, filter.status);
    }

    // A note that has not been counted yet is short by its whole quantity,
    // which is not a discrepancy — it simply has not arrived. Only a line
    // somebody has actually counted can disagree with the delivery note.
    if (filter.discrepanciesOnly) {
      q = q.not('received_at', 'is', null).neq(COL.missingQty, 0);
    }

    if (filter.fromDate) q = q.gte('print_date', filter.fromDate);
    if (filter.toDate) q = q.lte('print_date', filter.toDate);

    const from = page * pageSize;
    const { data, error, count } = await q
      .order('print_date', { ascending: false, nullsFirst: false })
      .order(COL.dn, { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw toAppError(error, 'Loading the inventory register');

    return {
      rows: (data ?? []).map(toRow),
      total: count ?? 0,
    };
  }

  /**
   * Totals across everything the filter matches, not just the visible page.
   *
   * A summary that only added up the current page would be worse than no
   * summary: it would look authoritative and be wrong.
   */
  async summarise(filter: InventoryFilter = {}): Promise<{
    notes: number;
    pdfQty: number;
    missingQty: number;
    balanceQty: number;
    discrepancies: number;
  }> {
    // Every matching row is needed to total it, so ask for only the four
    // columns that go into the sum rather than the whole register.
    let q = supabase
      .from('v_inventory_dashboard')
      .select(`"${COL.pdfQty}","${COL.missingQty}","${COL.balance}",received_at`);

    const term = filter.search?.trim();
    if (term) {
      const like = `%${term}%`;
      q = q.or(
        [
          `"${COL.dn}".ilike.${like}`,
          `"${COL.so}".ilike.${like}`,
          `item_number.ilike.${like}`,
          `"${COL.item}".ilike.${like}`,
        ].join(','),
      );
    }
    if (filter.status && filter.status !== 'all') q = q.eq(COL.status, filter.status);
    if (filter.discrepanciesOnly) q = q.not('received_at', 'is', null).neq(COL.missingQty, 0);
    if (filter.fromDate) q = q.gte('print_date', filter.fromDate);
    if (filter.toDate) q = q.lte('print_date', filter.toDate);

    const { data, error } = await q;
    if (error) throw toAppError(error, 'Totalling the inventory register');

    const rows = data ?? [];
    return {
      notes: rows.length,
      pdfQty: rows.reduce((s, r) => s + Number(r[COL.pdfQty] ?? 0), 0),
      missingQty: rows.reduce((s, r) => s + Number(r[COL.missingQty] ?? 0), 0),
      balanceQty: rows.reduce((s, r) => s + Number(r[COL.balance] ?? 0), 0),
      discrepancies: rows.filter(
        (r) => r.received_at !== null && Number(r[COL.missingQty] ?? 0) !== 0,
      ).length,
    };
  }

  /** Every matching row, for export. Paging is skipped on purpose here. */
  async listAllForExport(filter: InventoryFilter = {}, cap = 5000): Promise<InventoryRow[]> {
    const { rows } = await this.listPage(filter, 0, cap);
    return rows;
  }

  /**
   * Lots that still hold stock, newest arrival first.
   *
   * NOTE ON WAREHOUSES: the balance here is per LOT, summed across every
   * warehouse, while `issue_stock` checks the balance per lot PER WAREHOUSE.
   * Today those are the same number, because stock enters a lot at exactly one
   * warehouse and nothing moves it between warehouses. The moment transfers
   * are built the two can diverge, and this needs a per-warehouse view — the
   * database will refuse the over-issue either way, but the figure on screen
   * would be wrong, which is worse.
   */
  async listLotsWithStock(limit = 100): Promise<LotBalance[]> {
    const { data, error } = await supabase
      .from('v_lot_balances')
      .select(LOT_SELECT)
      .gt('balance_qty', 0)
      .order('received_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw toAppError(error, 'Loading available stock');
    return ((data ?? []) as LotRow[]).map(toLot);
  }

  /**
   * Takes stock out of a lot.
   *
   * The quantity, the reason and the available balance are all checked inside
   * the database function, so a lot can never go negative no matter what the
   * browser sends.
   */
  async issue(input: {
    lotId: string;
    warehouseId: string;
    qty: number;
    reason: IssueReason;
    referenceNo?: string | null;
    notes?: string | null;
  }): Promise<void> {
    const { error } = await supabase.rpc('issue_stock', {
      p_lot_id: input.lotId,
      p_warehouse_id: input.warehouseId,
      p_qty: input.qty,
      p_movement_type: input.reason,
      p_reference_no: input.referenceNo?.trim() || undefined,
      p_notes: input.notes?.trim() || undefined,
    });

    if (error) throw toAppError(error, 'Issuing stock');
  }
}

export const inventoryService = new InventoryServiceImpl();
