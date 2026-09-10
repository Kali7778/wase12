import type { Enums } from '../types/database';
import type { DnStatus } from './base';
import type { DiscrepancyReason } from './deliveryNote';

export type MovementType = Enums<'movement_type'>;
export type MovementDirection = Enums<'movement_direction'>;

/**
 * One stock lot — a single delivery note line, with what it claimed, what
 * arrived, and what is left.
 *
 * `balanceQty` is derived from the append-only ledger on every read; it is
 * never stored. `pdfQty` deliberately plays no part in it: the supplier's
 * claim is not stock.
 */
export interface LotBalance {
  lotId: string;
  deliveryNoteId: string;
  dnNumber: string;
  soNumber: string;

  itemId: string;
  itemNumber: string;
  itemDescription: string;
  uom: string;

  pdfQty: number;
  arrivedQty: number | null;
  missingQty: number | null;
  status: DnStatus;
  discrepancyCode: DiscrepancyReason | null;
  receivedAt: string | null;

  inQty: number;
  outQty: number;
  balanceQty: number;
}

/**
 * Why stock is leaving the warehouse.
 *
 * Only these four are accepted by `issue_stock`; `dn_receipt`, `transfer_in`
 * and `reversal` are movements the system creates for itself and cannot be
 * chosen by hand.
 */
export const ISSUE_REASONS = [
  'sale',
  'driver_allocation',
  'transfer_out',
  'adjustment',
] as const;

export type IssueReason = (typeof ISSUE_REASONS)[number];

export const ISSUE_REASON_LABEL: Record<IssueReason, string> = {
  sale: 'Sold to a customer',
  driver_allocation: 'Loaded onto a driver',
  transfer_out: 'Transferred to another warehouse',
  adjustment: 'Adjustment',
};

/** What the reference number means for each reason, shown as a hint. */
export const ISSUE_REFERENCE_HINT: Record<IssueReason, string> = {
  sale: 'Invoice or sales order number',
  driver_allocation: 'Trip or vehicle number',
  transfer_out: 'Destination warehouse or transfer number',
  adjustment: 'Approval or stock count reference',
};
