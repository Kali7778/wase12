import { supabase } from '../lib/supabase';
import { toAppError } from '../lib/errors';
import type { IssueReason, LotBalance } from '../models/inventory';
import type { Tables } from '../types/database';

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
