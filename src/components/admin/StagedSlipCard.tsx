import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  Trash2,
  XCircle,
} from 'lucide-react';

const REISSUE_REASONS: ReissueReason[] = ['lost', 'damaged', 'supplier_correction', 'other'];
import type { ReissueAnswer, StagedSlip } from '../../hooks/useSlipStaging';
import {
  REISSUE_REASON_LABEL,
  TERMS_LABEL,
  type Customer,
  type DnPurpose,
  type ReissueReason,
} from '../../models/deliveryNote';
import { FIELD_LABEL, type ExtractedDn } from '../../utils/dnParser';

interface StagedSlipCardProps {
  slip: StagedSlip;
  /** Admin or superadmin: may accept a sales order number already in use. */
  canOverrideSo: boolean;
  /** Admin, GM or superadmin: may record this slip as a replacement (D32). */
  canRecordReissue: boolean;
  /** Customers to choose from when the load goes straight to one (D49). */
  customers: Customer[];
  onPurpose: (key: string, purpose: DnPurpose) => void;
  onCustomer: (key: string, customerId: string) => void;
  onEdit: (key: string, field: keyof ExtractedDn, value: string) => void;
  onSoReason: (key: string, reason: string) => void;
  onReissue: (key: string, patch: Partial<ReissueAnswer>) => void;
  onRemove: (key: string) => void;
}

/** Fields shown on the card, in the order they appear on the printed slip. */
const CARD_FIELDS: Array<{ field: keyof ExtractedDn; wide?: boolean }> = [
  { field: 'dnNumber' },
  { field: 'soNumber' },
  { field: 'customerNumber' },
  { field: 'shippingReference' },
  { field: 'printDate' },
  { field: 'orderDate' },
  { field: 'itemNumber' },
  { field: 'uom' },
  { field: 'itemDescription', wide: true },
  { field: 'pdfQty' },
  { field: 'salesman' },
  { field: 'shipFrom', wide: true },
];

