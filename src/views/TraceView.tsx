import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Printer, Route, Search } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Field';
import { traceService } from '../services/TraceService';
import { downloadCsv, toCsv } from '../utils/csv';
import { PURPOSE_LABEL } from '../models/deliveryNote';
import { stepTitle, type TracedLine, type TraceStep } from '../models/trace';

/**
 * Following a sales order through the yard (D79).
 *
 * The supplier's order number is the one thing that ties several slips
 * together — the same order often arrives on two trucks, and part of it
 * may go straight to a customer. Put that number in and the whole order
 * is here: what was claimed, what was counted in, what was short, where
 * every bag went afterwards, and what is still on the floor.
 */
export const TraceView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<TracedLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState('');
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (term: string) => {
    if (!term.trim()) {
      setLines([]);
      setSearched('');
      return;
    }
    setLoading(true);
    try {
      setLines(await traceService.trace(term));
      setSearched(term.trim());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not follow that number');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void run(search), 350);
    return () => clearTimeout(t);
  }, [search, run]);

  const totals = useMemo(() => {
    const claimed = lines.reduce((s, l) => s + l.pdfQty, 0);
    const arrived = lines.reduce((s, l) => s + (l.arrivedQty ?? 0), 0);
    const missing = lines.reduce((s, l) => s + (l.purpose === 'stock' ? l.missingQty : 0), 0);
    const out = lines.reduce((s, l) => s + l.outQty, 0);
    const left = lines.reduce((s, l) => s + l.balanceQty, 0);
    return { claimed, arrived, missing, out, left };
  }, [lines]);

  // One row per step, with its slip beside it, so the file reads like the screen.
  const exportCsv = () => {
    const rows: Array<{ line: TracedLine; step: TraceStep | null }> = lines.flatMap((l) =>
      (l.steps.length > 0 ? l.steps : [null]).map((s) => ({ line: l, step: s })),
    );
    const csv = toCsv(rows, [
      { header: 'SO No', value: (r) => r.line.soNumber },
      { header: 'DN No', value: (r) => r.line.dnNumber },
      { header: 'For', value: (r) => PURPOSE_LABEL[r.line.purpose] },
      { header: 'Item', value: (r) => r.line.itemDescription },
      { header: 'Unit', value: (r) => r.line.uom },
      { header: 'Claimed', value: (r) => r.line.pdfQty },
      { header: 'Arrived', value: (r) => r.line.arrivedQty ?? '' },
      { header: 'Missing', value: (r) => (r.line.purpose === 'stock' ? r.line.missingQty : '') },
      { header: 'Left', value: (r) => r.line.balanceQty },
      { header: 'Customer (order)', value: (r) => r.line.talabCustomerName ?? '' },
      { header: 'Date', value: (r) => (r.step ? new Date(r.step.occurredAt).toLocaleDateString() : '') },
      { header: 'What happened', value: (r) => (r.step ? stepTitle(r.step) : '') },
      { header: 'Qty', value: (r) => (r.step ? `${r.step.direction === 'OUT' ? '-' : '+'}${r.step.qty}` : '') },
      { header: 'Bill', value: (r) => r.step?.billNumber ?? '' },
      { header: 'Customer (sale)', value: (r) => r.step?.billCustomerName ?? '' },
      { header: 'Reference', value: (r) => r.step?.referenceNo ?? '' },
      { header: 'Note', value: (r) => r.step?.notes ?? '' },
      { header: 'By', value: (r) => r.step?.actorName ?? '' },
    ]);
    downloadCsv(`trace-${searched || 'search'}.csv`, csv);
  };

  return (
    <div id="trace-view" className="space-y-5">
      <PageHeader
        title="Track by SO"
        description="Put in a sales order number — or a delivery note number — to see every slip under it: what arrived, where it went, and what is left."
        stats={
          lines.length > 0
            ? [
                { label: 'slips', value: new Set(lines.map((l) => l.dnNumber)).size },
                { label: 'claimed', value: totals.claimed.toLocaleString() },
                { label: 'arrived', value: totals.arrived.toLocaleString() },
                { label: 'missing', value: totals.missing.toLocaleString() },
                { label: 'gone out', value: totals.out.toLocaleString() },
                { label: 'left', value: totals.left.toLocaleString() },
              ]
            : undefined
        }
        actions={
          lines.length > 0 ? (
            <>
              <Button variant="secondary" icon={Download} onClick={exportCsv}>
                Export
              </Button>
              <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
                Print
              </Button>
            </>
          ) : undefined
        }
      />

      {error && (
        <p role="alert" className="px-3 py-2 rounded-control border border-risk text-micro text-risk bg-risk-soft">
          {error}
        </p>
      )}

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-ink-faint absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          id="trace-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Sales order or delivery note number"
          className="pl-8"
          aria-label="Sales order or delivery note number"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-micro text-ink-faint">
          <Loader2 className="w-4 h-4 animate-spin" />
          Following {search}…
        </div>
      ) : searched === '' ? (
        <EmptyState
          icon={Route}
          title="Put in a number"
          description="A sales order often arrives on more than one slip, and part of it may go straight to a customer. All of it shows up here."
        />
      ) : lines.length === 0 ? (
        <EmptyState
          icon={Route}
          title={`Nothing under ${searched}`}
          description="Check the number, or try part of it — the search matches anywhere in a sales order or delivery note number."
        />
      ) : (
        <div className="space-y-4">
          {lines.map((line) => (
            <LineCard key={line.lineId} line={line} />
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const LineCard: React.FC<{ line: TracedLine }> = ({ line }) => {
  const talab = line.purpose === 'talab';

  return (
    <Panel
      title={`DN ${line.dnNumber}`}
      description={`SO ${line.soNumber} · ${line.itemDescription} · ${line.itemNumber}`}
      actions={
        <Badge tone={talab ? 'info' : 'neutral'} subtle>
          {PURPOSE_LABEL[line.purpose]}
        </Badge>
      }
    >
      <div className="space-y-3">
        <dl className="flex flex-wrap gap-x-6 gap-y-2">
          <Figure label="On the slip" value={line.pdfQty} unit={line.uom} />
          {talab ? (
            <Figure label="Counted in" value={null} hint="never — it went straight to the customer" />
          ) : (
            <>
              <Figure label="Counted in" value={line.arrivedQty} unit={line.uom} />
              <Figure label="Missing" value={line.missingQty} unit={line.uom} tone={line.missingQty > 0 ? 'risk' : 'default'} />
              <Figure label="Gone out" value={line.outQty} unit={line.uom} />
              <Figure label="Left" value={line.balanceQty} unit={line.uom} tone="ok" />
            </>
          )}
        </dl>

        {talab && (
          <p className="text-tiny text-ink-soft">
            Straight to <span className="font-semibold text-ink">{line.talabCustomerName ?? 'a customer'}</span>
            {line.talabBillNumber && (
              <>
                {' '}
                · billed on <span data-numeric>{line.talabBillNumber}</span>
                {line.talabBillCancelled && <span className="text-risk"> (cancelled)</span>}
              </>
            )}
          </p>
        )}

        {line.steps.length === 0 ? (
          <p className="text-micro text-ink-faint">
            {talab ? 'It never became stock, so there is nothing to follow here.' : 'Not counted in yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-tiny">
              <thead className="bg-sunken text-micro text-ink-faint">
                <tr>
                  <th className="text-left font-medium px-3 py-1.5">Date</th>
                  <th className="text-left font-medium px-3 py-1.5">What happened</th>
                  <th className="text-right font-medium px-3 py-1.5">Qty</th>
                  <th className="text-left font-medium px-3 py-1.5">Where it went</th>
                  <th className="text-left font-medium px-3 py-1.5">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {line.steps.map((s) => (
                  <StepRow key={s.movementId} step={s} uom={line.uom} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Panel>
  );
};

const StepRow: React.FC<{ step: TraceStep; uom: string }> = ({ step, uom }) => {
  // The note on a sale only repeats the bill number, which the line already
  // carries; the receipt's reference is the slip we are looking at.
  const note = step.notes && step.billNumber && step.notes.includes(step.billNumber) ? null : step.notes;
  const where = step.billCustomerName
    ? null
    : step.movementType === 'dn_receipt'
      ? step.warehouseName
      : (step.referenceNo ?? step.warehouseName);

  return (
  <tr className={step.billCancelled ? 'opacity-60' : ''}>
    <td className="px-3 py-1.5 text-ink-soft whitespace-nowrap">
      {new Date(step.occurredAt).toLocaleDateString()}
    </td>
    <td className="px-3 py-1.5">
      <span className="text-ink">{stepTitle(step)}</span>
      {step.billCancelled && <span className="text-micro text-risk"> · bill cancelled</span>}
      {note && <span className="block text-micro text-ink-faint">{note}</span>}
    </td>
    <td
      className={`px-3 py-1.5 text-right font-semibold whitespace-nowrap ${
        step.direction === 'OUT' ? 'text-risk' : 'text-ok'
      }`}
      data-numeric
    >
      {step.direction === 'OUT' ? '−' : '+'}
      {step.qty.toLocaleString()} {uom}
    </td>
    <td className="px-3 py-1.5 text-ink-soft">
      {step.billCustomerName ? (
        <>
          {step.billCustomerName}
          {step.billIsWalkIn && <span className="text-micro text-ink-faint"> · on the spot</span>}
        </>
      ) : (
        (where ?? '—')
      )}
    </td>
    <td className="px-3 py-1.5 text-ink-faint whitespace-nowrap">{step.actorName ?? '—'}</td>
  </tr>
  );
};

const Figure: React.FC<{
  label: string;
  value: number | null;
  unit?: string;
  hint?: string;
  tone?: 'default' | 'ok' | 'risk';
}> = ({ label, value, unit, hint, tone = 'default' }) => (
  <div>
    <dt className="text-micro text-ink-faint">{label}</dt>
    <dd
      className={`text-tiny font-semibold ${
        tone === 'ok' ? 'text-ok' : tone === 'risk' ? 'text-risk' : 'text-ink'
      }`}
      data-numeric
    >
      {value === null ? '—' : `${value.toLocaleString()}${unit ? ` ${unit}` : ''}`}
      {hint && <span className="block text-micro font-normal text-ink-faint">{hint}</span>}
    </dd>
  </div>
);
