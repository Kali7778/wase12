import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Eye, Loader2, RefreshCw, X } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, Input, Textarea } from '../components/ui/Field';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import { downloadCsv, toCsv, type CsvColumn } from '../utils/csv';
import {
  REISSUE_REASON_LABEL,
  WORKFLOW_LABEL,
  type ReissueRegisterRow,
  type ReissueSubmission,
} from '../models/deliveryNote';

/**
 * The columns the supplier is shown at month end. Same order as the screen,
 * because the conversation follows the paper.
 */
const EXPORT_COLUMNS: CsvColumn<ReissueRegisterRow>[] = [
  { header: 'New DN', value: (r) => r.newDn },
  { header: 'New SO', value: (r) => r.newSo },
  { header: 'Replaced DN', value: (r) => r.replacedDn },
  { header: 'Replaced SO', value: (r) => r.replacedSo },
  { header: 'Reason', value: (r) => REISSUE_REASON_LABEL[r.reason] },
  { header: 'Remarks', value: (r) => r.remarks ?? '' },
  { header: 'Item', value: (r) => r.itemNumber ?? '' },
  { header: 'Qty', value: (r) => r.qty ?? '' },
  { header: 'UOM', value: (r) => r.uom ?? '' },
  { header: 'Recorded', value: (r) => new Date(r.recordedAt).toLocaleString() },
  { header: 'Recorded by', value: (r) => r.recordedBy ?? '' },
  { header: 'Reported', value: (r) => (r.reportedAt ? new Date(r.reportedAt).toLocaleString() : '') },
  { header: 'Reported by', value: (r) => r.reportedBy ?? '' },
  { header: 'New slip status', value: (r) => WORKFLOW_LABEL[r.newSlipStatus] },
];

/**
 * Reissued slips.
 *
 * When a delivery note goes missing at the supplier's yard they print
 * another one for the same goods, with a new number and a new barcode.
 * Nothing in the data says the two sheets are one delivery — only a person
 * can, which is why every replacement here carries a reason, a name and a
 * link to the sheet it replaced.
 *
 * At month end the supplier counts the notes they issued and reaches a
 * higher number than ours. The register below is the answer.
 */
