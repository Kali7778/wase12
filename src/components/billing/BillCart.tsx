import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Field, Input } from '../ui/Field';
import { formatSar } from '../../models/pricing';
import { draftUnitPrice, lineAmount } from '../../models/billing';
import type { BillDraft, ServiceCharge } from '../../hooks/useBillDraft';

interface BillCartProps {
  draft: BillDraft;
  saving: boolean;
  onSave: () => void;
  /** A customer order bill carries exactly the slip's products. */
  fixedLines: boolean;
}

/**
 * The side bar at the till: what is on the bill, the running total, and the
 * two services (D55). Revising a price for this one sale is done on its line
 * (D53); the reason is optional (D72).
 */
export const BillCart: React.FC<BillCartProps> = ({ draft, saving, onSave, fixedLines }) => {
  const { lines, totals } = draft;

  return (
    <aside className="bg-surface border border-line rounded-panel flex flex-col lg:sticky lg:top-4" aria-label="The bill">
      <div className="px-4 py-3 border-b border-line flex items-baseline justify-between">
        <h2 className="text-tiny font-semibold text-ink">On the bill</h2>
        <span className="text-micro text-ink-faint" data-numeric>
          {lines.length} product{lines.length === 1 ? '' : 's'}
        </span>
      </div>

      {lines.length === 0 ? (
        <p className="px-4 py-8 text-micro text-ink-faint text-center">
          {fixedLines ? 'Choose the customer order to bill.' : 'Tap a product to add it.'}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {lines.map((l) => {
            const unit = draftUnitPrice(l);
            const revising = l.revisedPrice !== null;
            const over = l.qty > l.maxQty;
            return (
              <li key={l.itemId} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-tiny font-semibold text-ink">{l.description}</p>
                    <p className="text-micro text-ink-faint" data-numeric>
                      {l.itemNumber} · up to {l.maxQty.toLocaleString()} {l.uom}
                    </p>
                  </div>
                  {!fixedLines && (
                    <button
                      type="button"
                      onClick={() => draft.removeLine(l.itemId)}
                      aria-label={`Remove ${l.description}`}
                      className="p-1 rounded-control text-ink-faint hover:text-risk hover:bg-raised cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                  <Field label={`Quantity (${l.uom})`} htmlFor={`qty-${l.itemId}`} error={over ? `At most ${l.maxQty.toLocaleString()}` : undefined}>
                    <Input
                      id={`qty-${l.itemId}`}
                      inputSize="sm"
                      inputMode="decimal"
                      invalid={over}
                      value={Number.isFinite(l.qty) ? String(l.qty) : ''}
                      onChange={(e) => draft.updateLine(l.itemId, { qty: Number(e.target.value) })}
                    />
                  </Field>
                  <p className="text-tiny font-semibold text-ink text-right pb-1" data-numeric>
                    {formatSar(lineAmount(l.qty || 0, unit))}
                  </p>
                </div>

                <label className="flex items-center gap-2 text-micro text-ink-soft cursor-pointer">
                  <input
                    type="checkbox"
                    id={`revise-${l.itemId}`}
                    checked={revising}
                    onChange={(e) =>
                      draft.updateLine(l.itemId, {
                        revisedPrice: e.target.checked ? l.listPrice : null,
                        reviseNote: '',
                      })
                    }
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                  Revise price
                  <span className="ml-auto text-ink-faint" data-numeric>
                    list {formatSar(l.listPrice)}
                  </span>
                </label>

                {revising && (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Price for this sale" htmlFor={`rp-${l.itemId}`}>
                      <Input
                        id={`rp-${l.itemId}`}
                        inputSize="sm"
                        inputMode="decimal"
                        value={l.revisedPrice === null || Number.isNaN(l.revisedPrice) ? '' : String(l.revisedPrice)}
                        onChange={(e) => draft.updateLine(l.itemId, { revisedPrice: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Why (optional)" htmlFor={`rn-${l.itemId}`}>
                      <Input
                        id={`rn-${l.itemId}`}
                        inputSize="sm"
                        value={l.reviseNote}
                        onChange={(e) => draft.updateLine(l.itemId, { reviseNote: e.target.value })}
                      />
                    </Field>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-4 py-3 border-t border-line space-y-2">
        <Service
          id="svc-transport"
          label="Transport"
          value={draft.transport}
          onChange={draft.setTransport}
        />
        <Service id="svc-labour" label="Labour" value={draft.labour} onChange={draft.setLabour} />
      </div>

      <div className="px-4 py-3 border-t border-line">
        <Field label="Note on the bill (optional)" htmlFor="bill-note">
          <Input id="bill-note" inputSize="sm" value={draft.note} onChange={(e) => draft.setNote(e.target.value)} />
        </Field>
      </div>

      <dl className="px-4 py-3 border-t border-line grid grid-cols-[1fr_auto] gap-y-1 text-tiny">
        <dt className="text-ink-soft">Goods</dt>
        <dd className="text-right text-ink" data-numeric>{formatSar(totals.goods)}</dd>
        {totals.services > 0 && (
          <>
            <dt className="text-ink-soft">Services</dt>
            <dd className="text-right text-ink" data-numeric>{formatSar(totals.services)}</dd>
          </>
        )}
        <dt className="font-semibold text-ink pt-1 border-t border-line">Total (SAR)</dt>
        <dd className="text-right text-lead font-semibold text-ink pt-1 border-t border-line" data-numeric>
          {formatSar(totals.total)}
        </dd>
      </dl>

      <div className="px-4 pb-4 space-y-2">
        {draft.missing.length > 0 && (
          <ul className="text-micro text-ink-faint space-y-0.5">
            {draft.missing.map((m) => (
              <li key={m}>· {m}</li>
            ))}
          </ul>
        )}
        <Button
          variant="primary"
          className="w-full"
          loading={saving}
          disabled={draft.missing.length > 0}
          onClick={onSave}
        >
          Save bill
        </Button>
      </div>
    </aside>
  );
};

const Service: React.FC<{
  id: string;
  label: string;
  value: ServiceCharge;
  onChange: (v: ServiceCharge) => void;
}> = ({ id, label, value, onChange }) => (
  <div className="grid grid-cols-[auto_1fr] items-center gap-2">
    <label className="flex items-center gap-2 text-tiny text-ink cursor-pointer">
      <input
        type="checkbox"
        id={`${id}-on`}
        checked={value.on}
        onChange={(e) => onChange({ on: e.target.checked, amount: e.target.checked ? value.amount : '' })}
        className="w-3.5 h-3.5 cursor-pointer"
      />
      {label}
    </label>
    {value.on && (
      <Input
        id={`${id}-amount`}
        inputSize="sm"
        inputMode="decimal"
        aria-label={`${label} amount in SAR`}
        placeholder="Amount (SAR)"
        value={value.amount}
        onChange={(e) => onChange({ on: true, amount: e.target.value })}
      />
    )}
  </div>
);
