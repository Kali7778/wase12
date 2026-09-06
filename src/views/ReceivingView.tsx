import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  FileStack,
  Loader2,
  PackageCheck,
  RefreshCw,
  X,
} from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import { warehouseService } from '../services/MasterDataService';
import type {
  DeliveryNoteLine,
  DeliveryNoteWithLines,
  DiscrepancyReason,
} from '../models/deliveryNote';
import {
  DISCREPANCY_ACCOUNTABLE,
  DISCREPANCY_LABEL,
  OVERAGE_REASONS,
  SHORTAGE_REASONS,
} from '../models/deliveryNote';
import type { Warehouse } from '../models/masterData';

/**
 * Warehouse receiving.
 *
 * The driver hands over the paper slip; the keeper counts what came off the
 * truck and records that number. The two are allowed to differ, and when they
 * do the difference is the point — so it is shown large, immediately, and the
 * reason cannot be skipped.
 *
 * This screen is the only way stock is ever created.
 */
export const ReceivingView: React.FC = () => {
  const [queue, setQueue] = useState<DeliveryNoteWithLines[]>([]);
  const [recent, setRecent] = useState<DeliveryNoteWithLines[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, done, houses] = await Promise.all([
        deliveryNoteService.listReceivingQueue(),
        deliveryNoteService.listReceived(),
        warehouseService.list(),
      ]);
      setQueue(pending);
      setRecent(done);
      setWarehouses(houses.filter((w) => w.isActive));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the receiving queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onReceived = async (message: string) => {
    setOpenId(null);
    setNotice(message);
    await refresh();
  };

  const openLines = useMemo(
    () =>
      queue.flatMap((slip) =>
        slip.lines.filter((line) => line.receivedAt === null).map((line) => ({ slip, line })),
      ),
    [queue],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Receiving"
        description="Count what came off the truck and confirm it. Stock is created here and nowhere else."
        stats={[{ label: 'awaiting count', value: openLines.length }]}
        actions={
          <Button icon={RefreshCw} size="sm" onClick={refresh} loading={loading}>
            Refresh
          </Button>
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

      <Panel title="Awaiting count" flush>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          </div>
        ) : openLines.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="Nothing to receive"
            description="Delivery notes appear here once the General Manager hands them to a driver."
          />
        ) : (
          <ul className="divide-line">
            {openLines.map(({ slip, line }) => (
              <li key={line.id}>
                <QueueRow
                  slip={slip}
                  line={line}
                  expanded={openId === line.id}
                  onToggle={() => setOpenId(openId === line.id ? null : line.id)}
                />
                {openId === line.id && (
                  <CountForm
                    slip={slip}
                    line={line}
                    warehouses={warehouses}
                    onCancel={() => setOpenId(null)}
                    onDone={onReceived}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {recent.length > 0 && (
        <Panel title="Recently received" flush>
          <ul className="divide-line">
            {recent.map((slip) =>
              slip.lines.map((line) => (
                <li key={line.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-tiny font-semibold text-ink" data-numeric>
                      DN {slip.dnNumber}
                    </p>
                    <p className="text-micro text-ink-faint truncate">{line.itemDescription}</p>
                  </div>
                  <QtySummary line={line} />
                  <span className="text-micro text-ink-faint shrink-0 w-32 text-right">
                    {line.receivedAt && new Date(line.receivedAt).toLocaleString()}
                  </span>
                </li>
              )),
            )}
          </ul>
        </Panel>
      )}
    </div>
  );
};

/** Delivery-note quantity against what was counted, with the gap called out. */
const QtySummary: React.FC<{ line: DeliveryNoteLine }> = ({ line }) => {
  const gap = line.missingQty ?? 0;
  return (
    <div className="flex items-center gap-5 shrink-0">
      <div className="text-right">
        <p className="text-micro text-ink-faint">Note</p>
        <p className="text-tiny text-ink-soft" data-numeric>
          {line.pdfQty} {line.uom}
        </p>
      </div>
      <div className="text-right">
        <p className="text-micro text-ink-faint">Counted</p>
        <p className="text-tiny font-semibold text-ink" data-numeric>
          {line.arrivedQty ?? '—'} {line.uom}
        </p>
      </div>
      <div className="w-28 text-right">
        {gap === 0 ? (
          <Badge tone="ok" icon={Check}>
            Matched
          </Badge>
        ) : (
          <Badge tone={gap > 0 ? 'risk' : 'warn'} icon={AlertTriangle}>
            {gap > 0 ? `${gap} short` : `${Math.abs(gap)} over`}
          </Badge>
        )}
      </div>
    </div>
  );
};

const QueueRow: React.FC<{
  slip: DeliveryNoteWithLines;
  line: DeliveryNoteLine;
  expanded: boolean;
  onToggle: () => void;
}> = ({ slip, line, expanded, onToggle }) => (
  <div className="px-4 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center hover:bg-raised transition-colors">
    <span className="w-9 h-9 rounded-control bg-sunken border border-line flex items-center justify-center shrink-0">
      <FileStack className="w-4 h-4 text-ink-faint" />
    </span>

    <div className="min-w-0 flex-1">
      <p className="text-tiny font-semibold text-ink" data-numeric>
        DN {slip.dnNumber}
      </p>
      <p className="text-micro text-ink-faint mt-0.5 truncate">
        {line.itemDescription}
        {slip.shipFrom && ` · from ${slip.shipFrom}`}
      </p>
    </div>

    <div className="shrink-0 sm:px-4 text-right">
      <p className="text-micro text-ink-faint">Delivery note says</p>
      <p className="text-tiny font-semibold text-ink" data-numeric>
        {line.pdfQty} {line.uom}
      </p>
    </div>

    <Button size="sm" variant={expanded ? 'ghost' : 'primary'} icon={PackageCheck} onClick={onToggle}>
      {expanded ? 'Cancel' : 'Count and confirm'}
    </Button>
  </div>
);

/**
 * The count itself.
 *
 * Every rule here also lives in the database. Re-stating them in the browser is
 * not a second line of defence — it is only there so the keeper is told what is
 * wrong before submitting, rather than after.
 */
const CountForm: React.FC<{
  slip: DeliveryNoteWithLines;
  line: DeliveryNoteLine;
  warehouses: Warehouse[];
  onCancel: () => void;
  onDone: (message: string) => void | Promise<void>;
}> = ({ slip, line, warehouses, onCancel, onDone }) => {
  const [qty, setQty] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>(warehouses[0]?.id ?? '');
  const [code, setCode] = useState<DiscrepancyReason | ''>('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counted = qty.trim() === '' ? null : Number(qty);
  const valid = counted !== null && Number.isFinite(counted) && counted >= 0;
  const gap = valid ? line.pdfQty - (counted as number) : 0;
  const matched = valid && gap === 0;

  // The reason list depends on which way the count went, so a reason picked
  // before the number changed direction has to be dropped. Keyed on the
  // direction rather than the list, which is a fresh array every render.
  const direction = gap > 0 ? 'short' : gap < 0 ? 'over' : 'match';
  const reasons = useMemo(
    () => (direction === 'short' ? SHORTAGE_REASONS : direction === 'over' ? OVERAGE_REASONS : []),
    [direction],
  );
  useEffect(() => {
    setCode((current) => (current && !reasons.includes(current) ? '' : current));
  }, [reasons]);

  const needsNote = code === 'other';
  const canSubmit =
    valid &&
    warehouseId !== '' &&
    (matched || (code !== '' && (!needsNote || note.trim() !== '')));

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      let photoPath: string | null = null;
      if (photo) {
        photoPath = await deliveryNoteService.uploadArrivalPhoto(photo, slip.dnNumber);
      }

      await deliveryNoteService.receiveLine({
        lineId: line.id,
        arrivedQty: counted as number,
        warehouseId,
        discrepancyCode: matched ? null : (code as DiscrepancyReason),
        discrepancyNote: note.trim() || null,
        arrivalPhotoPath: photoPath,
      });

      await onDone(
        matched
          ? `DN ${slip.dnNumber} received in full — ${counted} ${line.uom} added to stock.`
          : `DN ${slip.dnNumber} received — ${counted} ${line.uom} added to stock, ` +
              `${Math.abs(gap)} ${line.uom} ${gap > 0 ? 'short' : 'over'}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm the arrival');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 pb-4 -mt-1">
      <div className="p-4 rounded-panel bg-sunken border border-line space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Delivery note quantity" htmlFor={`pdf-${line.id}`}>
            <Input
              id={`pdf-${line.id}`}
              value={`${line.pdfQty} ${line.uom}`}
              readOnly
              disabled
              data-numeric
            />
          </Field>

          <Field
            label="Actually received"
            htmlFor={`qty-${line.id}`}
            required
            hint={`Count the ${line.uom.toLowerCase()}s that came off the truck.`}
          >
            <Input
              id={`qty-${line.id}`}
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              autoFocus
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
              data-numeric
            />
          </Field>

          <Field label="Warehouse" htmlFor={`wh-${line.id}`} required>
            <Select
              id={`wh-${line.id}`}
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              {warehouses.length === 0 && <option value="">No active warehouse</option>}
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {valid && (
          <div
            className={`px-3 py-2.5 rounded-control border text-tiny flex items-center gap-2 ${
              matched ? 'bg-ok-soft border-ok/30 text-ok' : 'bg-warn-soft border-warn/30 text-warn'
            }`}
          >
            {matched ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>
              {matched ? (
                <>Quantity matches the delivery note.</>
              ) : gap > 0 ? (
                <>
                  <strong data-numeric>
                    {gap} {line.uom}
                  </strong>{' '}
                  short of what the supplier&rsquo;s note claims.
                </>
              ) : (
                <>
                  <strong data-numeric>
                    {Math.abs(gap)} {line.uom}
                  </strong>{' '}
                  more than the supplier&rsquo;s note claims.
                </>
              )}
            </span>
          </div>
        )}

        {valid && !matched && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Reason"
              htmlFor={`code-${line.id}`}
              required
              hint="This decides who answers for the difference, so it is recorded permanently."
            >
              <Select
                id={`code-${line.id}`}
                value={code}
                onChange={(e) => setCode(e.target.value as DiscrepancyReason | '')}
              >
                <option value="">Select a reason…</option>
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {DISCREPANCY_LABEL[r]}
                    {DISCREPANCY_ACCOUNTABLE[r] !== '—' && ` — ${DISCREPANCY_ACCOUNTABLE[r]}`}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Note"
              htmlFor={`note-${line.id}`}
              required={needsNote}
              hint={needsNote ? 'Required when the reason is "Other".' : 'Optional detail.'}
            >
              <Textarea
                id={`note-${line.id}`}
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What happened?"
              />
            </Field>
          </div>
        )}

        {valid && !matched && (
          <div>
            <label className="block text-micro font-medium text-ink-soft mb-1">
              Photo (optional)
            </label>
            <label className="inline-flex items-center gap-2 px-2.5 h-7 rounded-control border border-line bg-surface text-micro text-ink-soft hover:bg-raised cursor-pointer transition-colors">
              <Camera className="w-3.5 h-3.5" />
              {photo ? photo.name : 'Add a photo of the shortage'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
            {photo && (
              <button
                onClick={() => setPhoto(null)}
                className="ml-2 text-micro text-ink-faint hover:text-risk cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>
        )}

        {error && <p className="text-micro text-risk">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="primary"
            size="sm"
            icon={PackageCheck}
            disabled={!canSubmit}
            loading={busy}
            onClick={submit}
          >
            Confirm arrival
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <span className="text-micro text-ink-faint ml-auto">
            Stock increases by what you counted, never by the delivery note quantity.
          </span>
        </div>
      </div>
    </div>
  );
};
