import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Eye,
  FileStack,
  Inbox,
  Loader2,
  RefreshCw,
  Stamp,
  Truck,
  X,
} from 'lucide-react';
import { PageHeader, Panel, EmptyState, Metric } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, Select, Textarea } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { fullName } from '../models/masterData';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import type { DeliveryNoteWithLines, DnWorkflowStatus, Recipient } from '../models/deliveryNote';
import { WORKFLOW_LABEL } from '../models/deliveryNote';

const TONE: Record<DnWorkflowStatus, 'neutral' | 'accent' | 'ok' | 'risk' | 'info'> = {
  draft: 'neutral',
  sent_to_gm: 'accent',
  gm_approved: 'ok',
  sent_to_driver: 'info',
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
  const { can, profile } = useAuth();
  const [slips, setSlips] = useState<DeliveryNoteWithLines[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [drivers, setDrivers] = useState<Recipient[]>([]);
  const [handing, setHanding] = useState<string | null>(null);
  const [driverId, setDriverId] = useState('');

  const canDecide = can('gm', 'ceo');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSlips(
        await deliveryNoteService.listByWorkflowStatus([
          'sent_to_gm',
          'gm_approved',
          'sent_to_driver',
          'rejected',
        ]),
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

  useEffect(() => {
    deliveryNoteService
      .listRecipients('driver')
      .then((list) => {
        setDrivers(list);
        setDriverId((current) => current || list[0]?.id || '');
      })
      .catch(() => setDrivers([]));
  }, []);

  const pending = useMemo(
    () => slips.filter((s) => s.workflowStatus === 'sent_to_gm' || s.workflowStatus === 'gm_approved'),
    [slips],
  );
  const decided = useMemo(
    () => slips.filter((s) => s.workflowStatus === 'sent_to_driver' || s.workflowStatus === 'rejected'),
    [slips],
  );

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

  /**
   * Hands a slip to a driver. A stamped copy of the delivery note is created;
   * the supplier original is left untouched.
   */
  const handOver = async (slip: DeliveryNoteWithLines) => {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return;
    setBusyId(slip.id);
    setMessage(null);
    try {
      const { stamped } = await deliveryNoteService.handToDriver({
        slip,
        driverId: driver.id,
        driverName: driver.fullName || driver.email,
        approvedByName: profile ? fullName(profile) || profile.email : 'GM',
      });
      setMessage({
        tone: 'ok',
        text: stamped
          ? `Sent to ${driver.fullName}. A stamped copy was attached.`
          : `Sent to ${driver.fullName}. The slip could not be stamped, so the original was passed on.`,
      });
      setHanding(null);
      await refresh();
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Could not hand over the slip' });
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
        description="Delivery slips handed over by the admin. Assign each one to a driver, or reject it with a reason."
        stats={[
          { label: 'awaiting you', value: pending.length },
          { label: 'with drivers', value: decided.filter((s) => s.workflowStatus === 'sent_to_driver').length },
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
                  onAssign={() => {
                    setHanding(handing === slip.id ? null : slip.id);
                    setRejecting(null);
                  }}
                  onReject={() => {
                    setRejecting(slip.id);
                    setHanding(null);
                    setReason('');
                  }}
                />
                {handing === slip.id && (
                  <div className="px-4 pb-4 -mt-1">
                    <div className="p-3 rounded-panel bg-sunken border border-line">
                      <Field
                        label="Driver"
                        htmlFor={`driver-${slip.id}`}
                        required
                        hint="A stamped copy is created for the driver. The supplier original is kept unchanged."
                      >
                        <Select
                          id={`driver-${slip.id}`}
                          value={driverId}
                          onChange={(e) => setDriverId(e.target.value)}
                        >
                          {drivers.length === 0 && <option value="">No active drivers</option>}
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.fullName || d.email}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Check}
                          disabled={!driverId}
                          loading={busyId === slip.id}
                          onClick={() => handOver(slip)}
                        >
                          Approve &amp; send
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setHanding(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
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
        <Panel title="Handed over" flush>
          <ul className="divide-line">
            {decided.slice(0, 25).map((slip) => (
              <li key={slip.id}>
                <SlipRow
                  slip={slip}
                  busy={false}
                  driverName={drivers.find((d) => d.id === slip.assignedDriverId)?.fullName}
                />
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
  onAssign?: () => void;
  onReject?: () => void;
  driverName?: string;
}> = ({ slip, busy, onAssign, onReject, driverName }) => {
  const [previewBusy, setPreviewBusy] = useState(false);
  const line = slip.lines[0];

  const openPdf = async () => {
    const path = slip.stampedPdfPath ?? slip.pdfStoragePath;
    if (!path) return;
    setPreviewBusy(true);
    const url = await deliveryNoteService.getSignedUrl(path);
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
          {slip.assignedDriverId && (
            <p className="text-micro text-ink-faint mt-1 flex items-center gap-1.5">
              <Truck className="w-3 h-3" />
              With {driverName ?? "driver"}
              {slip.driverSentAt && ` · ${new Date(slip.driverSentAt).toLocaleString()}`}
              {slip.stampedPdfPath && (
                <span className="inline-flex items-center gap-1 text-ok">
                  <Stamp className="w-3 h-3" /> stamped
                </span>
              )}
            </p>
          )}
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
          disabled={!slip.pdfStoragePath && !slip.stampedPdfPath}
          title={slip.stampedPdfPath ? 'Open the stamped slip' : 'Open the original slip'}
        >
          View
        </Button>
        {onAssign && (
          <>
            <Button size="sm" variant="primary" icon={Truck} onClick={onAssign} loading={busy}>
              Send to driver
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
