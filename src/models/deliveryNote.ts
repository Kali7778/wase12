import type { AuditedRecord, BaseRecord, DnStatus, UserRole } from './base';
import type { Enums } from '../types/database';

export type DnWorkflowStatus = Enums<'dn_workflow_status'>;
export type ExtractionMethod = Enums<'extraction_method'>;
export type DiscrepancyReason = Enums<'dn_discrepancy_reason'>;
export type ReissueReason = Enums<'dn_reissue_reason'>;
export type SlipRequestType = Enums<'slip_request_type'>;
export type SlipRequestTarget = Enums<'slip_request_target'>;

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

  /**
   * Who is responsible for this slip right now (D30). One person at a time;
   * NULL once the slip has been received or rejected.
   */
  holderId: string | null;
  holderRole: UserRole | null;
  holderSince: string | null;
  /** When the driver confirmed the slip reached them (D38). */
  acknowledgedAt: string | null;

  /**
   * The slip this one was issued to replace (D32). The supplier reprints a
   * lost or damaged sheet with new numbers, so nothing but a person can
   * say the two are one delivery.
   */
  replacesDnId: string | null;
  reissueReason: ReissueReason | null;
  reissueNote: string | null;

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
/**
 * What an earlier upload has in common with a slip about to be saved.
 *
 * `file` and `dn_number` can never be saved again. `so_number` can: a
 * supplier may split one order across deliveries, so an admin may accept it
 * with a reason (decision D35). The database enforces both.
 */
export type DuplicateKind = 'file' | 'dn_number' | 'so_number';

export interface DuplicateMatch {
  matchedOn: DuplicateKind;
  dnNumber: string;
  soNumber: string;
  pdfSha256: string | null;
  uploadedAt: string;
  workflowStatus: DnWorkflowStatus;
}

export const WORKFLOW_LABEL: Record<DnWorkflowStatus, string> = {
  draft: 'Not sent',
  sent_to_gm: 'Sent to GM',
  gm_approved: 'Approved by GM',
  with_warehouse: 'With warehouse',
  sent_to_driver: 'With driver',
  rejected: 'Rejected',
  received: 'Received',
  replaced: 'Replaced',
  delivered: 'Delivered to customer',
};

/** Badge colour for each workflow status, so every screen agrees. */
export const WORKFLOW_TONE: Record<
  DnWorkflowStatus,
  'neutral' | 'accent' | 'ok' | 'risk' | 'info'
> = {
  draft: 'neutral',
  sent_to_gm: 'accent',
  gm_approved: 'ok',
  with_warehouse: 'accent',
  sent_to_driver: 'info',
  rejected: 'risk',
  received: 'ok',
  replaced: 'neutral',
  delivered: 'ok',
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
  role: UserRole;
}

/** Who a slip may be handed to, and what that step is called on screen. */
export const HANDOVER_TARGET_LABEL: Record<'gm' | 'warehouse' | 'driver', string> = {
  gm: 'General Manager',
  warehouse: 'Warehouse',
  driver: 'Driver',
};

/** One step in a slip's custody, as `v_slip_custody` reports it. */
export type CustodyAction =
  | 'hand_over'
  | 'reassign_driver'
  | 'acknowledge'
  | 'approve'
  | 'reject'
  | 'receive'
  | 'replace'
  | 'deliver';

export interface CustodyEntry {
  id: string;
  createdAt: string;
  deliveryNoteId: string;
  dnNumber: string;
  soNumber: string;
  action: CustodyAction;
  note: string | null;
  actorId: string | null;
  actorName: string | null;
  actorRole: UserRole | null;
  fromId: string | null;
  fromName: string | null;
  fromRole: UserRole | null;
  toId: string | null;
  toName: string | null;
  toRole: UserRole | null;
}

export const REISSUE_REASON_LABEL: Record<ReissueReason, string> = {
  lost: 'Lost',
  damaged: 'Damaged',
  supplier_correction: 'Supplier correction',
  other: 'Other',
};

/** A slip the supplier may have reprinted — offered as a possible original. */
export interface PossibleOriginal {
  id: string;
  dnNumber: string;
  soNumber: string;
  printDate: string | null;
  pdfQty: number;
  itemNumber: string;
  workflowStatus: DnWorkflowStatus;
  holderName: string | null;
}

/** A reissued sheet reported from the yard, waiting to be checked (D34). */
export interface ReissueSubmission {
  id: string;
  originalDnId: string;
  originalDnNumber: string | null;
  reason: ReissueReason;
  note: string | null;
  filePath: string | null;
  fileType: string;
  dnNumber: string | null;
  soNumber: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: string;
  submittedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  createdDnId: string | null;
}

