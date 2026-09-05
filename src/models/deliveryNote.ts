import type { AuditedRecord, BaseRecord, DnStatus } from './base';
import type { Enums } from '../types/database';

export type DnWorkflowStatus = Enums<'dn_workflow_status'>;
export type ExtractionMethod = Enums<'extraction_method'>;

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
  discrepancyReason: string | null;
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
};

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
