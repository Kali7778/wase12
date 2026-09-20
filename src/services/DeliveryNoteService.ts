import { BaseService } from './BaseService';
import { DELIVERY_NOTES_BUCKET, supabase } from '../lib/supabase';
import { toAppError } from '../lib/errors';
import type {
  CustodyEntry,
  DailySlipCount,
  DeliveryNote,
  PossibleOriginal,
  ReissueRegisterRow,
  ReissueSubmission,
  ReissueReason,
  DeliveryNoteLine,
  DeliveryNoteWithLines,
  DiscrepancyReason,
  DnWorkflowStatus,
  DuplicateMatch,
  UploadBatch,
} from '../models/deliveryNote';
import type { Recipient, WorkflowEntry } from '../models/deliveryNote';
import type { Tables } from '../types/database';

/** Everything needed to save one uploaded slip. */
export interface NewDeliveryNote {
  dnNumber: string;
  soNumber: string;
  itemNumber: string;
  itemDescription: string;
  uom: string;
  pdfQty: number;
  customerNumber?: string;
  customerName?: string;
  shippingReference?: string;
  shipFrom?: string;
  shipTo?: string;
  salesman?: string;
  printDate?: string;
  orderDate?: string;
  needsReview?: string[];
  confidence?: number;
  fileType?: string;
  extractionMethod?: 'pdf_text' | 'vision' | 'manual';
}

function toEntry(row: Tables<'dn_workflow_log'>): WorkflowEntry {
  return {
    id: row.id,
    deliveryNoteId: row.delivery_note_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    assignedTo: row.assigned_to,
    assignedToName: null,
    note: row.note,
    actor: row.actor,
    actorName: null,
    createdAt: row.created_at,
  };
}

function toLine(row: Tables<'delivery_note_lines'>): DeliveryNoteLine {
  return {
    id: row.id,
    createdAt: row.created_at,
    deliveryNoteId: row.delivery_note_id,
    lineNo: row.line_no,
    itemId: row.item_id,
    itemNumber: row.item_number,
    itemDescription: row.item_description,
    uom: row.uom,
    pdfQty: Number(row.pdf_qty),
    arrivedQty: row.arrived_qty === null ? null : Number(row.arrived_qty),
    missingQty: row.missing_qty === null ? null : Number(row.missing_qty),
    status: row.status,
    receivedAt: row.received_at,
    receivedBy: row.received_by,
    discrepancyCode: row.discrepancy_code,
    discrepancyReason: row.discrepancy_reason,
    arrivalPhotoPath: row.arrival_photo_path,
    notes: row.notes,
  };
}

/** The shape PostgREST returns for `delivery_notes` embedded with its lines. */
type NoteRowWithLines = Tables<'delivery_notes'> & {
  delivery_note_lines: Tables<'delivery_note_lines'>[] | null;
};

class DeliveryNoteServiceImpl extends BaseService<Tables<'delivery_notes'>, DeliveryNote> {
  constructor() {
    super('delivery_notes', 'Delivery Note');
  }

  protected toModel(row: Tables<'delivery_notes'>): DeliveryNote {
    return {
      id: row.id,
      createdAt: row.created_at,
      createdBy: row.created_by,
      dnNumber: row.dn_number,
      soNumber: row.so_number,
      shippingReference: row.shipping_reference,
      supplierId: row.supplier_id,
      customerNumber: row.customer_number,
      customerName: row.customer_name,
      shipFrom: row.ship_from,
      shipTo: row.ship_to,
      salesman: row.salesman,
      printDate: row.print_date,
      orderDate: row.order_date,
      status: row.status,
      workflowStatus: row.workflow_status,
      assignedTo: row.assigned_to,
      sentAt: row.sent_at,
      sentBy: row.sent_by,
      holderId: row.holder_id,
      holderRole: row.holder_role,
      holderSince: row.holder_since,
      acknowledgedAt: row.acknowledged_at,
      replacesDnId: row.replaces_dn_id,
      reissueReason: row.reissue_reason,
      reissueNote: row.reissue_note,
      assignedDriverId: row.assigned_driver_id,
      driverSentAt: row.driver_sent_at,
      driverSentBy: row.driver_sent_by,
      stampedPdfPath: row.stamped_pdf_path,
      uploadBatchId: row.upload_batch_id,
      pdfStoragePath: row.pdf_storage_path,
      pdfFileName: row.pdf_file_name,
      pdfSha256: row.pdf_sha256,
      sourceFileType: row.source_file_type,
      extractionMethod: row.extraction_method,
      extractionConfidence:
        row.extraction_confidence === null ? null : Number(row.extraction_confidence),
      needsReviewFields: row.needs_review_fields ?? [],
      arrivedAt: row.arrived_at,
      notes: row.notes,
      updatedAt: row.updated_at,
    };
  }

