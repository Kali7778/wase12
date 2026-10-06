import { supabase } from '../lib/supabase';
import { toAppError } from '../lib/errors';
import type { ShortfallOwner } from '../models/ledger';
import type {
  Bill,
  BillCompany,
  BillKind,
  BillLine,
  BillWithLines,
  CollectionStatus,
  DraftLine,
  PaymentCollection,
  SellableItem,
} from '../models/billing';
import type { Tables } from '../types/database';

type BillRow = Tables<'v_bills'>;

const toBill = (row: BillRow): Bill => ({
  id: row.id as string,
  billNumber: row.bill_number as string,
  kind: row.kind as BillKind,
  createdAt: row.created_at as string,
  deliveryNoteId: row.delivery_note_id,
  dnNumber: row.dn_number,
  customerId: row.customer_id,
  isWalkIn: Boolean(row.is_walk_in),
  customerName: row.customer_name as string,
  customerNameAr: row.customer_name_ar,
  customerPhone: row.customer_phone,
  customerTerms: row.customer_terms as Bill['customerTerms'],
  company: (row.company ?? {}) as unknown as BillCompany,
  note: row.note,
  goodsTotal: Number(row.goods_total ?? 0),
  servicesTotal: Number(row.services_total ?? 0),
  total: Number(row.total ?? 0),
  paidAmount: Number(row.paid_amount ?? 0),
  outstanding: Number(row.outstanding ?? 0),
  paidAt: row.paid_at,
  cancelledAt: row.cancelled_at,
  cancelReason: row.cancel_reason,
  createdByName: row.created_by_name,
  cancelledByName: row.cancelled_by_name,
  collectionStatus: row.collection_status as Bill['collectionStatus'],
  collectionDriverName: row.collection_driver_name,
  collectionId: row.collection_id,
});

const toCollection = (row: Tables<'v_payment_collections'>): PaymentCollection => ({
  id: row.id as string,
  status: row.status as CollectionStatus,
  billId: row.bill_id as string,
  billNumber: row.bill_number as string,
  billKind: row.bill_kind as BillKind,
  billDate: row.bill_date as string,
  dnNumber: row.dn_number,
  customerId: row.customer_id,
  customerName: row.customer_name as string,
  customerNameAr: row.customer_name_ar,
  customerPhone: row.customer_phone,
  customerAddress: row.customer_address,
  amount: Number(row.amount ?? 0),
  driverId: row.driver_id as string,
  driverName: row.driver_name as string,
  assignedAt: row.assigned_at as string,
  assignedByName: row.assigned_by_name as string,
  note: row.note,
  collectedAt: row.collected_at,
  collectedNote: row.collected_note,
  receivedAt: row.received_at,
  receivedByName: row.received_by_name,
  receivedNote: row.received_note,
  closedAt: row.closed_at,
  closedReason: row.closed_reason,
});

export interface NewBill {
  kind: BillKind;
  lines: DraftLine[];
  customerId?: string;
  walkInName?: string;
  walkInPhone?: string;
  deliveryNoteId?: string;
  transport?: number;
  labour?: number;
  note?: string;
}

/**
 * Bills: writing, reading and cancelling them.
 *
 * Every rule — who may, which name, what may be charged, how stock leaves,
 * the numbering — lives in create_bill() and cancel_bill(). This class only
 * carries the request and reads the answer.
 */
class BillingServiceImpl {
  async listBills(
    options: { search?: string; kind?: BillKind; liveOnly?: boolean; limit?: number } = {},
  ): Promise<Bill[]> {
    let query = supabase
      .from('v_bills')
      .select('*')
      .order('seq', { ascending: false })
      .limit(options.limit ?? 200);

    if (options.kind) query = query.eq('kind', options.kind);
    if (options.liveOnly) query = query.is('cancelled_at', null);

    const term = options.search?.trim();
    if (term) {
      query = query.or(
        `bill_number.ilike.%${term}%,customer_name.ilike.%${term}%,dn_number.ilike.%${term}%`,
      );
    }

    const { data, error } = await query;
    if (error) throw toAppError(error, 'Loading bills');
    return (data ?? []).map(toBill);
  }

  async getBill(id: string): Promise<BillWithLines | null> {
    const [head, lines] = await Promise.all([
      supabase.from('v_bills').select('*').eq('id', id).maybeSingle(),
      supabase.from('v_bill_lines').select('*').eq('bill_id', id).order('line_no'),
    ]);
    if (head.error) throw toAppError(head.error, 'Loading the bill');
    if (lines.error) throw toAppError(lines.error, 'Loading the bill');
    if (!head.data) return null;

    return {
      ...toBill(head.data),
      lines: (lines.data ?? []).map(
        (l): BillLine => ({
          lineNo: l.line_no as number,
          kind: l.kind as BillLine['kind'],
          itemId: l.item_id,
          itemNumber: l.item_number,
          description: l.description as string,
          uom: l.uom,
          qty: Number(l.qty),
          listPrice: l.list_price === null ? null : Number(l.list_price),
          unitPrice: Number(l.unit_price),
          amount: Number(l.amount),
          isRevised: Boolean(l.is_revised),
          reviseNote: l.revise_note,
        }),
      ),
    };
  }