export const ReissuesView: React.FC = () => {
  const [pending, setPending] = useState<ReissueSubmission[]>([]);
  const [register, setRegister] = useState<ReissueRegisterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [queue, rows] = await Promise.all([
        deliveryNoteService.listReissueSubmissions('pending'),
        deliveryNoteService.listReissueRegister(),
      ]);
      setPending(queue);
      setRegister(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the reissued slips');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const replacedQty = useMemo(
    () => register.reduce((sum, r) => sum + (r.qty ?? 0), 0),
    [register],
  );

  const done = async (message: string) => {
    setOpenId(null);
    setNotice(message);
    await refresh();
  };

  const exportRegister = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`reissued-slips-${stamp}.csv`, toCsv(register, EXPORT_COLUMNS));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reissued slips"
        description="Sheets the supplier printed again for goods already on another note. Every one names the slip it replaced."
        stats={[
          { label: 'waiting to be checked', value: pending.length },
          { label: 'replacements on record', value: register.length },
          { label: 'quantity involved', value: replacedQty },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button icon={RefreshCw} size="sm" onClick={refresh} loading={loading}>
              Refresh
            </Button>
            <Button
              icon={Download}
              size="sm"
              variant="secondary"
              disabled={register.length === 0}
              onClick={exportRegister}
            >
              Export
            </Button>
          </div>
        }
      />

      {error && <div className="px-3 py-2 rounded-panel bg-risk-soft text-risk text-tiny">{error}</div>}
      {notice && (
        <div className="px-3 py-2 rounded-panel bg-ok-soft text-ok text-tiny flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <Panel
        title="Reported from the yard"
        description="A driver photographed a replacement sheet. Read its numbers off the photo before it becomes a delivery note."
        flush
      >
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          </div>
        ) : pending.length === 0 ? (
          <EmptyState
            icon={Copy}
            title="Nothing waiting"
            description="Reissues reported by a driver appear here for checking."
          />
        ) : (
          <ul className="divide-line">
            {pending.map((s) => (
              <li key={s.id}>
                <PendingRow
                  submission={s}
                  open={openId === s.id}
                  onToggle={() => {
                    setOpenId(openId === s.id ? null : s.id);
                    setNotice(null);
                  }}
                />
                {openId === s.id && (
                  <DecisionForm submission={s} onCancel={() => setOpenId(null)} onDone={done} />
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="The register"
        description="What to show the supplier when their count of issued notes is higher than ours."
        flush
      >
        {register.length === 0 ? (
          <EmptyState
            icon={Copy}
            title="No replacements recorded"
            description="When a slip is recorded as replacing another, both sheets are listed here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-tiny">
              <thead className="text-micro text-ink-faint bg-sunken">
                <tr>
                  <Th>New DN</Th>
                  <Th>Replaced DN</Th>
                  <Th>Reason</Th>
                  <Th>Item</Th>
                  <Th right>Qty</Th>
                  <Th>Status of the new slip</Th>
                  <Th>Recorded</Th>
                </tr>
              </thead>
              <tbody className="divide-line">
                {register.map((r) => (
                  <tr key={r.deliveryNoteId} className="hover:bg-raised transition-colors">
                    <Td>
                      <span className="font-semibold text-ink" data-numeric>
                        {r.newDn}
                      </span>
                      <span className="block text-micro text-ink-faint" data-numeric>
                        SO {r.newSo}
                      </span>
                    </Td>
                    <Td>
                      <span data-numeric>{r.replacedDn}</span>
                      <span className="block text-micro text-ink-faint" data-numeric>
                        SO {r.replacedSo}
                      </span>
                    </Td>
                    <Td>
                      <Badge tone="warn">{REISSUE_REASON_LABEL[r.reason]}</Badge>
                      {r.remarks && (
                        <span className="block text-micro text-ink-faint mt-0.5">{r.remarks}</span>
                      )}
                    </Td>
                    <Td>{r.itemNumber ?? '—'}</Td>
                    <Td right>
                      <span data-numeric>
                        {r.qty ?? '—'} {r.uom ?? ''}
                      </span>
                    </Td>
                    <Td>{WORKFLOW_LABEL[r.newSlipStatus]}</Td>
                    <Td>
                      <span className="text-micro text-ink-faint">
                        {new Date(r.recordedAt).toLocaleDateString()}
                        {r.recordedBy ? ` · ${r.recordedBy}` : ''}
                        {r.reportedBy ? ` · reported by ${r.reportedBy}` : ''}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};

const Th: React.FC<{ children: React.ReactNode; right?: boolean }> = ({ children, right }) => (
  <th className={`px-4 py-2 font-medium ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);

const Td: React.FC<{ children: React.ReactNode; right?: boolean }> = ({ children, right }) => (
  <td className={`px-4 py-2.5 align-top ${right ? 'text-right' : 'text-left'}`}>{children}</td>
);

const PendingRow: React.FC<{
  submission: ReissueSubmission;
  open: boolean;
  onToggle: () => void;
}> = ({ submission, open, onToggle }) => (
  <div className="px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center hover:bg-raised transition-colors">
    <span className="w-9 h-9 rounded-control bg-sunken border border-line flex items-center justify-center shrink-0">
      <Copy className="w-4 h-4 text-ink-faint" />
    </span>

    <div className="min-w-0 flex-1">
      <p className="text-tiny font-semibold text-ink" data-numeric>
        Replaces DN {submission.originalDnNumber ?? '—'}
      </p>
      <p className="text-micro text-ink-faint">
        {REISSUE_REASON_LABEL[submission.reason]}
        {submission.note ? ` · ${submission.note}` : ''}
        {` · reported ${new Date(submission.submittedAt).toLocaleString()}`}
      </p>
    </div>

    {submission.dnNumber && (
      <div className="text-right shrink-0 sm:px-4">
        <p className="text-micro text-ink-faint">Driver read</p>
        <p className="text-tiny text-ink-soft" data-numeric>
          {submission.dnNumber}
        </p>
      </div>
    )}

    <Button size="sm" variant={open ? 'secondary' : 'primary'} onClick={onToggle}>
      {open ? 'Close' : 'Check it'}
    </Button>
  </div>
);

/**
 * Approving is not a rubber stamp: the numbers on the new sheet are what
 * the warehouse will search for and what the supplier will be shown, so
 * they are typed in from the photo by the person approving (D47).
 */
const DecisionForm: React.FC<{
  submission: ReissueSubmission;
  onCancel: () => void;
  onDone: (message: string) => void | Promise<void>;
}> = ({ submission, onCancel, onDone }) => {
  const [dnNumber, setDnNumber] = useState(submission.dnNumber ?? '');
  const [soNumber, setSoNumber] = useState(submission.soNumber ?? '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  const canApprove = dnNumber.trim() !== '' && soNumber.trim() !== '';

  const openPhoto = async () => {
    if (!submission.filePath) return;
    const url = photo ?? (await deliveryNoteService.getSignedUrl(submission.filePath));
    if (url) {
      setPhoto(url);
      window.open(url, '_blank', 'noopener');
    }
  };

  const approve = async () => {
    if (!canApprove) return;
    setBusy('approve');
    setError(null);
    try {
      const slip = await deliveryNoteService.approveReissue({
        submissionId: submission.id,
        dnNumber,
        soNumber,
      });
      await onDone(`DN ${slip.dnNumber} recorded, replacing DN ${submission.originalDnNumber ?? ''}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve this reissue');
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    if (reason.trim() === '') return;
    setBusy('reject');
    setError(null);
    try {
      await deliveryNoteService.rejectReissue(submission.id, reason);
      await onDone('Reissue turned down. The driver will see the reason.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not turn down this reissue');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="px-4 pb-4">
      <div className="p-3 rounded-panel bg-sunken border border-line">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-micro text-ink-faint">
            The quantity, item and customer come from DN {submission.originalDnNumber ?? '—'}. Only the
            numbers on the new sheet are needed.
          </p>
          {submission.filePath && (
            <Button size="sm" variant="ghost" icon={Eye} onClick={openPhoto}>
              Open the photo
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New delivery note number" htmlFor={`dn-${submission.id}`} required>
            <Input
              id={`dn-${submission.id}`}
              autoFocus
              value={dnNumber}
              onChange={(e) => setDnNumber(e.target.value)}
              data-numeric
            />
          </Field>
          <Field label="New sales order number" htmlFor={`so-${submission.id}`} required>
            <Input
              id={`so-${submission.id}`}
              value={soNumber}
              onChange={(e) => setSoNumber(e.target.value)}
              data-numeric
            />
          </Field>
        </div>

        <Field
          label="Reason for turning it down"
          htmlFor={`why-${submission.id}`}
          className="mt-3"
          hint="Only needed if you are refusing it. The driver is told what you write."
        >
          <Textarea
            id={`why-${submission.id}`}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. This is the replacement, not the original — check the number again"
          />
        </Field>

        {error && <p className="text-micro text-risk mt-2">{error}</p>}

        <div className="flex items-center gap-2 mt-4">
          <Button
            variant="primary"
            size="sm"
            icon={Check}
            disabled={!canApprove || busy !== null}
            loading={busy === 'approve'}
            onClick={approve}
          >
            Record the replacement
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={X}
            disabled={reason.trim() === '' || busy !== null}
            loading={busy === 'reject'}
            onClick={reject}
          >
            Turn it down
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy !== null}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
