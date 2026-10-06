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
  /** How much of it has actually been received, and what is left (D83). */
  paidAmount: number;
  outstanding: number;
  paidAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdByName: string | null;
  cancelledByName: string | null;
  /** The job out on this bill right now, if any (0033). */
  collectionStatus: CollectionStatus | null;
  collectionDriverName: string | null;
  collectionId: string | null;
}

/**
 * Collecting what a weekly customer owes (D73–D78).
 *
 * The GM hands a bill to a driver; the driver either brings the money or
 * says why not; the GM takes it in and the bill is paid. A job is never
 * edited — it is closed with a reason and a new one is sent out.
 */
export type CollectionStatus = Enums<'collection_status'>;

export const COLLECTION_LABEL: Record<CollectionStatus, string> = {
  with_driver: 'With driver',
  collected: 'Driver has the money',
  received: 'Taken in',
  declined: 'Not collected',
  cancelled: 'Taken back',
};

export const COLLECTION_TONE: Record<CollectionStatus, 'ok' | 'warn' | 'neutral' | 'info' | 'accent' | 'risk'> = {
  with_driver: 'info',
  collected: 'accent',
  received: 'ok',
  declined: 'risk',
  cancelled: 'neutral',
};

/** A job is live while the money is still out of the office. */
export const isLiveCollection = (s: CollectionStatus): boolean =>
  s === 'with_driver' || s === 'collected';

export interface PaymentCollection {
  id: string;
  status: CollectionStatus;
  billId: string;
  billNumber: string;
  billKind: BillKind;
  billDate: string;
  dnNumber: string | null;
  customerId: string | null;
  customerName: string;
  customerNameAr: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  amount: number;
  driverId: string;
  driverName: string;
  assignedAt: string;
  assignedByName: string;
  note: string | null;
  collectedAt: string | null;
  collectedNote: string | null;
  receivedAt: string | null;
  receivedByName: string | null;
  receivedNote: string | null;
  closedAt: string | null;
  closedReason: string | null;
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

/**
 * Where a bill's money is (D74). Between unpaid and paid sit the two
 * states that only exist because somebody is carrying cash: the driver
 * has been sent, and the driver has the money.
 */
export type BillState = 'paid' | 'part_paid' | 'with_driver' | 'collected' | 'unpaid' | 'cancelled';

export const billState = (
  b: Pick<Bill, 'paidAt' | 'cancelledAt' | 'collectionStatus' | 'paidAmount'>,
): BillState => {
  if (b.cancelledAt) return 'cancelled';
  if (b.paidAt) return 'paid';
  if (b.collectionStatus === 'collected') return 'collected';
  if (b.collectionStatus === 'with_driver') return 'with_driver';
  if (b.paidAmount > 0) return 'part_paid';
  return 'unpaid';
};

export const BILL_STATE_LABEL: Record<BillState, string> = {
  paid: 'Paid',
  part_paid: 'Part paid',
  with_driver: 'With driver',
  collected: 'Driver has the money',
  unpaid: 'Unpaid',
  cancelled: 'Cancelled',
};

export const BILL_STATE_TONE: Record<BillState, 'ok' | 'warn' | 'neutral' | 'info' | 'accent'> = {
  paid: 'ok',
  part_paid: 'warn',
  with_driver: 'info',
  collected: 'accent',
  unpaid: 'warn',
  cancelled: 'neutral',
};

/** The price a draft line will be charged at. */
export const draftUnitPrice = (l: DraftLine): number => l.revisedPrice ?? l.listPrice;

/** Rounded the way the database rounds a line: to the halala. */
export const lineAmount = (qty: number, unitPrice: number): number =>
  Math.round(qty * unitPrice * 100) / 100;
