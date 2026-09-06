import type { AuditedRecord, BaseRecord, DnStatus } from './base';
import type { Enums } from '../types/database';

export type DnWorkflowStatus = Enums<'dn_workflow_status'>;
export type ExtractionMethod = Enums<'extraction_method'>;
export type DiscrepancyReason = Enums<'dn_discrepancy_reason'>;

/** A day's intake of slips — "20 slips arrived today" is one batch. */
export interface UploadBatch extends AuditedRecord {
  batchDate: string;
  note: string | null;
}

/**
 * A delivery note received from the supplier — the source document.
 *
 * `workflowStatus` tracks the admin -> GM handoff and is read-only here; it
 * changes only through `sendToGm()` and `decide()`.
 */
export interface DeliveryNote extends AuditedRecord {
  dnNumber: string;
  soNumber: string;
  shippingReference: string | null;
  supplierId: string;
  customerNumber: string | null;
  customerName: string | null;
  shipFrom: string | null;
  shipTo: string | null;
  salesman: string | null;
  printDate: string | null;
  orderDate: string | null;

  /** Arrival status, driven by the receiving flow. */
  status: DnStatus;
  /** Handoff status, driven by the workflow functions. */
  readonly workflowStatus: DnWorkflowStatus;
  assignedTo: string | null;
  sentAt: string | null;
  sentBy: string | null;

  /** Driver the GM handed this slip to. */
  assignedDriverId: string | null;
  driverSentAt: string | null;
  driverSentBy: string | null;
  /** Copy carrying the approval stamp. The original stays untouched. */
  stampedPdfPath: string | null;

  uploadBatchId: string | null;
  pdfStoragePath: string | null;
  pdfFileName: string | null;
  pdfSha256: string | null;
  sourceFileType: string | null;
  extractionMethod: ExtractionMethod | null;
  extractionConfidence: number | null;
  needsReviewFields: string[];

  arrivedAt: string | null;
  notes: string | null;
  updatedAt: string;
}

/**
 * One line of a delivery note — also one stock lot.
 *
 * `pdfQty` is what the supplier claims was dispatched. `arrivedQty` stays
 * NULL until a person confirms the arrival: a claim is never stock.
 */
export interface DeliveryNoteLine extends BaseRecord {
  deliveryNoteId: string;
  lineNo: number;
  itemId: string;
  itemNumber: string;
  itemDescription: string;
  uom: string;
  pdfQty: number;
  arrivedQty: number | null;
  missingQty: number | null;
  status: DnStatus;
  receivedAt: string | null;
  receivedBy: string | null;
  /** Structured reason the quantity did not match — drives accountability. */
  discrepancyCode: DiscrepancyReason | null;
  /** Free text accompanying the code. Required when the code is `other`. */
  discrepancyReason: string | null;
  /** Optional evidence photo in the private bucket. */
  arrivalPhotoPath: string | null;
  notes: string | null;
}

/** A delivery note together with its lines, as shown on a card. */
export interface DeliveryNoteWithLines extends DeliveryNote {
  lines: DeliveryNoteLine[];
}

/** A previously uploaded slip that matches a file about to be uploaded. */
export interface DuplicateMatch {
  dnNumber: string;
  pdfSha256: string | null;
  uploadedAt: string;
  workflowStatus: DnWorkflowStatus;
}

export const WORKFLOW_LABEL: Record<DnWorkflowStatus, string> = {
  draft: 'Not sent',
  sent_to_gm: 'Sent to GM',
  gm_approved: 'Approved by GM',
  sent_to_driver: 'With driver',
  rejected: 'Rejected',
  received: 'Received',
};

/** Badge colour for each workflow status, so every screen agrees. */
export const WORKFLOW_TONE: Record<
  DnWorkflowStatus,
  'neutral' | 'accent' | 'ok' | 'risk' | 'info'
> = {
  draft: 'neutral',
  sent_to_gm: 'accent',
  gm_approved: 'ok',
  sent_to_driver: 'info',
  rejected: 'risk',
  received: 'ok',
};

/**
 * Why the received quantity did not match the delivery note.
 *
 * The value carries the answer to "who is answerable for this?", which is the
 * reason it is an enum and not a free-text box: a shortage blamed on the
 * supplier and one lost in transit lead to entirely different conversations,
 * and nobody can reconstruct that from a sentence typed six months earlier.
 */
export const DISCREPANCY_LABEL: Record<DiscrepancyReason, string> = {
  supplier_short_loaded: 'Supplier loaded less than the note',
  transit_loss: 'Lost in transit',
  damaged: 'Damaged on arrival',
  counting_error: 'Counting error',
  supplier_over_loaded: 'Supplier loaded more than the note',
  other: 'Other (describe below)',
};

/** Who the reason points at, shown beside the label. */
export const DISCREPANCY_ACCOUNTABLE: Record<DiscrepancyReason, string> = {
  supplier_short_loaded: 'Supplier',
  transit_loss: 'Transport',
  damaged: 'Transport',
  counting_error: 'Internal',
  supplier_over_loaded: 'Supplier',
  other: '—',
};

/** Reasons offered when less arrived than the note claims. */
export const SHORTAGE_REASONS: DiscrepancyReason[] = [
  'supplier_short_loaded',
  'transit_loss',
  'damaged',
  'counting_error',
  'other',
];

/** Reasons offered when more arrived than the note claims. */
export const OVERAGE_REASONS: DiscrepancyReason[] = [
  'supplier_over_loaded',
  'counting_error',
  'other',
];

export const DN_STATUS_LABEL: Record<DnStatus, string> = {
  not_arrived: 'Not arrived',
  partial: 'Partial arrival',
  arrived: 'Arrived',
  cancelled: 'Cancelled',
};

/** One transition in a delivery note's handover history. */
export interface WorkflowEntry {
  id: string;
  deliveryNoteId: string;
  fromStatus: DnWorkflowStatus | null;
  toStatus: DnWorkflowStatus;
  assignedTo: string | null;
  assignedToName: string | null;
  note: string | null;
  actor: string | null;
  actorName: string | null;
  createdAt: string;
}

/** Someone a slip can be handed to — a GM or a driver. */
export interface Recipient {
  id: string;
  fullName: string;
  email: string;
}