/** One row of the month-end register: the supplier's two sheets, side by side. */
export interface ReissueRegisterRow {
  deliveryNoteId: string;
  newDn: string;
  newSo: string;
  replacedDn: string;
  replacedSo: string;
  reason: ReissueReason;
  remarks: string | null;
  itemNumber: string | null;
  qty: number | null;
  uom: string | null;
  recordedAt: string;
  recordedBy: string | null;
  reportedAt: string | null;
  reportedBy: string | null;
  newSlipStatus: DnWorkflowStatus;
}

/**
 * One day of slip movement, in Jeddah time (D44).
 *
 * `sentByMe` is the caller's own count: the client asked to see what each
 * person passed on, not what the office did as a whole (D36).
 */
export interface DailySlipCount {
  day: string;
  uploaded: number;
  sentByMe: number;
  outToDriver: number;
  received: number;
  reissued: number;
}

/**
 * Somebody asking for a slip (D31, D40, D41).
 *
 * The warehouse asks the office — the admin and the GM both see it and
 * either can answer. A driver asks the warehouse.
 */
export interface SlipRequest {
  id: string;
  createdAt: string;
  requestType: SlipRequestType;
  message: string | null;
  status: 'pending' | 'fulfilled' | 'declined' | 'cancelled';
  target: SlipRequestTarget;
  deliveryNoteId: string | null;
  dnNumber: string | null;
  fulfilledDnId: string | null;
  fulfilledDnNumber: string | null;
  requestedBy: string;
  requestedByName: string | null;
  requestedByRole: UserRole;
  decidedBy: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
}

export const REQUEST_TYPE_LABEL: Record<SlipRequestType, string> = {
  slip_for_delivery: 'Slip for a delivery',
  lost_slip: 'Lost slip',
  damaged_slip: 'Damaged slip',
  other: 'Other',
};

export const REQUEST_TYPES: SlipRequestType[] = [
  'slip_for_delivery',
  'lost_slip',
  'damaged_slip',
  'other',
];

export const REQUEST_STATUS_LABEL: Record<SlipRequest['status'], string> = {
  pending: 'Waiting',
  fulfilled: 'Sent',
  declined: 'Declined',
  cancelled: 'Withdrawn',
};

export const REQUEST_STATUS_TONE: Record<
  SlipRequest['status'],
  'neutral' | 'accent' | 'ok' | 'risk' | 'warn'
> = {
  pending: 'warn',
  fulfilled: 'ok',
  declined: 'risk',
  cancelled: 'neutral',
};

export const CUSTODY_ACTION_LABEL: Record<CustodyAction, string> = {
  hand_over: 'Handed over',
  reassign_driver: 'Driver changed',
  acknowledge: 'Confirmed receipt',
  approve: 'Approved',
  reject: 'Rejected',
  receive: 'Counted in',
  replace: 'Replaced',
  deliver: 'Delivered to customer',
};

/**
 * What a slip is for (decision D49).
 *
 * `stock` is the ordinary case: the load comes to the warehouse and is
 * counted in. `talab` is a customer order — the client buys it from the
 * supplier in their own name, but the truck goes straight from the plant to
 * the customer's yard. The paperwork is identical; the goods never touch our
 * shelves, so such a slip is never stock and never appears in the register.
 */
export type DnPurpose = Enums<'dn_purpose'>;

export const PURPOSE_LABEL: Record<DnPurpose, string> = {
  stock: 'For the warehouse',
  talab: 'Straight to a customer',
};

/** How a customer settles: on the spot, or on a weekly account (D51). */
export type CustomerTerms = Enums<'customer_terms'>;

export const TERMS_LABEL: Record<CustomerTerms, string> = {
  cash: 'Pays on the spot',
  weekly: 'Weekly account',
};

export interface Customer {
  id: string;
  name: string;
  nameAr: string | null;
  phone: string | null;
  terms: CustomerTerms;
  vatNumber: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

/** A customer order, as `v_talab_orders` reports it. */
export interface TalabOrder {
  deliveryNoteId: string;
  dnNumber: string;
  soNumber: string;
  createdAt: string;
  printDate: string | null;
  workflowStatus: DnWorkflowStatus;
  customerId: string;
  customerName: string;
  customerNameAr: string | null;
  customerPhone: string | null;
  customerTerms: CustomerTerms;
  itemNumber: string | null;
  itemDescription: string | null;
  uom: string | null;
  pdfQty: number;
  holderName: string | null;
  holderRole: UserRole | null;
  deliveredAt: string | null;
  deliveredByName: string | null;
  pdfStoragePath: string | null;
}
