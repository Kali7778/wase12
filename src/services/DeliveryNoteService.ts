import { BaseService } from './BaseService';
import { DELIVERY_NOTES_BUCKET, supabase } from '../lib/supabase';
import { toAppError } from '../lib/errors';
import type {
  DeliveryNote,
  DeliveryNoteLine,
  DeliveryNoteWithLines,
  DiscrepancyReason,
  DnWorkflowStatus,
  DuplicateMatch,
  UploadBatch,
} from '../models/deliveryNote';
import type { Recipient, WorkflowEntry } from '../models/deliveryNote';
import { stampDeliveryNote, stampedPathFor } from '../utils/pdfStamp';
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
  async findDuplicates(sha256: string[], dnNumbers: string[]): Promise<DuplicateMatch[]> {
    const { data, error } = await this.db.rpc('check_dn_duplicates', {
      p_sha256: sha256.length ? sha256 : null,
      p_dn_numbers: dnNumbers.length ? dnNumbers : null,
    });

    if (error) throw toAppError(error, 'Checking for duplicates');
    return (data ?? []).map((row) => ({
      dnNumber: row.dn_number,
      pdfSha256: row.pdf_sha256,
      uploadedAt: row.uploaded_at,
      workflowStatus: row.workflow_status,
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
    options: { batchId?: string; pdfPath?: string; pdfFileName?: string; pdfSha256?: string },
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
      p_pdf_sha256: options.pdfSha256 ?? null,
      p_file_type: input.fileType ?? 'pdf',
      p_extraction: input.extractionMethod ?? 'pdf_text',
      p_confidence: input.confidence ?? null,
      p_needs_review: input.needsReview ?? [],
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
  async listRecipients(kind: 'gm' | 'driver'): Promise<Recipient[]> {
    const { data, error } = await this.db.rpc('list_recipients', { p_kind: kind });
    if (error) throw toAppError(error, 'Loading recipients');
    return (data ?? []).map((r) => ({ id: r.id, fullName: r.full_name, email: r.email }));
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
   * Hands an approved slip to a driver.
   *
   * A stamped COPY of the delivery note is produced and stored alongside the
   * original, which is never modified — it is the supplier's document and the
   * only record of what was actually dispatched.
   *
   * If stamping fails the handover still proceeds with the unstamped original,
   * because blocking a dispatch over a cosmetic stamp would be the worse
   * outcome. The caller is told through the returned `stamped` flag.
   */
  async handToDriver(input: {
    slip: DeliveryNote;
    driverId: string;
    driverName: string;
    approvedByName: string;
    note?: string;
  }): Promise<{ slip: DeliveryNote; stamped: boolean }> {
    let stampedPath: string | undefined;

    if (input.slip.pdfStoragePath) {
      try {
        const { data, error } = await supabase.storage
          .from(DELIVERY_NOTES_BUCKET)
          .download(input.slip.pdfStoragePath);
        if (error || !data) throw error ?? new Error('No file');

        const stamped = await stampDeliveryNote(await data.arrayBuffer(), {
          approvedBy: input.approvedByName,
          grantedTo: input.driverName,
          dnNumber: input.slip.dnNumber,
        });

        const path = stampedPathFor(input.slip.pdfStoragePath);
        const { error: upErr } = await supabase.storage
          .from(DELIVERY_NOTES_BUCKET)
          .upload(path, new Blob([stamped as BlobPart], { type: 'application/pdf' }), {
            contentType: 'application/pdf',
            upsert: true,
          });
        if (upErr) throw upErr;
        stampedPath = path;
      } catch {
        stampedPath = undefined;
      }
    }

    const { data, error } = await this.db.rpc('send_dn_to_driver', {
      p_dn_id: input.slip.id,
      p_driver_id: input.driverId,
      p_stamped_pdf_path: stampedPath ?? null,
      p_note: input.note ?? null,
    });

    if (error) throw toAppError(error, 'Handing the slip to the driver');
    return { slip: this.toModel(data as Tables<'delivery_notes'>), stamped: Boolean(stampedPath) };
  }

  /** Slips currently assigned to the signed-in driver. */
  async listForDriver(driverId: string): Promise<DeliveryNoteWithLines[]> {
    const { data, error } = await supabase
      .from('delivery_notes')
      .select('*, delivery_note_lines(*)')
      .eq('assigned_driver_id', driverId)
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
