import { supabase } from '../lib/supabase';
import { toAppError } from '../lib/errors';
import type { TraceLine, TraceStep, TracedLine } from '../models/trace';

/**
 * Following a sales order, or a single delivery note, through the yard.
 *
 * Both halves are read in one round trip each and joined here: the lines
 * of every slip under that number, and every movement those lines made.
 */
class TraceServiceImpl {
  /**
   * Everything filed under a sales order number — or, if the number is a
   * delivery note's, that slip alone (D81).
   */
  async trace(search: string, limit = 200): Promise<TracedLine[]> {
    const term = search.trim();
    if (!term) return [];

    const { data, error } = await supabase
      .from('v_slip_trace')
      .select('*')
      .or(`so_number.ilike.%${term}%,dn_number.ilike.%${term}%`)
      .order('so_number')
      .order('dn_number')
      .limit(limit);

    if (error) throw toAppError(error, 'Following the sales order');

    const lines: TraceLine[] = (data ?? []).map((r) => ({
      lineId: r.line_id as string,
      deliveryNoteId: r.delivery_note_id as string,
      dnNumber: r.dn_number as string,
      soNumber: r.so_number as string,
      purpose: r.purpose as TraceLine['purpose'],
      workflowStatus: r.workflow_status as TraceLine['workflowStatus'],
      printDate: r.print_date,
      uploadedAt: r.uploaded_at as string,
      itemNumber: r.item_number as string,
      itemDescription: r.item_description as string,
      uom: r.uom as string,
      pdfQty: Number(r.pdf_qty ?? 0),
      arrivedQty: r.arrived_qty === null ? null : Number(r.arrived_qty),
      missingQty: Number(r.missing_qty ?? 0),
      lineStatus: r.line_status as TraceLine['lineStatus'],
      receivedAt: r.received_at,
      inQty: Number(r.in_qty ?? 0),
      outQty: Number(r.out_qty ?? 0),
      balanceQty: Number(r.balance_qty ?? 0),
      talabCustomerName: r.talab_customer_name,
      talabBillNumber: r.talab_bill_number,
      talabBillCancelled: Boolean(r.talab_bill_cancelled),
    }));

    if (lines.length === 0) return [];

    const { data: moves, error: moveError } = await supabase
      .from('v_slip_trace_movements')
      .select('*')
      .in('line_id', lines.map((l) => l.lineId))
      .order('occurred_at');

    if (moveError) throw toAppError(moveError, 'Following the goods');

    const steps: TraceStep[] = (moves ?? []).map((r) => ({
      movementId: r.movement_id as string,
      lineId: r.line_id as string,
      dnNumber: r.dn_number as string,
      soNumber: r.so_number as string,
      itemDescription: r.item_description as string,
      uom: r.uom as string,
      occurredAt: r.occurred_at as string,
      direction: r.direction as TraceStep['direction'],
      movementType: r.movement_type as TraceStep['movementType'],
      qty: Number(r.qty ?? 0),
      referenceNo: r.reference_no,
      notes: r.notes,
      isReversal: Boolean(r.is_reversal),
      warehouseName: r.warehouse_name,
      billNumber: r.bill_number,
      billCustomerName: r.bill_customer_name,
      billIsWalkIn: Boolean(r.bill_is_walk_in),
      billCancelled: Boolean(r.bill_cancelled),
      actorName: r.actor_name,
    }));

    const byLine = new Map<string, TraceStep[]>();
    steps.forEach((s) => {
      const list = byLine.get(s.lineId);
      if (list) list.push(s);
      else byLine.set(s.lineId, [s]);
    });

    return lines.map((l) => ({ ...l, steps: byLine.get(l.lineId) ?? [] }));
  }
}

export const traceService = new TraceServiceImpl();