export const StagedSlipCard: React.FC<StagedSlipCardProps> = ({
  slip,
  canOverrideSo,
  canRecordReissue,
  customers,
  onPurpose,
  onCustomer,
  onEdit,
  onSoReason,
  onReissue,
  onRemove,
}) => {
  const { data, status, duplicate, soConflict } = slip;
  const needsReview = data.needsReview.length > 0;
  const soUnresolved =
    Boolean(soConflict) && !duplicate && !(canOverrideSo && slip.soOverrideReason.trim() !== '');
  const { possibleOriginals, reissue } = slip;
  const reissueUnanswered = possibleOriginals.length > 0 && !reissue.answered;
  const reissueIncomplete =
    reissue.isReplacement &&
    (reissue.originalId === '' ||
      reissue.reason === '' ||
      (reissue.reason === 'other' && reissue.note.trim() === ''));
  const talab = slip.purpose === 'talab';
  const customerMissing = talab && slip.customerId === '';
  const blocked =
    Boolean(duplicate) ||
    needsReview ||
    soUnresolved ||
    reissueUnanswered ||
    reissueIncomplete ||
    customerMissing;
  const editable = status !== 'saving' && status !== 'saved';

  return (
    <div
      className={`rounded-2xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col ${
        duplicate || soUnresolved
          ? 'border-amber-300 dark:border-amber-800'
          : status === 'error'
            ? 'border-red-300 dark:border-red-800'
            : status === 'saved'
              ? 'border-emerald-300 dark:border-emerald-800'
              : needsReview
                ? 'border-orange-300 dark:border-orange-800'
                : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Preview */}
      <div className="relative bg-slate-100 dark:bg-slate-800 h-40 flex items-center justify-center overflow-hidden">
        {slip.thumbnail ? (
          <img src={slip.thumbnail} alt={slip.file.name} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-slate-400">
            {status === 'parsing' ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <FileText className="w-7 h-7" />
            )}
            <span className="text-[11px] uppercase tracking-wide">{slip.fileType}</span>
          </div>
        )}

        <StatusBadge slip={slip} />

        <button
          onClick={() => onRemove(slip.key)}
          disabled={status === 'saving'}
          title="Remove from this upload"
          className="absolute top-2 left-2 p-1.5 rounded-lg bg-white/90 dark:bg-slate-900/90 text-slate-500 hover:text-red-600 shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3.5 flex-1 flex flex-col gap-3">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate" title={slip.file.name}>
          {slip.file.name} · {(slip.file.size / 1024).toFixed(0)} KB
        </p>

        {duplicate && (
          <Notice tone="amber" icon={<Copy className="w-3.5 h-3.5" />}>
            Already uploaded on {new Date(duplicate.uploadedAt).toLocaleDateString()} as{' '}
            <strong>{duplicate.dnNumber}</strong>. This slip will be skipped.
          </Notice>
        )}

        {soConflict && !duplicate && (
          <Notice tone="amber" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
            Sales order <strong>{soConflict.soNumber}</strong> is already on delivery note{' '}
            <strong>{soConflict.dnNumber}</strong>, uploaded{' '}
            {new Date(soConflict.uploadedAt).toLocaleDateString()}.{' '}
            {canOverrideSo
              ? 'If the supplier split this order across deliveries, give the reason below to save it.'
              : 'Only an admin can save a slip with a sales order number that is already in use.'}
          </Notice>
        )}

        {soConflict && !duplicate && canOverrideSo && (
          <label className="block">
            <span className="block text-[10px] font-semibold uppercase tracking-wide mb-0.5 text-amber-700 dark:text-amber-400">
              Reason for accepting this sales order *
            </span>
            <textarea
              value={slip.soOverrideReason}
              disabled={!editable}
              onChange={(e) => onSoReason(slip.key, e.target.value)}
              rows={2}
              placeholder="For example: the supplier delivered this order in two trucks"
              className="w-full px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
        )}

        {possibleOriginals.length > 0 && !duplicate && (
          <div className="p-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-[11px] leading-snug text-amber-800 dark:text-amber-300 space-y-2">
            <div className="flex items-start gap-1.5">
              <Copy className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                The same item and quantity are already expected on{' '}
                <strong>DN {possibleOriginals[0].dnNumber}</strong>
                {possibleOriginals.length > 1 && ` and ${possibleOriginals.length - 1} more`}. Is this
                sheet the supplier's replacement for it?
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!canRecordReissue || !editable}
                onClick={() => onReissue(slip.key, { answered: true, isReplacement: true })}
                className={`px-2 py-1 rounded-md border text-[11px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  reissue.answered && reissue.isReplacement
                    ? 'bg-amber-600 text-white border-transparent'
                    : 'border-amber-300 dark:border-amber-800'
                }`}
              >
                Yes, it replaces one
              </button>
              <button
                type="button"
                disabled={!editable}
                onClick={() =>
                  onReissue(slip.key, {
                    answered: true,
                    isReplacement: false,
                    originalId: '',
                    reason: '',
                    note: '',
                  })
                }
                className={`px-2 py-1 rounded-md border text-[11px] font-semibold cursor-pointer disabled:opacity-50 ${
                  reissue.answered && !reissue.isReplacement
                    ? 'bg-slate-700 text-white border-transparent'
                    : 'border-amber-300 dark:border-amber-800'
                }`}
              >
                No, separate delivery
              </button>
            </div>

            {!canRecordReissue && (
              <p>Only an admin or the GM can record a replacement.</p>
            )}

            {reissue.isReplacement && (
              <div className="space-y-2 pt-1">
                <label className="block">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide mb-0.5">
                    Which slip does it replace? *
                  </span>
                  <select
                    value={reissue.originalId}
                    disabled={!editable}
                    onChange={(e) => onReissue(slip.key, { originalId: e.target.value })}
                    className="w-full px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="">Choose the slip</option>
                    {possibleOriginals.map((o) => (
                      <option key={o.id} value={o.id}>
                        {`DN ${o.dnNumber} · ${o.pdfQty} · ${o.holderName || 'not handed out'}`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide mb-0.5">
                    Why was it reissued? *
                  </span>
                  <select
                    value={reissue.reason}
                    disabled={!editable}
                    onChange={(e) => onReissue(slip.key, { reason: e.target.value as ReissueReason })}
                    className="w-full px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="">Choose a reason</option>
                    {REISSUE_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {REISSUE_REASON_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide mb-0.5">
                    Remarks {reissue.reason === 'other' && '*'}
                  </span>
                  <textarea
                    rows={2}
                    value={reissue.note}
                    disabled={!editable}
                    onChange={(e) => onReissue(slip.key, { note: e.target.value })}
                    placeholder="What happened to the first sheet"
                    className="w-full px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {needsReview && !duplicate && (
          <Notice tone="orange" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
            Could not read: {data.needsReview.map((f) => FIELD_LABEL[f] ?? f).join(', ')}. Fill these in
            to save this slip.
          </Notice>
        )}

        {slip.error && (
          <Notice tone="red" icon={<XCircle className="w-3.5 h-3.5" />}>
            {slip.error}
          </Notice>
        )}

        <div
          className={`p-2 rounded-lg border space-y-2 ${
            talab
              ? 'border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40'
              : 'border-slate-200 dark:border-slate-700'
          }`}
        >
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={talab}
              disabled={!editable}
              onChange={(e) => onPurpose(slip.key, e.target.checked ? 'talab' : 'stock')}
              className="mt-0.5 w-3.5 h-3.5 rounded cursor-pointer accent-sky-600"
            />
            <span className="text-[11px] leading-snug text-slate-700 dark:text-slate-300">
              <span className="font-semibold">This load goes straight to a customer</span>
              <span className="block text-slate-400 dark:text-slate-500">
                It never reaches the warehouse, so it is not counted in and stays out of the
                inventory register.
              </span>
            </span>
          </label>

          {talab && (
            <label className="block">
              <span className="block text-[10px] font-semibold uppercase tracking-wide mb-0.5 text-sky-700 dark:text-sky-400">
                Which customer? *
              </span>
              <select
                value={slip.customerId}
                disabled={!editable}
                onChange={(e) => onCustomer(slip.key, e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-sky-300 dark:border-sky-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer disabled:opacity-60"
              >
                <option value="">Choose the customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {`${c.name} · ${TERMS_LABEL[c.terms]}`}
                  </option>
                ))}
              </select>
              {customers.length === 0 && (
                <span className="block mt-1 text-[11px] text-sky-700 dark:text-sky-400">
                  No customers on the list yet. Add one on the Customers screen first.
                </span>
              )}
            </label>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {CARD_FIELDS.map(({ field, wide }) => {
            const invalid = data.needsReview.includes(field);
            const value = field === 'pdfQty' ? (data.pdfQty ?? '') : (data[field] as string);
            return (
              <label key={field} className={wide ? 'col-span-2' : ''}>
                <span
                  className={`block text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${
                    invalid ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {FIELD_LABEL[field]}
                  {invalid && ' *'}
                </span>
                <input
                  value={String(value)}
                  disabled={!editable}
                  onChange={(e) => onEdit(slip.key, field, e.target.value)}
                  className={`w-full px-2 py-1 rounded-lg border text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    invalid
                      ? 'border-orange-300 dark:border-orange-700'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
              </label>
            );
          })}
        </div>

        <div className="mt-auto pt-1 flex items-center justify-between text-[11px]">
          <span className="text-slate-400 dark:text-slate-500">Read automatically</span>
          <span
            className={`font-bold ${
              data.confidence === 100
                ? 'text-emerald-600 dark:text-emerald-400'
                : data.confidence >= 60
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-red-600 dark:text-red-400'
            }`}
          >
            {data.confidence}% of fields
          </span>
        </div>

        {!blocked && status === 'ready' && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready to save
          </div>
        )}
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ slip: StagedSlip }> = ({ slip }) => {
  const map = {
    parsing: { text: 'Reading…', cls: 'bg-slate-700 text-white' },
    ready: null,
    saving: { text: 'Saving…', cls: 'bg-indigo-600 text-white' },
    saved: { text: 'Saved', cls: 'bg-emerald-600 text-white' },
    error: { text: 'Failed', cls: 'bg-red-600 text-white' },
  } as const;

  const badge = map[slip.status];
  if (!badge) return null;

  return (
    <span
      className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${badge.cls}`}
    >
      {badge.text}
    </span>
  );
};

const Notice: React.FC<{
  tone: 'amber' | 'orange' | 'red';
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ tone, icon, children }) => {
  const tones = {
    amber: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300',
    orange:
      'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900 text-orange-800 dark:text-orange-300',
    red: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300',
  };
  return (
    <div className={`flex items-start gap-1.5 p-2 rounded-lg border text-[11px] leading-snug ${tones[tone]}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
};