  /** Maps the rows of any `delivery_notes` query that embedded its lines. */
  private withLines(rows: unknown): DeliveryNoteWithLines[] {
    return ((rows ?? []) as NoteRowWithLines[]).map((row) => {
      const { delivery_note_lines: lines, ...header } = row;
      return { ...this.toModel(header), lines: (lines ?? []).map(toLine) };
    });
  }

  /**
   * Checks whether these files or delivery note numbers have been uploaded
   * before. The same slip WILL be re-uploaded eventually; without this the
   * stock would be counted twice.
   */
  async findDuplicates(
    sha256: string[],
    dnNumbers: string[],
    soNumbers: string[] = [],
  ): Promise<DuplicateMatch[]> {
    const { data, error } = await this.db.rpc('check_dn_duplicates', {
      p_sha256: sha256.length ? sha256 : null,
      p_dn_numbers: dnNumbers.length ? dnNumbers : null,
      p_so_numbers: soNumbers.length ? soNumbers : undefined,
    });

    if (error) throw toAppError(error, 'Checking for duplicates');
    return (data ?? []).map((row) => ({
      matchedOn: row.matched_on as DuplicateMatch['matchedOn'],
      dnNumber: row.dn_number,
      soNumber: row.so_number,
      pdfSha256: row.pdf_sha256,
      uploadedAt: row.uploaded_at,
      workflowStatus: row.workflow_status,
    }));
  }

  /**
   * Slips this one could be replacing.
   *
   * The whole scheme leans on somebody ticking a box, and a replacement
   * filed as an ordinary delivery is exactly the mistake that shows up at
   * month end as the supplier's word against ours (D33). The database
   * looks for a still-expected slip with the same item and quantity so the
   * screen can ask instead of hoping.
   */
  async findPossibleOriginals(input: {
    itemNumber: string;
    pdfQty: number;
    customerNumber?: string | null;
  }): Promise<PossibleOriginal[]> {
    const { data, error } = await this.db.rpc('find_possible_originals', {
      p_item_number: input.itemNumber,
      p_pdf_qty: input.pdfQty,
      p_customer_number: input.customerNumber ?? undefined,
    });

    if (error) throw toAppError(error, 'Looking for the slip this may replace');
    return (data ?? []).map((row) => ({
      id: row.id,
      dnNumber: row.dn_number,
      soNumber: row.so_number,
      printDate: row.print_date,
      pdfQty: Number(row.pdf_qty),
      itemNumber: row.item_number,
      workflowStatus: row.workflow_status,
      holderName: row.holder_name,
    }));
  }

