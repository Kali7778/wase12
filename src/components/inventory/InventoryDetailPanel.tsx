import React, { useEffect, useState } from 'react';
import { AlertTriangle, Camera, Eye, Loader2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { deliveryNoteService } from '../../services/DeliveryNoteService';
import type { InventoryRow } from '../../models/inventory';
import type { DeliveryNoteWithLines, WorkflowEntry } from '../../models/deliveryNote';
import { DISCREPANCY_ACCOUNTABLE, DISCREPANCY_LABEL, WORKFLOW_LABEL } from '../../models/deliveryNote';
import { DN_STATUS_LABEL } from '../../models/deliveryNote';

/**
 * The whole story behind one register row.
 *
 * The table answers "how much"; this answers "what happened, and who did it".
 * A shortage is only useful if you can get from the number to the person who
 * counted it and the reason they gave, without leaving the screen.
 */
export const InventoryDetailPanel: React.FC<{
  row: InventoryRow;
  onClose: () => void;
}> = ({ row, onClose }) => {
  const [history, setHistory] = useState<WorkflowEntry[]>([]);
  const [note, setNote] = useState<DeliveryNoteWithLines | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingFile, setOpeningFile] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [entries, found] = await Promise.all([
          deliveryNoteService.getHistory(row.deliveryNoteId),
          deliveryNoteService.getWithLines(row.deliveryNoteId),
        ]);
        if (cancelled) return;
        setHistory(entries);
        setNote(found);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [row.deliveryNoteId]);

  // Escape closes the panel, as it does everywhere else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const line = note?.lines.find((l) => l.itemNumber === row.itemNumber) ?? note?.lines[0] ?? null;

  const openFile = async (path: string, key: string) => {
    setOpeningFile(key);
    const url = await deliveryNoteService.getSignedUrl(path);
    setOpeningFile(null);
    if (url) window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-label={`Delivery note ${row.dnNumber}`}
        className="relative w-full max-w-md h-full bg-surface border-l border-line shadow-xl overflow-y-auto"
      >
        <header className="sticky top-0 bg-surface border-b border-line px-4 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-tiny font-semibold text-ink" data-numeric>
              DN {row.dnNumber}
            </h2>
            <p className="text-micro text-ink-faint mt-0.5 truncate">
              SO {row.soNumber}
              {row.printDate && ` · ${row.printDate}`}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-7 w-7 rounded-control flex items-center justify-center text-ink-faint hover:bg-raised cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-4 space-y-5">
          <section>
            <h3 className="text-micro font-semibold uppercase tracking-wider text-ink-faint mb-2">
              Quantities
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Row label="Delivery note says" value={`${row.pdfQty} ${row.uom}`} />
              <Row
                label="Actually arrived"
                value={row.receivedAt ? `${row.arrivedQty} ${row.uom}` : 'Not counted yet'}
              />
              <Row label="In" value={`${row.inQty} ${row.uom}`} />
              <Row label="Out" value={`${row.outQty} ${row.uom}`} />
              <Row label="Balance" value={`${row.balanceQty} ${row.uom}`} strong />
              <Row label="Status" value={DN_STATUS_LABEL[row.status]} />
            </dl>
          </section>

          {row.receivedAt && row.missingQty !== 0 && (
            <section
              className={`px-3 py-2.5 rounded-panel border text-tiny ${
                row.missingQty > 0
                  ? 'bg-risk-soft border-risk/25 text-risk'
                  : 'bg-warn-soft border-warn/25 text-warn'
              }`}
            >
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {Math.abs(row.missingQty)} {row.uom}{' '}
                {row.missingQty > 0 ? 'short of the delivery note' : 'more than the delivery note'}
              </p>
              {row.discrepancyCode && (
                <p className="mt-1.5 text-micro">
                  {DISCREPANCY_LABEL[row.discrepancyCode]}
                  {DISCREPANCY_ACCOUNTABLE[row.discrepancyCode] !== '—' && (
                    <> · answerable: {DISCREPANCY_ACCOUNTABLE[row.discrepancyCode]}</>
                  )}
                </p>
              )}
              {line?.discrepancyReason && (
                <p className="mt-1 text-micro opacity-90">“{line.discrepancyReason}”</p>
              )}
            </section>
          )}

          <section>
            <h3 className="text-micro font-semibold uppercase tracking-wider text-ink-faint mb-2">
              Documents
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                icon={Eye}
                disabled={!note?.pdfStoragePath}
                loading={openingFile === 'pdf'}
                onClick={() => note?.pdfStoragePath && openFile(note.pdfStoragePath, 'pdf')}
              >
                Delivery note
              </Button>
              {line?.arrivalPhotoPath && (
                <Button
                  size="sm"
                  icon={Camera}
                  loading={openingFile === 'photo'}
                  onClick={() => openFile(line.arrivalPhotoPath as string, 'photo')}
                >
                  Arrival photo
                </Button>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-micro font-semibold uppercase tracking-wider text-ink-faint mb-2">
              Handover record
            </h3>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-micro text-ink-faint">Nothing recorded yet.</p>
            ) : (
              <ol className="space-y-2.5">
                {history.map((entry) => (
                  <li key={entry.id} className="flex gap-2.5">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    <div className="min-w-0">
                      <p className="text-tiny text-ink">
                        <Badge tone="neutral">{WORKFLOW_LABEL[entry.toStatus]}</Badge>
                      </p>
                      {entry.note && (
                        <p className="text-micro text-ink-soft mt-0.5">{entry.note}</p>
                      )}
                      <p className="text-micro text-ink-faint mt-0.5">
                        {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({
  label,
  value,
  strong,
}) => (
  <>
    <dt className="text-micro text-ink-faint self-center">{label}</dt>
    <dd
      className={`text-tiny text-right ${strong ? 'font-semibold text-ink' : 'text-ink-soft'}`}
      data-numeric
    >
      {value}
    </dd>
  </>
);
