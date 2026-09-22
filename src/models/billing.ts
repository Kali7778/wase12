import type { Enums } from '../types/database';
import type { CustomerTerms } from './deliveryNote';

/**
 * Bills (Phase C).
 *
 * A bill is written once and never edited (D59): a wrong one is cancelled
 * with a reason and written again. Totals are not stored anywhere — the
 * database sums them from the lines, which cannot change.
 */

/** `talab` bills a customer order slip; `stock` sells from the warehouse. */
export type BillKind = Enums<'bill_kind'>;
export type BillLineKind = Enums<'bill_line_kind'>;

/** The company as it was printed on the bill, copied when it was written. */
export interface BillCompany {
  name_en: string | null;
  name_ar: string | null;
  address_en: string | null;
  address_ar: string | null;
  phone: string | null;
  cr_number: string | null;
  vat_number: string | null;
  logo_path: string | null;
}

export interface Bill {
  id: string;
  billNumber: string;
  kind: BillKind;
  createdAt: string;
  deliveryNoteId: string | null;
  dnNumber: string | null;
  customerId: string | null;
  isWalkIn: boolean;
  customerName: string;
  customerNameAr: string | null;
  customerPhone: string | null;
  customerTerms: CustomerTerms;
  company: BillCompany;
  note: string | null;
  goodsTotal: number;
  servicesTotal: number;
  total: number;
  paidAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdByName: string | null;
  cancelledByName: string | null;
}

export interface BillLine {
  lineNo: number;
  kind: BillLineKind;
  itemId: string | null;
  itemNumber: string | null;
  description: string;
  uom: string | null;
  qty: number;
  listPrice: number | null;
  unitPrice: number;
  amount: number;
  isRevised: boolean;
  reviseNote: string | null;
}

export interface BillWithLines extends Bill {
  lines: BillLine[];
}

/** A product the warehouse can sell, with its price and what is in stock. */
export interface SellableItem {
  itemId: string;
  itemNumber: string;
  descriptionEn: string;
  descriptionAr: string | null;
  uom: string;
  price: number | null;
  inStock: number;
}

/** One goods line on a bill being written, before it is saved. */
export interface DraftLine {
  itemId: string;
  itemNumber: string;
  description: string;
  uom: string;
  listPrice: number;
  qty: number;
  /** The most this line may carry: the stock on hand, or the slip's quantity. */
  maxQty: number;
  /** Set when the price is revised for this sale (D53). */
  revisedPrice: number | null;
  reviseNote: string;
}

export const BILL_KIND_LABEL: Record<BillKind, string> = {
  talab: 'Customer order',
  stock: 'From stock',
};

export type BillState = 'paid' | 'unpaid' | 'cancelled';

export const billState = (b: Pick<Bill, 'paidAt' | 'cancelledAt'>): BillState =>
  b.cancelledAt ? 'cancelled' : b.paidAt ? 'paid' : 'unpaid';

export const BILL_STATE_LABEL: Record<BillState, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  cancelled: 'Cancelled',
};

export const BILL_STATE_TONE: Record<BillState, 'ok' | 'warn' | 'neutral'> = {
  paid: 'ok',
  unpaid: 'warn',
  cancelled: 'neutral',
};

/** The price a draft line will be charged at. */
export const draftUnitPrice = (l: DraftLine): number => l.revisedPrice ?? l.listPrice;

/** Rounded the way the database rounds a line: to the halala. */
export const lineAmount = (qty: number, unitPrice: number): number =>
  Math.round(qty * unitPrice * 100) / 100;