  /**
   * A driver reports a reissued sheet from the yard (D34).
   *
   * It is not a delivery note yet. The numbers on the sheet are what the
   * rest of the system keys off, and an admin or the GM reads them off the
   * photo before it becomes one (D47).
   */
  async submitReissue(input: {
    originalDnId: string;
    reason: ReissueReason;
    note?: string;
    filePath?: string;
    fileType?: string;
    dnNumber?: string;
    soNumber?: string;
  }): Promise<void> {
    const { error } = await this.db.rpc('submit_reissue', {
      p_original_dn_id: input.originalDnId,
      p_reason: input.reason,
      p_note: input.note?.trim() || undefined,
      p_file_path: input.filePath ?? undefined,
      p_file_type: input.fileType ?? undefined,
      p_dn_number: input.dnNumber?.trim() || undefined,
      p_so_number: input.soNumber?.trim() || undefined,
    });

    if (error) throw toAppError(error, 'Reporting the reissued slip');
  }

  /** Stores a photo of a reissued sheet in the private bucket. */
  async uploadReissuePhoto(file: File, originalDn: string): Promise<string> {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const safeDn = originalDn.replace(/[^A-Za-z0-9_-]/g, '') || 'unknown';
    const path = `reissues/${safeDn}_${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from(DELIVERY_NOTES_BUCKET)
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });

    if (error) throw toAppError(error, 'Uploading the photo');
    return path;
  }

  /** Reported reissues. Everyone sees their own; supervisors see them all. */
  async listReissueSubmissions(
    status?: ReissueSubmission['status'],
    limit = 50,
  ): Promise<ReissueSubmission[]> {
    let query = supabase
      .from('dn_reissue_submissions')
      .select('*, delivery_notes!dn_reissue_submissions_original_dn_id_fkey(dn_number)')
      .order('submitted_at', { ascending: false })
      .limit(limit);

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw toAppError(error, 'Loading the reported reissues');

    type Row = Tables<'dn_reissue_submissions'> & { delivery_notes: { dn_number: string } | null };
    return ((data ?? []) as Row[]).map((row) => ({
      id: row.id,
      originalDnId: row.original_dn_id,
      originalDnNumber: row.delivery_notes?.dn_number ?? null,
      reason: row.reason,
      note: row.note,
      filePath: row.file_path,
      fileType: row.file_type,
      dnNumber: row.dn_number,
      soNumber: row.so_number,
      status: row.status as ReissueSubmission['status'],
      submittedBy: row.submitted_by,
      submittedAt: row.submitted_at,
      decidedAt: row.decided_at,
      decisionNote: row.decision_note,
      createdDnId: row.created_dn_id,
    }));
  }

  /** Turns a reported reissue into a delivery note (admin, GM, superadmin). */
  async approveReissue(input: {
    submissionId: string;
    dnNumber: string;
    soNumber: string;
    pdfQty?: number;
    note?: string;
  }): Promise<DeliveryNote> {
    const { data, error } = await this.db.rpc('approve_reissue', {
      p_submission_id: input.submissionId,
      p_dn_number: input.dnNumber.trim(),
      p_so_number: input.soNumber.trim(),
      p_pdf_qty: input.pdfQty ?? undefined,
      p_note: input.note?.trim() || undefined,
    });

    if (error) throw toAppError(error, 'Approving the reissue');
    return this.toModel(data as Tables<'delivery_notes'>);
  }

  /** Turns one down. The reason is required — the driver has to know why. */
  async rejectReissue(submissionId: string, reason: string): Promise<void> {
    const { error } = await this.db.rpc('reject_reissue', {
      p_submission_id: submissionId,
      p_reason: reason.trim(),
    });

    if (error) throw toAppError(error, 'Turning down the reissue');
  }

  /**
   * The month-end register: every replacement, with the sheet it replaced.
   *
   * This is the answer when the supplier's count of issued slips is higher
   * than ours.
   */
  async listReissueRegister(limit = 500): Promise<ReissueRegisterRow[]> {
    const { data, error } = await supabase
      .from('v_reissue_register')
      .select('*')
      .order('Recorded', { ascending: false })
      .limit(limit);

    if (error) throw toAppError(error, 'Loading the reissue register');

    return (data ?? []).map((row) => ({
      deliveryNoteId: row.delivery_note_id as string,
      newDn: row['New DN'] as string,
      newSo: row['New SO'] as string,
      replacedDn: row['Replaced DN'] as string,
      replacedSo: row['Replaced SO'] as string,
      reason: row.Reason as ReissueReason,
      remarks: row.Remarks,
      itemNumber: row.Item,
      qty: row.Qty === null ? null : Number(row.Qty),
      uom: row.UOM,
      recordedAt: row.Recorded as string,
      recordedBy: row['Recorded by'],
      reportedAt: row.Reported,
      reportedBy: row['Reported by'],
      newSlipStatus: row['New slip status'] as DeliveryNote['workflowStatus'],
    }));
  }

  /**
   * How many slips came in, went out and were counted in, day by day.
   *
   * The day boundary is Jeddah's, not the server's, and the "sent on"
   * figure belongs to whoever is asking (D36, D44).
   */
  async listDailyCounts(days = 7): Promise<DailySlipCount[]> {
    const { data, error } = await this.db.rpc('daily_slip_counts', { p_days: days });

    if (error) throw toAppError(error, 'Loading the daily slip counts');
    return (data ?? []).map((row) => ({
      day: row.day,
      uploaded: row.uploaded,
      sentByMe: row.sent_by_me,
      outToDriver: row.out_to_driver,
      received: row.received,
      reissued: row.reissued,
    }));
  }

  /** Uploads the source file to the private bucket and returns its path. */
  async uploadFile(file: File, batchDate: string, dnNumber: string): Promise<string> {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'pdf';
    const safeDn = dnNumber.replace(/[^A-Za-z0-9_-]/g, '') || 'unknown';
    const path = `${batchDate}/${safeDn}_${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from(DELIVERY_NOTES_BUCKET)
      .upload(path, file, { contentType: file.type || 'application/pdf', upsert: false });

    if (error) throw toAppError(error, 'Uploading the file');
    return path;
  }

  /** Short-lived link for previewing a stored file. The bucket is private. */
  async getSignedUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(DELIVERY_NOTES_BUCKET)
      .createSignedUrl(path, expiresInSeconds);

    if (error) return null;
    return data?.signedUrl ?? null;
  }

