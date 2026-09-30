import type { DnPurpose, DnWorkflowStatus } from './deliveryNote';
import type { DnStatus } from './base';
import type { Enums } from '../types/database';

/**
 * Following a sales order through the yard (D79–D81).
 *
 * Nothing here is recorded on its own: a trace line is a slip's line with
 * its receipt and its movements added up, and a trace step is one of those
 * movements — with the bill and the customer when it was a sale.
 */
export interface TraceLine {
  lineId: string;
  deliveryNoteId: string;
  dnNumber: string;
  soNumber: string;
  purpose: DnPurpose;
  workflowStatus: DnWorkflowStatus;
  printDate: string | null;
  uploadedAt: string;
  itemNumber: string;
  itemDescription: string;
  uom: string;
  /** What the supplier's slip claimed. Never stock on its own (Rule 5). */
  pdfQty: number;
  arrivedQty: number | null;
  missingQty: number;
  lineStatus: DnStatus;
  receivedAt: string | null;
  inQty: number;
  outQty: number;
  balanceQty: number;
  /** A customer order goes straight to this customer, and never to stock. */
  talabCustomerName: string | null;
  talabBillNumber: string | null;
  talabBillCancelled: boolean;
}

export type MovementType = Enums<'movement_type'>;

export interface TraceStep {
  movementId: string;
  lineId: string;
  dnNumber: string;
  soNumber: string;
  itemDescription: string;
  uom: string;
  occurredAt: string;
  direction: 'IN' | 'OUT';
  movementType: MovementType;
  qty: number;
  referenceNo: string | null;
  notes: string | null;
  isReversal: boolean;
  warehouseName: string | null;
  billNumber: string | null;
  billCustomerName: string | null;
  billIsWalkIn: boolean;
  billCancelled: boolean;
  actorName: string | null;
}

/** A slip line with the steps that came after it. */
export interface TracedLine extends TraceLine {
  steps: TraceStep[];
}

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  dn_receipt: 'Counted in',
  sale: 'Sold',
  driver_allocation: 'Given to a driver',
  transfer_out: 'Moved out',
  transfer_in: 'Moved in',
  adjustment: 'Adjusted',
  reversal: 'Put back',
};

/** What one step of the journey says, in the words the screen uses. */
export const stepTitle = (s: TraceStep): string => {
  if (s.isReversal) return 'Put back';
  if (s.movementType === 'sale' && s.billNumber) {
    return `Sold · ${s.billNumber}`;
  }
  return MOVEMENT_LABEL[s.movementType];
};
