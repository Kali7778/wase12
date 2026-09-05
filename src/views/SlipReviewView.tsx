import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Eye,
  FileStack,
  Inbox,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { PageHeader, Panel, EmptyState, Metric } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, Textarea } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import type { DeliveryNoteWithLines, DnWorkflowStatus } from '../models/deliveryNote';
import { WORKFLOW_LABEL } from '../models/deliveryNote';

const TONE: Record<DnWorkflowStatus, 'neutral' | 'accent' | 'ok' | 'risk'> = {
  draft: 'neutral',
  sent_to_gm: 'accent',
  gm_approved: 'ok',
  rejected: 'risk',
};

/**
 * Slip review.
 *
 * Where the GM sees the delivery slips the admin has handed over, and approves
 * or rejects each one. Before this existed the admin could send a slip but it
 * had nowhere to arrive.
 */
export const SlipReviewView: React.FC = () => {
  const { can } = useAuth();
  const [slips, setSlips] = useState<DeliveryNoteWithLines[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const canDecide = can('gm', 'ceo');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSlips(
        await deliveryNoteService.listByWorkflowStatus(['sent_to_gm', 'gm_approved', 'rejected']),
      );
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Could not load slips' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pending = useMemo(() => slips.filter((s) => s.workflowStatus === 'sent_to_gm'), [slips]);
  const decided = useMemo(() => slips.filter((s) => s.workflowStatus !== 'sent_to_gm'), [slips]);

  const decide = async (id: string, approve: boolean, note?: string) => {
    setBusyId(id);
    setMessage(null);
    try {
      await deliveryNoteService.decide(id, approve, note);
      setMessage({ tone: 'ok', text: approve ? 'Slip approved.' : 'Slip rejected.' });
      setRejecting(null);
      setReason('');
      await refresh();
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Could not save the decision' });
    } finally {
      setBusyId(null);
    }
  };

  if (!canDecide) {
    return (
      <EmptyState
        icon={Inbox}
        title="Not available for your role"
        description="Only the GM or a superadmin can review delivery slips."
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Slip Review"
        description="Delivery slips handed over by the admin. Approve each one, or reject it with a reason."
        stats={[
          { label: 'awaiting you', value: pending.length },
          { label: 'approved', value: decided.filter((s) => s.workflowStatus === 'gm_approved').length },
          { label: 'rejected', value: decided.filter((s) => s.workflowStatus === 'rejected').length },
        ]}
        actions={<Button icon={RefreshCw} onClick={refresh} loading={loading} size="sm">Refresh</Button>}
      />

      {message && (
        <div
          className={`px-3 py-2 rounded-panel border text-tiny ${
            message.tone === 'ok'
              ? 'bg-ok-soft border-transparent text-ok'
              : 'bg-risk-soft border-transparent text-risk'
          }`}
        >
          {message.text}
        </div>
      )}

      <Panel title="Awaiting your decision" flush>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          </div>
        ) : pending.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Nothing waiting"
            description="Slips sent to you by the admin will appear here."
          />
        ) : (
          <ul className="divide-line">
            {pending.map((slip) => (
              <li key={slip.id}>
                <SlipRow
                  slip={slip}
                  busy={busyId === slip.id}
                  onApprove={() => decide(slip.id, true)}
                  onReject={() => {
                    setRejecting(slip.id);
                    setReason('');
                  }}
                />
                {rejecting === slip.id && (
                  <div className="px-4 pb-4 -mt-1">
                    <div className="p-3 rounded-panel bg-sunken border border-line">
                      <Field
                        label="Reason for rejection"
                        htmlFor={`reason-${slip.id}`}
                        required
                        hint="The reason is recorded in the audit trail and shown to the admin."
                      >
                        <Textarea
                          id={`reason-${slip.id}`}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="e.g. Quantity does not match the purchase order"
                        />
                      </Field>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="danger"
                          size="sm"
                          icon={X}
                          disabled={reason.trim().length === 0}
                          loading={busyId === slip.id}
                          onClick={() => decide(slip.id, false, reason.trim())}
                        >
                          Confirm rejection
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setRejecting(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {decided.length > 0 && (
        <Panel title="Recently decided" flush>
          <ul className="divide-line">
            {decided.slice(0, 25).map((slip) => (
              <li key={slip.id}>
                <SlipRow slip={slip} busy={false} />
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
};

const SlipRow: React.FC<{
  slip: DeliveryNoteWithLines;
  busy: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}> = ({ slip, busy, onApprove, onReject }) => {
  const [previewBusy, setPreviewBusy] = useState(false);
  const line = slip.lines[0];

  const openPdf = async () => {
    if (!slip.pdfStoragePath) return;
    setPreviewBusy(true);
    const url = await deliveryNoteService.getSignedUrl(slip.pdfStoragePath);
    setPreviewBusy(false);
    if (url) window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center hover:bg-raised transition-colors">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <span className="w-8 h-8 rounded-control bg-sunken border border-line flex items-center justify-center shrink-0">
          <FileStack className="w-4 h-4 text-ink-faint" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-tiny font-semibold text-ink" data-numeric>
              DN {slip.dnNumber}
            </span>
            <Badge tone={TONE[slip.workflowStatus]}>{WORKFLOW_LABEL[slip.workflowStatus]}</Badge>
          </div>
          <p className="text-micro text-ink-faint mt-0.5 truncate">
            SO {slip.soNumber}
            {line && ` · ${line.itemDescription}`}
            {slip.printDate && ` · ${slip.printDate}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-5 shrink-0 lg:px-4">
        <div>
          <p className="text-micro text-ink-faint">PDF Qty</p>
          <p className="text-tiny font-semibold text-ink" data-numeric>
            {line ? `${line.pdfQty} ${line.uom}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-micro text-ink-faint">Arrived</p>
          <p className="text-tiny text-ink-faint" data-numeric>
            {line?.arrivedQty == null ? 'Not yet' : `${line.arrivedQty} ${line.uom}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          icon={Eye}
          onClick={openPdf}
          loading={previewBusy}
          disabled={!slip.pdfStoragePath}
          title={slip.pdfStoragePath ? 'Open the original slip' : 'No file attached'}
        >
          View
        </Button>
        {onApprove && (
          <>
            <Button size="sm" variant="primary" icon={Check} onClick={onApprove} loading={busy}>
              Approve
            </Button>
            <Button size="sm" variant="ghost" icon={X} onClick={onReject} disabled={busy}>
              Reject
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