  /** Header and line are written together by the database function. */
  async create(
    input: NewDeliveryNote,
    options: {
      batchId?: string;
      pdfPath?: string;
      pdfFileName?: string;
      pdfSha256?: string;
      /** Only when an admin accepts a sales order number already in use. */
      soOverrideReason?: string;
      /** Set when this slip replaces one the supplier reissued (D32). */
      replacesDnId?: string;
      reissueReason?: ReissueReason;
      reissueNote?: string;
    },
  ): Promise<DeliveryNote> {
    const { data, error } = await this.db.rpc('create_delivery_note', {
      p_dn_number: input.dnNumber,
      p_so_number: input.soNumber,
      p_supplier_code: 'ELKHAYYAT',
      p_item_number: input.itemNumber,
      p_item_description: input.itemDescription,
      p_uom: input.uom,
      p_pdf_qty: input.pdfQty,
      p_customer_number: input.customerNumber ?? null,
      p_customer_name: input.customerName ?? null,
      p_shipping_ref: input.shippingReference ?? null,
      p_ship_from: input.shipFrom ?? null,
      p_ship_to: input.shipTo ?? null,
      p_salesman: input.salesman ?? null,
      p_print_date: input.printDate || null,
      p_order_date: input.orderDate || null,
      p_batch_id: options.batchId ?? null,
      p_pdf_path: options.pdfPath ?? null,
      p_pdf_file_name: options.pdfFileName ?? null,
      // An empty hash (the file could not be read) is no hash at all.
      p_pdf_sha256: options.pdfSha256 || null,
      p_file_type: input.fileType ?? 'pdf',
      p_extraction: input.extractionMethod ?? 'pdf_text',
      p_confidence: input.confidence ?? null,
      p_needs_review: input.needsReview ?? [],
      p_so_override_reason: options.soOverrideReason?.trim() || undefined,
      p_replaces_dn_id: options.replacesDnId ?? undefined,
      p_reissue_reason: options.reissueReason ?? undefined,
      p_reissue_note: options.reissueNote?.trim() || undefined,
    });

    if (error) throw toAppError(error, 'Saving the delivery note');
    return this.toModel(data as Tables<'delivery_notes'>);
  }

