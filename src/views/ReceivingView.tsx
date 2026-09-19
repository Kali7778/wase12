import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  Clock,
  Hand,
  FileStack,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import { warehouseService } from '../services/MasterDataService';
import { useAuth } from '../context/AuthContext';
import type {
  DeliveryNoteLine,
  DeliveryNoteWithLines,
  DiscrepancyReason,
  Recipient,
} from '../models/deliveryNote';
import {
  DISCREPANCY_ACCOUNTABLE,
  DISCREPANCY_LABEL,
  OVERAGE_REASONS,
  SHORTAGE_REASONS,
  WORKFLOW_LABEL,
  WORKFLOW_TONE,
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
  const { profile } = useAuth();
  const [queue, setQueue] = useState<DeliveryNoteWithLines[]>([]);
  // Slips handed straight to this keeper. They cannot be counted yet: a
  // driver has to carry the goods first (D29), so the only move from here
  // is to hand the slip to one.
  const [mine, setMine] = useState<DeliveryNoteWithLines[]>([]);
  const [drivers, setDrivers] = useState<Recipient[]>([]);
  const [driverFor, setDriverFor] = useState<Record<string, string>>({});
  const [handingId, setHandingId] = useState<string | null>(null);
  const [upstream, setUpstream] = useState<DeliveryNoteWithLines[]>([]);
  const [recent, setRecent] = useState<DeliveryNoteWithLines[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, coming, done, houses, held] = await Promise.all([
        deliveryNoteService.listReceivingQueue(),
        deliveryNoteService.listNotYetDispatched(),
        deliveryNoteService.listReceived(),
        warehouseService.list(),
        profile ? deliveryNoteService.listHeldBy(profile.id) : Promise.resolve([]),
      ]);
      setQueue(pending);
      setMine(held);
      setUpstream(coming);
      setRecent(done);
      setWarehouses(houses.filter((w) => w.isActive));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the receiving queue');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    deliveryNoteService
      .listRecipients('driver')
      .then(setDrivers)
      .catch(() => setDrivers([]));
  }, []);

  /** Passes a slip in this keeper's hands to the driver who will fetch it. */
  const handToDriver = async (slip: DeliveryNoteWithLines) => {
    const driverId = driverFor[slip.id] || drivers[0]?.id;
    if (!driverId) return;
    setHandingId(slip.id);
    setError(null);
    try {
      await deliveryNoteService.handOver({ slipId: slip.id, toUserId: driverId });
      const driver = drivers.find((d) => d.id === driverId);
      setNotice(`DN ${slip.dnNumber} handed to ${driver?.fullName || 'the driver'}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not hand the slip over');
    } finally {
      setHandingId(null);
    }
  };

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

  /*
   * Uploaded, but nobody has handed it to a driver yet. These cannot be
   * counted — the database says so — and they are listed so that a note
   * waiting on the office looks like a note waiting on the office, instead
   * of looking like an upload that never happened.
   */
  const comingLines = useMemo(
    () =>
      upstream.flatMap((slip) =>
        slip.lines.filter((line) => line.receivedAt === null).map((line) => ({ slip, line })),
      ),
    [upstream],
  );

  /*
   * The driver arrives holding a paper slip, and the number printed on it is
   * the only thing the keeper has to go on. Scrolling a queue to find it works
   * while the queue is short and stops working on a busy morning.
   *
   * The search runs over both lists. Someone typing a number wants to know
   * where that note is, and "not here" is only a useful answer when the
   * screen can also say where it actually is.
   */
  const matches = useCallback(
    ({ slip, line }: { slip: DeliveryNoteWithLines; line: DeliveryNoteLine }, term: string) =>
      slip.dnNumber.toLowerCase().includes(term) ||
      slip.soNumber.toLowerCase().includes(term) ||
      line.itemNumber.toLowerCase().includes(term) ||
      line.itemDescription.toLowerCase().includes(term),
    [],
  );

  const term = query.trim().toLowerCase();

  const visibleLines = useMemo(
    () => (term ? openLines.filter((entry) => matches(entry, term)) : openLines),
    [openLines, matches, term],
  );

  const visibleComing = useMemo(
    () => (term ? comingLines.filter((entry) => matches(entry, term)) : comingLines),
    [comingLines, matches, term],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Receiving"
        description="Count what came off the truck and confirm it. Stock is created here and nowhere else."
        stats={[
          { label: 'awaiting count', value: openLines.length },
          ...(mine.length ? [{ label: 'in your hands', value: mine.length }] : []),
          { label: 'not with a driver yet', value: comingLines.length },
          ...(term ? [{ label: 'matching', value: visibleLines.length + visibleComing.length }] : []),
        ]}
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

      <div className="relative max-w-sm">
        <Search className="w-3.5 h-3.5 text-ink-faint absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          aria-label="Find a delivery note"
          placeholder="Delivery note number"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
          autoFocus
        />
      </div>

      {mine.length > 0 && (
        <Panel
          title="In your hands"
          description="Handed to you directly. Give the slip to the driver who will collect the goods — the count happens when they arrive."
          flush
        >
          <ul className="divide-line">
            {mine.map((slip) => (
              <li
                key={slip.id}
                className="px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <span className="w-9 h-9 rounded-control bg-sunken border border-line flex items-center justify-center shrink-0">
                  <Hand className="w-4 h-4 text-ink-faint" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-tiny font-semibold text-ink" data-numeric>
                    DN {slip.dnNumber}
                  </p>
                  <p className="text-micro text-ink-faint truncate">
                    {slip.lines[0]?.itemDescription ?? 'No item'}
                    {slip.lines[0] ? ` · ${slip.lines[0].pdfQty} ${slip.lines[0].uom}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    aria-label={`Driver for delivery note ${slip.dnNumber}`}
                    value={driverFor[slip.id] ?? drivers[0]?.id ?? ''}
                    onChange={(e) =>
                      setDriverFor((current) => ({ ...current, [slip.id]: e.target.value }))
                    }
                    className="h-8"
                  >
                    {drivers.length === 0 && <option value="">No active drivers</option>}
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName || d.email}
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    variant="primary"
                    className="whitespace-nowrap"
                    disabled={drivers.length === 0}
                    loading={handingId === slip.id}
                    onClick={() => handToDriver(slip)}
                  >
                    Hand over
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Awaiting count" flush>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          </div>
        ) : visibleLines.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title={openLines.length === 0 ? 'Nothing to receive' : 'No delivery note matches that'}
            description={
              openLines.length === 0
                ? comingLines.length > 0
                  ? 'Nothing is out for delivery right now. The notes below have been uploaded but are still waiting on the office.'
                  : 'Delivery notes appear here once the General Manager hands them to a driver.'
                : 'Check the number on the slip the driver handed over, or clear the search to see the whole queue.'
            }
          />
        ) : (
          <ul className="divide-line">
            {visibleLines.map(({ slip, line }) => (
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

      {visibleComing.length > 0 && (
        <Panel
          title="On the way"
          description="Uploaded, but not handed to a driver yet. These cannot be counted until they are."
          flush
        >
          <ul className="divide-line">
            {visibleComing.map(({ slip, line }) => (
              <li key={line.id} className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="w-9 h-9 rounded-control bg-sunken border border-line flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-ink-faint" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-tiny font-semibold text-ink" data-numeric>
                    DN {slip.dnNumber}
                  </p>
                  <p className="text-micro text-ink-faint truncate">{line.itemDescription}</p>
                </div>

                <div className="text-right shrink-0 sm:px-4">
                  <p className="text-micro text-ink-faint">Note</p>
                  <p className="text-tiny text-ink-soft" data-numeric>
                    {line.pdfQty} {line.uom}
                  </p>
                </div>

                <div className="shrink-0 sm:w-44 sm:text-right">
                  <Badge tone={WORKFLOW_TONE[slip.workflowStatus]}>
                    {WORKFLOW_LABEL[slip.workflowStatus]}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

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
