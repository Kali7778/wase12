import React, { useState } from 'react';
import { CheckCircle2, Eye, Loader2, Send, XCircle } from 'lucide-react';
import type { DeliveryNoteWithLines } from '../../models/deliveryNote';
import { WORKFLOW_LABEL } from '../../models/deliveryNote';
import { deliveryNoteService } from '../../services/DeliveryNoteService';

interface SavedSlipCardProps {
  slip: DeliveryNoteWithLines;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onSend: (id: string) => void;
  sending: boolean;
}

/** A stored slip: its details plus the handoff action. */
export const SavedSlipCard: React.FC<SavedSlipCardProps> = ({
  slip,
  selected,
  onToggleSelect,
  onSend,
  sending,
}) => {
  const [previewBusy, setPreviewBusy] = useState(false);
  const line = slip.lines[0];
  const isDraft = slip.workflowStatus === 'draft';

  const openPreview = async () => {
    if (!slip.pdfStoragePath) return;
    setPreviewBusy(true);
    const url = await deliveryNoteService.getSignedUrl(slip.pdfStoragePath);
    setPreviewBusy(false);
    if (url) window.open(url, '_blank', 'noopener');
  };

  return (
    <div
      className={`rounded-2xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col transition-colors ${
        selected
          ? 'border-indigo-500 ring-2 ring-indigo-500/20'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="p-3.5 flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-2.5 min-w-0">
          {isDraft && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(slip.id)}
              className="mt-0.5 w-4 h-4 rounded accent-indigo-600 cursor-pointer shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
              DN {slip.dnNumber}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">SO {slip.soNumber}</p>
          </div>
        </div>
        <WorkflowBadge status={slip.workflowStatus} />
      </div>

      <div className="p-3.5 space-y-2 flex-1">
        <Row label="Item" value={line ? `${line.itemNumber} — ${line.itemDescription}` : '—'} />
        <div className="grid grid-cols-2 gap-2">
          <Row label="PDF Qty" value={line ? `${line.pdfQty} ${line.uom}` : '—'} strong />
          <Row
            label="Arrived"
            value={line?.arrivedQty === null || line === undefined ? 'Not yet' : `${line.arrivedQty} ${line.uom}`}
            muted={line?.arrivedQty === null}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Row label="Print Date" value={slip.printDate ?? '—'} />
          <Row label="Shipping Ref" value={slip.shippingReference ?? '—'} />
        </div>
        {slip.salesman && <Row label="Salesman" value={slip.salesman} />}
      </div>

      <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <button
          onClick={openPreview}
          disabled={!slip.pdfStoragePath || previewBusy}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title={slip.pdfStoragePath ? 'Open the original slip' : 'No file attached'}
        >
          {previewBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
          View
        </button>

        {isDraft ? (
          <button
            onClick={() => onSend(slip.id)}
            disabled={sending}
            className="flex-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/30 disabled:opacity-60 cursor-pointer"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send to GM
          </button>
        ) : (
          <span className="flex-1 text-[11px] text-slate-400 dark:text-slate-500 text-center">
            {slip.sentAt ? `Sent ${new Date(slip.sentAt).toLocaleDateString()}` : '—'}
          </span>
        )}
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean; muted?: boolean }> = ({
  label,
  value,
  strong,
  muted,
}) => (
  <div className="min-w-0">
    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {label}
    </span>
    <span
      className={`block text-xs truncate ${
        muted
          ? 'text-slate-400 dark:text-slate-500 italic'
          : strong
            ? 'font-bold text-slate-900 dark:text-slate-100'
            : 'text-slate-700 dark:text-slate-300'
      }`}
      title={value}
    >
      {value}
    </span>
  </div>
);

const WorkflowBadge: React.FC<{ status: DeliveryNoteWithLines['workflowStatus'] }> = ({ status }) => {
  const styles = {
    draft: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    sent_to_gm: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300',
    gm_approved: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
    rejected: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
  };
  const icons = {
    draft: null,
    sent_to_gm: <Send className="w-3 h-3" />,
    gm_approved: <CheckCircle2 className="w-3 h-3" />,
    rejected: <XCircle className="w-3 h-3" />,
  };

  return (
    <span
      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${styles[status]}`}
    >
      {icons[status]}
      {WORKFLOW_LABEL[status]}
    </span>
  );
};