  /** Products that can be sold from the warehouse, with price and stock. */
  async listSellable(): Promise<SellableItem[]> {
    const { data, error } = await supabase
      .from('v_sellable_items')
      .select('*')
      .order('description_en');
    if (error) throw toAppError(error, 'Loading products for sale');

    return (data ?? []).map((r) => ({
      itemId: r.item_id as string,
      itemNumber: r.item_number as string,
      descriptionEn: r.description_en as string,
      descriptionAr: r.description_ar,
      uom: r.uom as string,
      price: r.price === null ? null : Number(r.price),
      inStock: Number(r.in_stock ?? 0),
    }));
  }

  async createBill(input: NewBill): Promise<string> {
    const lines = input.lines.map((l) => ({
      item_id: l.itemId,
      qty: l.qty,
      ...(l.revisedPrice !== null ? { unit_price: l.revisedPrice } : {}),
      ...(l.revisedPrice !== null && l.reviseNote.trim() ? { revise_note: l.reviseNote.trim() } : {}),
    }));

    const { data, error } = await supabase.rpc('create_bill', {
      p_kind: input.kind,
      p_lines: lines,
      p_customer_id: input.customerId,
      p_walk_in_name: input.walkInName?.trim() || undefined,
      p_walk_in_phone: input.walkInPhone?.trim() || undefined,
      p_delivery_note_id: input.deliveryNoteId,
      p_transport: input.transport,
      p_labour: input.labour,
      p_note: input.note?.trim() || undefined,
    });
    if (error) throw toAppError(error, 'Writing the bill');
    return (data as Tables<'bills'>).id;
  }

  async cancelBill(id: string, reason: string): Promise<void> {
    const { error } = await supabase.rpc('cancel_bill', { p_bill_id: id, p_reason: reason });
    if (error) throw toAppError(error, 'Cancelling the bill');
  }

  // --- collecting what is owed (0033) -------------------------------------

  /**
   * Collection jobs. A driver's own are all the database will show them,
   * whatever is asked for here.
   */
  async listCollections(
    options: { liveOnly?: boolean; driverId?: string; limit?: number } = {},
  ): Promise<PaymentCollection[]> {
    let query = supabase
      .from('v_payment_collections')
      .select('*')
      .order('assigned_at', { ascending: false })
      .limit(options.limit ?? 200);

    if (options.liveOnly) query = query.in('status', ['with_driver', 'collected']);
    if (options.driverId) query = query.eq('driver_id', options.driverId);

    const { data, error } = await query;
    if (error) throw toAppError(error, 'Loading collections');
    return (data ?? []).map(toCollection);
  }

  /** The GM sends a bill out with a driver. */
  async assignCollection(billId: string, driverId: string, note?: string): Promise<void> {
    const { error } = await supabase.rpc('assign_collection', {
      p_bill_id: billId,
      p_driver_id: driverId,
      p_note: note?.trim() || undefined,
    });
    if (error) throw toAppError(error, 'Sending the bill out for collection');
  }

  async markCollected(collectionId: string, note?: string): Promise<void> {
    const { error } = await supabase.rpc('driver_collected', {
      p_collection_id: collectionId,
      p_note: note?.trim() || undefined,
    });
    if (error) throw toAppError(error, 'Marking the money collected');
  }

  async markNotCollected(collectionId: string, reason: string): Promise<void> {
    const { error } = await supabase.rpc('driver_declined', {
      p_collection_id: collectionId,
      p_reason: reason,
    });
    if (error) throw toAppError(error, 'Reporting that the money was not collected');
  }

  /**
   * The GM takes the money in. Less than the whole amount is allowed, but
   * then the GM must say where the rest sits — with the driver, who then
   * owes it, or still with the customer, whose bill stays open (D82, D83).
   */
  async confirmCollection(input: {
    collectionId: string;
    amount: number;
    shortfallOwner?: ShortfallOwner;
    description?: string;
    note?: string;
  }): Promise<void> {
    const { error } = await supabase.rpc('confirm_collection', {
      p_collection_id: input.collectionId,
      p_amount: input.amount,
      p_shortfall_owner: input.shortfallOwner,
      p_description: input.description?.trim() || undefined,
      p_note: input.note?.trim() || undefined,
    });
    if (error) throw toAppError(error, 'Taking the money in');
  }

  async cancelCollection(collectionId: string, reason: string): Promise<void> {
    const { error } = await supabase.rpc('cancel_collection', {
      p_collection_id: collectionId,
      p_reason: reason,
    });
    if (error) throw toAppError(error, 'Taking the collection back');
  }

  /**
   * Paid at the office or by transfer, with no driver involved (D77).
   * Leaving the amount out settles whatever is still outstanding.
   */
  async recordPayment(billId: string, amount?: number, note?: string): Promise<void> {
    const { error } = await supabase.rpc('record_payment', {
      p_bill_id: billId,
      p_amount: amount,
      p_note: note?.trim() || undefined,
    });
    if (error) throw toAppError(error, 'Recording the payment');
  }
}

export const billingService = new BillingServiceImpl();
