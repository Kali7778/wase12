import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, Loader2, PackageMinus, RefreshCw, Search, X } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { inventoryService } from '../services/InventoryService';
import { warehouseService } from '../services/MasterDataService';
import type { IssueReason, LotBalance } from '../models/inventory';
import { ISSUE_REASONS, ISSUE_REASON_LABEL, ISSUE_REFERENCE_HINT } from '../models/inventory';
import type { Warehouse } from '../models/masterData';

/**
 * Stock going out of the warehouse.
 *
 * The counterpart to Receiving: that screen is the only way stock is created,
 * this is the only way it leaves. Both work on a lot — a single delivery note
 * line — so every bag that goes out stays traceable to the note it came in on.
 */
export const StockOutView: React.FC = () => {
  const [lots, setLots] = useState<LotBalance[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [available, houses] = await Promise.all([
        inventoryService.listLotsWithStock(),
        warehouseService.list(),
      ]);
      setLots(available);
      setWarehouses(houses.filter((w) => w.isActive));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load available stock');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return lots;
    return lots.filter(
      (lot) =>
        lot.dnNumber.toLowerCase().includes(term) ||
        lot.soNumber.toLowerCase().includes(term) ||
        lot.itemNumber.toLowerCase().includes(term) ||
        lot.itemDescription.toLowerCase().includes(term),
    );
  }, [lots, query]);

  const totalAvailable = useMemo(
    () => lots.reduce((sum, lot) => sum + lot.balanceQty, 0),
    [lots],
  );

  const onIssued = async (message: string) => {
    setOpenId(null);
    setNotice(message);
    await refresh();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Out"
        description="Goods leaving the warehouse. Every issue is tied to the delivery note the stock arrived on."
        stats={[
          { label: 'lots with stock', value: lots.length },
          { label: 'units available', value: totalAvailable },
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
          aria-label="Search stock"
          placeholder="Search by DN, SO or item"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <Panel title="Available stock" flush>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={lots.length === 0 ? 'No stock available' : 'Nothing matches that search'}
            description={
              lots.length === 0
                ? 'Stock appears here once the warehouse confirms an arrival.'
                : 'Try a different delivery note, sales order or item.'
            }
          />
        ) : (
          <ul className="divide-line">
            {visible.map((lot) => (
              <li key={lot.lotId}>
                <LotRow
                  lot={lot}
                  expanded={openId === lot.lotId}
                  onToggle={() => setOpenId(openId === lot.lotId ? null : lot.lotId)}
                />
                {openId === lot.lotId && (
                  <IssueForm
                    lot={lot}
                    warehouses={warehouses}
                    onCancel={() => setOpenId(null)}
                    onDone={onIssued}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};

const LotRow: React.FC<{
  lot: LotBalance;
  expanded: boolean;
  onToggle: () => void;
}> = ({ lot, expanded, onToggle }) => (
  <div className="px-4 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center hover:bg-raised transition-colors">
    <span className="w-9 h-9 rounded-control bg-sunken border border-line flex items-center justify-center shrink-0">
      <Boxes className="w-4 h-4 text-ink-faint" />
    </span>

    <div className="min-w-0 flex-1">
      <p className="text-tiny font-semibold text-ink" data-numeric>
        DN {lot.dnNumber}
      </p>
      <p className="text-micro text-ink-faint mt-0.5 truncate">
        {lot.itemDescription}
        {lot.soNumber && ` · SO ${lot.soNumber}`}
      </p>
    </div>

    <div className="flex items-center gap-6 shrink-0 sm:px-4">
      <div className="text-right">
        <p className="text-micro text-ink-faint">Received</p>
        <p className="text-tiny text-ink-soft" data-numeric>
          {lot.inQty} {lot.uom}
        </p>
      </div>
      <div className="text-right">
        <p className="text-micro text-ink-faint">Issued</p>
        <p className="text-tiny text-ink-soft" data-numeric>
          {lot.outQty} {lot.uom}
        </p>
      </div>
      <div className="text-right w-28">
        <p className="text-micro text-ink-faint">Available</p>
        <p className="text-tiny font-semibold text-ink" data-numeric>
          {lot.balanceQty} {lot.uom}
        </p>
      </div>
    </div>

    <Button
      size="sm"
      variant={expanded ? 'ghost' : 'primary'}
      icon={PackageMinus}
      onClick={onToggle}
    >
      {expanded ? 'Cancel' : 'Issue stock'}
    </Button>
  </div>
);

const IssueForm: React.FC<{
  lot: LotBalance;
  warehouses: Warehouse[];
  onCancel: () => void;
  onDone: (message: string) => void | Promise<void>;
}> = ({ lot, warehouses, onCancel, onDone }) => {
  const [qty, setQty] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '');
  const [reason, setReason] = useState<IssueReason>('sale');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = qty.trim() === '' ? null : Number(qty);
  const valid =
    amount !== null && Number.isFinite(amount) && amount > 0 && amount <= lot.balanceQty;
  const tooMuch = amount !== null && Number.isFinite(amount) && amount > lot.balanceQty;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await inventoryService.issue({
        lotId: lot.lotId,
        warehouseId,
        qty: amount as number,
        reason,
        referenceNo: reference,
        notes,
      });
      await onDone(
        `${amount} ${lot.uom} issued from DN ${lot.dnNumber} — ${ISSUE_REASON_LABEL[reason].toLowerCase()}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not issue the stock');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 pb-4 -mt-1">
      <div className="p-4 rounded-panel bg-sunken border border-line space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Quantity to issue"
            htmlFor={`qty-${lot.lotId}`}
            required
            error={tooMuch ? `Only ${lot.balanceQty} ${lot.uom} available in this lot.` : undefined}
            hint={tooMuch ? undefined : `Up to ${lot.balanceQty} ${lot.uom}.`}
          >
            <Input
              id={`qty-${lot.lotId}`}
              type="number"
              min={0}
              max={lot.balanceQty}
              step="any"
              inputMode="decimal"
              autoFocus
              invalid={tooMuch}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
              data-numeric
            />
          </Field>

          <Field label="Reason" htmlFor={`reason-${lot.lotId}`} required>
            <Select
              id={`reason-${lot.lotId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value as IssueReason)}
            >
              {ISSUE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {ISSUE_REASON_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Warehouse" htmlFor={`wh-${lot.lotId}`} required>
            <Select
              id={`wh-${lot.lotId}`}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Reference"
            htmlFor={`ref-${lot.lotId}`}
            hint={ISSUE_REFERENCE_HINT[reason]}
          >
            <Input
              id={`ref-${lot.lotId}`}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional"
            />
          </Field>

          <Field label="Note" htmlFor={`note-${lot.lotId}`} hint="Optional detail.">
            <Textarea
              id={`note-${lot.lotId}`}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth recording"
            />
          </Field>
        </div>

        {error && <p className="text-micro text-risk">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="primary"
            size="sm"
            icon={PackageMinus}
            disabled={!valid || warehouseId === ''}
            loading={busy}
            onClick={submit}
          >
            Issue stock
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <span className="text-micro text-ink-faint ml-auto">
            Recorded against DN {lot.dnNumber}, so this stock stays traceable to its delivery note.
          </span>
        </div>
      </div>
    </div>
  );
};