  /** Delivery notes with their lines, newest first. */
  async listWithLines(limit = 200): Promise<DeliveryNoteWithLines[]> {
    const { data, error } = await supabase
      .from('delivery_notes')
      .select('*, delivery_note_lines(*)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw toAppError(error, 'Loading delivery notes');

    return this.withLines(data);
  }

  /** One delivery note with its lines. */
  async getWithLines(id: string): Promise<DeliveryNoteWithLines | null> {
    const { data, error } = await supabase
      .from('delivery_notes')
      .select('*, delivery_note_lines(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw toAppError(error, 'Loading the delivery note');
    return data ? (this.withLines([data])[0] ?? null) : null;
  }

  /** Delivery notes at a given point in the workflow, with their lines. */
  async listByWorkflowStatus(
    statuses: DnWorkflowStatus[],
    limit = 200,
  ): Promise<DeliveryNoteWithLines[]> {
    const { data, error } = await supabase
      .from('delivery_notes')
      .select('*, delivery_note_lines(*)')
      .in('workflow_status', statuses)
      .order('sent_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw toAppError(error, 'Loading delivery notes');

    return this.withLines(data);
  }

  /** Hands slips to the GM. Atomic — a partial send is not possible. */
  async sendToGm(dnIds: string[], note?: string, gmId?: string): Promise<number> {
    const { data, error } = await this.db.rpc('send_dn_to_gm', {
      p_dn_ids: dnIds,
      p_gm_id: gmId ?? null,
      p_note: note ?? null,
    });

    if (error) throw toAppError(error, 'Sending to the GM');
    return Number(data ?? 0);
  }

  /** People a slip can be handed to. */
  async listRecipients(
    kind: 'gm' | 'driver' | 'warehouse' | 'holder',
  ): Promise<Recipient[]> {
    const { data, error } = await this.db.rpc('list_recipients', { p_kind: kind });
    if (error) throw toAppError(error, 'Loading recipients');
    return (data ?? []).map((r) => ({
      id: r.id,
      fullName: r.full_name,
      email: r.email,
      role: r.role,
    }));
  }

  /** Handover history for one slip, newest first. */
  async getHistory(deliveryNoteId: string): Promise<WorkflowEntry[]> {
    const { data, error } = await supabase
      .from('dn_workflow_log')
      .select('*')
      .eq('delivery_note_id', deliveryNoteId)
      .order('created_at', { ascending: false });

    if (error) throw toAppError(error, 'Loading history');
    return (data ?? []).map(toEntry);
  }

  /** Every handover across all slips — the record the admin sees after sending. */
  async listHandovers(limit = 50): Promise<WorkflowEntry[]> {
    const { data, error } = await supabase
      .from('dn_workflow_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw toAppError(error, 'Loading handover history');
    return (data ?? []).map(toEntry);
  }

  /**
   * Hands a slip to the GM, the warehouse or a driver.
   *
   * The supplier's delivery note travels exactly as it arrived — nothing is
   * written on it and no copy is made. Who handed it on and who is carrying
   * it is our record, not the supplier's.
   *
   * Every rule about who may hand what to whom lives in the database, so a
   * screen that offers the wrong choice is refused rather than obeyed.
   */
  async handOver(input: {
    slipId: string;
    toUserId: string;
    note?: string;
  }): Promise<DeliveryNote> {
    const { data, error } = await this.db.rpc('hand_over_delivery_note', {
      p_dn_id: input.slipId,
      p_to_user: input.toUserId,
      p_note: input.note ?? null,
    });

    if (error) throw toAppError(error, 'Handing the slip over');
    return this.toModel(data as Tables<'delivery_notes'>);
  }

  /**
   * The driver confirms the slip reached them (D38).
   *
   * Without this the record only ever says a slip was sent, which settles
   * nothing when a driver says they never received it.
   */
  async acknowledge(slipId: string): Promise<DeliveryNote> {
    const { data, error } = await this.db.rpc('acknowledge_delivery_note', { p_dn_id: slipId });

    if (error) throw toAppError(error, 'Confirming the slip');
    return this.toModel(data as Tables<'delivery_notes'>);
  }

  /** Slips in one person's hands right now, whatever stage they are at. */
  async listHeldBy(userId: string, limit = 100): Promise<DeliveryNoteWithLines[]> {
    const { data, error } = await supabase
      .from('delivery_notes')
      .select('*, delivery_note_lines(*)')
      .eq('holder_id', userId)
      .order('holder_since', { ascending: false })
      .limit(limit);

    if (error) throw toAppError(error, 'Loading the slips in your hands');
    return this.withLines(data);
  }

  /**
   * The custody trail: who gave what to whom, newest first.
   *
   * Read from a view so the screen does not join four tables itself. Pass a
   * delivery note number to follow a single slip.
   */
  async listCustody(options: { dnNumber?: string; limit?: number } = {}): Promise<CustodyEntry[]> {
    let query = supabase
      .from('v_slip_custody')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(options.limit ?? 100);

    const term = options.dnNumber?.trim();
    if (term) query = query.ilike('dn_number', `%${term}%`);

    const { data, error } = await query;
    if (error) throw toAppError(error, 'Loading the handover history');

    return (data ?? []).map((row) => ({
      id: row.id as string,
      createdAt: row.created_at as string,
      deliveryNoteId: row.delivery_note_id as string,
      dnNumber: row.dn_number as string,
      soNumber: row.so_number as string,
      action: row.action as CustodyEntry['action'],
      note: row.note,
      actorId: row.actor_id,
      actorName: row.actor_name,
      actorRole: row.actor_role,
      fromId: row.from_id,
      fromName: row.from_name,
      fromRole: row.from_role,
      toId: row.to_id,
      toName: row.to_name,
      toRole: row.to_role,
    }));
  }

  /** Slips currently assigned to the signed-in driver. */
  async listForDriver(driverId: string): Promise<DeliveryNoteWithLines[]> {
    const { data, error } = await supabase
      .from('delivery_notes')
      .select('*, delivery_note_lines(*)')
      .eq('assigned_driver_id', driverId)
      // A replaced sheet is void: the driver carries its replacement now.
      .neq('workflow_status', 'replaced')
      .order('driver_sent_at', { ascending: false });

    if (error) throw toAppError(error, 'Loading your delivery notes');

    return this.withLines(data);
  }

  /**
   * The warehouse receiving queue — notes a driver is carrying right now.
   *
   * Backed by a partial index on `workflow_status = 'sent_to_driver'`, so the
   * cost tracks the size of the open queue and not the size of history.
   */
  async listReceivingQueue(limit = 100): Promise<DeliveryNoteWithLines[]> {
    const { data, error } = await supabase
      .from('delivery_notes')
      .select('*, delivery_note_lines(*)')
      .eq('workflow_status', 'sent_to_driver')
      .order('driver_sent_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw toAppError(error, 'Loading the receiving queue');
    return this.withLines(data);
  }

  /**
   * Notes that exist but are not out for delivery yet.
   *
   * The keeper cannot count these — the database refuses an arrival for any
   * note that has not been handed to a driver, so that stock can only ever
   * appear through the approved chain. They are listed anyway because the
   * alternative is worse: a slip uploaded this morning and still sitting
   * with the GM was simply absent from this screen, which reads as "the
   * upload never arrived" rather than "it is waiting on somebody". Showing
   * where a note is stuck is the whole point.
   *
   * `rejected` is left out on purpose — a rejected note is not coming.
   */
  async listNotYetDispatched(limit = 100): Promise<DeliveryNoteWithLines[]> {
    const { data, error } = await supabase
      .from('delivery_notes')
      .select('*, delivery_note_lines(*)')
      .in('workflow_status', ['draft', 'sent_to_gm', 'gm_approved'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw toAppError(error, 'Loading delivery notes on their way');
    return this.withLines(data);
  }

  /** Notes already counted, newest first — the keeper's own recent work. */
  async listReceived(limit = 30): Promise<DeliveryNoteWithLines[]> {
    const { data, error } = await supabase
      .from('delivery_notes')
      .select('*, delivery_note_lines(*)')
      .eq('workflow_status', 'received')
      .order('arrived_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw toAppError(error, 'Loading received delivery notes');
    return this.withLines(data);
  }

  /** Stores an arrival photo in the private bucket and returns its path. */
  async uploadArrivalPhoto(file: File, dnNumber: string): Promise<string> {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const safeDn = dnNumber.replace(/[^A-Za-z0-9_-]/g, '') || 'unknown';
    const path = `arrivals/${safeDn}_${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from(DELIVERY_NOTES_BUCKET)
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });

    if (error) throw toAppError(error, 'Uploading the arrival photo');
    return path;
  }

  /**
   * Confirms what actually arrived.
   *
   * This is the only path by which stock comes into existence, and it adds
   * exactly `arrivedQty` — never the quantity printed on the supplier's note.
   * Every rule behind it (who may call this, whether a reason is required and
   * whether that reason points the right way) is enforced in the database, so
   * the UI cannot talk its way past any of them.
   */
  async receiveLine(input: {
    lineId: string;
    arrivedQty: number;
    warehouseId: string;
    discrepancyCode?: DiscrepancyReason | null;
    discrepancyNote?: string | null;
    arrivalPhotoPath?: string | null;
    notes?: string | null;
  }): Promise<DeliveryNoteLine> {
    const { data, error } = await this.db.rpc('receive_delivery_note_line', {
      p_line_id: input.lineId,
      p_arrived_qty: input.arrivedQty,
      p_warehouse_id: input.warehouseId,
      p_discrepancy_code: input.discrepancyCode ?? undefined,
      p_discrepancy_note: input.discrepancyNote ?? undefined,
      p_arrival_photo_path: input.arrivalPhotoPath ?? undefined,
      p_notes: input.notes ?? undefined,
    });

    if (error) throw toAppError(error, 'Confirming the arrival');
    return toLine(data as Tables<'delivery_note_lines'>);
  }

  /** GM approves or rejects a slip. */
  async decide(dnId: string, approve: boolean, note?: string): Promise<DeliveryNote> {
    const { data, error } = await this.db.rpc('decide_dn', {
      p_dn_id: dnId,
      p_approve: approve,
      p_note: note ?? null,
    });

    if (error) throw toAppError(error, approve ? 'Approving the slip' : 'Rejecting the slip');
    return this.toModel(data as Tables<'delivery_notes'>);
  }
}

class UploadBatchServiceImpl extends BaseService<Tables<'upload_batches'>, UploadBatch> {
  constructor() {
    super('upload_batches', 'Upload Batch');
  }

  protected toModel(row: Tables<'upload_batches'>): UploadBatch {
    return {
      id: row.id,
      createdAt: row.created_at,
      createdBy: row.created_by,
      batchDate: row.batch_date,
      note: row.note,
    };
  }

  /** Opens a batch for a day's intake of slips. */
  async open(batchDate: string, note?: string): Promise<UploadBatch> {
    const { data: session } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('upload_batches')
      .insert({ batch_date: batchDate, note: note ?? null, created_by: session.user?.id })
      .select('*')
      .single();

    if (error) throw toAppError(error, 'Creating the upload batch');
    return this.toModel(data);
  }
}

export const deliveryNoteService = new DeliveryNoteServiceImpl();
export const uploadBatchService = new UploadBatchServiceImpl();
