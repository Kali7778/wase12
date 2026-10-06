import React, { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, HandCoins, Truck, Undo2 } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { useAuth } from '../../context/AuthContext';
import { billingService } from '../../services/BillingService';
import { deliveryNoteService } from '../../services/DeliveryNoteService';
import { formatSar } from '../../models/pricing';
import type { Recipient } from '../../models/deliveryNote';
import type { ShortfallOwner } from '../../models/ledger';
import {
  COLLECTION_LABEL,
  COLLECTION_TONE,
  type BillWithLines,
  type PaymentCollection,
} from '../../models/billing';

interface CollectionPanelProps {
  bill: BillWithLines;
  onChanged: () => void;
}

/**
 * Getting the money in on an unpaid bill (D74–D77).
 *
 * Two ways: the customer pays at the office or by transfer and the GM
 * records it, or a driver is sent for it. While a driver is out, this
 * panel is where the bill stands — and only the GM may move it, exactly
 * as the database has it.
 */
export const CollectionPanel: React.FC<CollectionPanelProps> = ({ bill, onChanged }) => {
  const { can } = useAuth();
  const isGm = can('gm', 'ceo');

  const [history, setHistory] = useState<PaymentCollection[]>([]);
  const [drivers, setDrivers] = useState<Recipient[]>([]);
  const [open, setOpen] = useState<'send' | 'record' | 'takeBack' | 'receive' | null>(null);
  const [driverId, setDriverId] = useState('');
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [owner, setOwner] = useState<ShortfallOwner | null>(null);
  const [why, setWhy] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // What is still to be collected on this bill, and what the amount typed
  // in leaves behind.
  const outstanding = bill.outstanding;
  const typed = Number(amount);
  const amountError =
    amount.trim() === '' || !Number.isFinite(typed) || typed <= 0
      ? 'Enter the amount, for example 500.00.'
      : typed > outstanding
        ? `At most ${formatSar(outstanding)}`
        : null;
  const shortfall = amountError === null ? Math.round((outstanding - typed) * 100) / 100 : 0;

  const load = useCallback(async () => {
    try {
      const list = await billingService.listCollections({ limit: 50 });
      setHistory(list.filter((c) => c.billId === bill.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the collection history');
    }
  }, [bill.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isGm) return;
    deliveryNoteService
      .listRecipients('driver')
      .then((list) => {
        setDrivers(list);
        setDriverId((current) => current || list[0]?.id || '');
      })
      .catch(() => undefined);
  }, [isGm]);

  const live = history.find((c) => c.status === 'with_driver' || c.status === 'collected') ?? null;
  const closed = history.filter((c) => c !== live);

  const openPanel = (which: 'send' | 'record' | 'takeBack' | 'receive') => {
    const next = open === which ? null : which;
    setOpen(next);
    setText('');
    setWhy('');
    setOwner(null);
    // Pre-filled with what is owed: the usual case is the whole amount.
    setAmount(next === 'record' || next === 'receive' ? String(bill.outstanding) : '');
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setOpen(null);
      setText('');
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work');
    } finally {
      setBusy(false);
    }
  };

  const paid = bill.paidAt !== null;
  const cancelled = bill.cancelledAt !== null;

  return (
    <Panel
      title="Payment"
      description={
        paid
          ? `Paid on ${new Date(bill.paidAt as string).toLocaleDateString()}.`
          : cancelled
            ? 'The bill is cancelled, so there is nothing to collect.'
            : bill.paidAmount > 0
              ? `${formatSar(bill.paidAmount)} of ${formatSar(bill.total)} SAR received — ${formatSar(outstanding)} still to collect from ${bill.customerName}.`
              : `${formatSar(bill.total)} SAR to collect from ${bill.customerName}.`
      }
    >
      <div className="space-y-3">
        {error && (
          <p role="alert" className="px-3 py-2 rounded-control border border-risk text-micro text-risk bg-risk-soft">
            {error}
          </p>
        )}

        {live && (
          <div className="p-3 rounded-control border border-line bg-sunken space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={COLLECTION_TONE[live.status]} subtle>
                {COLLECTION_LABEL[live.status]}
              </Badge>
              <span className="text-tiny text-ink">
                {live.driverName}
                <span className="text-ink-faint">
                  {' '}
                  · sent {new Date(live.assignedAt).toLocaleDateString()} by {live.assignedByName}
                </span>
              </span>
            </div>
            {live.note && <p className="text-micro text-ink-soft">“{live.note}”</p>}
            {live.collectedNote && (
              <p className="text-micro text-ink-soft">Driver: “{live.collectedNote}”</p>
            )}
          </div>
        )}

        {isGm && !paid && !cancelled && (
          <div className="flex flex-wrap gap-2">
            {!live && (
              <>
                <Button variant="primary" icon={HandCoins} onClick={() => openPanel('record')}>
                  Record payment
                </Button>
                <Button variant="secondary" icon={Truck} onClick={() => openPanel('send')}>
                  Send with a driver
                </Button>
              </>
            )}
            {live?.status === 'with_driver' && (
              <Button variant="secondary" icon={Undo2} onClick={() => openPanel('takeBack')}>
                Take it back
              </Button>
            )}
            {live?.status === 'collected' && (
              <Button variant="primary" icon={BadgeCheck} onClick={() => openPanel('receive')}>
                Money received
              </Button>
            )}
          </div>
        )}

        {!isGm && !paid && !cancelled && (
          <p className="text-micro text-ink-faint">Only the GM can send this out or take the money in.</p>
        )}

        {open === 'record' && (
          <div className="max-w-xl grid gap-2 sm:grid-cols-2">
            <Field
              label="Amount received (SAR)"
              htmlFor="pay-amount"
              required
              hint={`${formatSar(outstanding)} outstanding. Less is allowed — the rest stays on the bill.`}
              error={amountError ?? undefined}
            >
              <Input
                id="pay-amount"
                inputMode="decimal"
                invalid={amountError !== null}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field
              label="How it was paid (optional)"
              htmlFor="pay-note"
              hint="For example: bank transfer, reference 99213."
            >
              <Input id="pay-note" value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Button
                variant="primary"
                loading={busy}
                disabled={amountError !== null}
                onClick={() => void run(() => billingService.recordPayment(bill.id, Number(amount), text))}
              >
                {Number(amount) >= outstanding ? 'Mark this bill paid' : `Take in ${formatSar(Number(amount) || 0)} SAR`}
              </Button>
            </div>
          </div>
        )}

        {open === 'send' && (
          <div className="max-w-xl grid gap-2 sm:grid-cols-2">
            <Field label="Driver" htmlFor="collect-driver" required>
              <Select id="collect-driver" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                {drivers.length === 0 && <option value="">No drivers</option>}
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Note for the driver (optional)" htmlFor="collect-note" hint="Who to ask for, when to go.">
              <Input id="collect-note" value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Button
                variant="primary"
                loading={busy}
                disabled={!driverId}
                onClick={() => void run(() => billingService.assignCollection(bill.id, driverId, text))}
              >
                Send it
              </Button>
            </div>
          </div>
        )}

        {open === 'takeBack' && live && (
          <div className="max-w-xl space-y-2">
            <Field label="Why is it being taken back?" htmlFor="takeback-reason" required>
              <Textarea id="takeback-reason" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
            <Button
              variant="danger"
              loading={busy}
              disabled={!text.trim()}
              onClick={() => void run(() => billingService.cancelCollection(live.id, text))}
            >
              Take it back
            </Button>
          </div>
        )}

        {open === 'receive' && live && (
          <div className="max-w-xl space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field
                label="Amount the driver handed in (SAR)"
                htmlFor="receive-amount"
                required
                hint={`${formatSar(outstanding)} was to be collected.`}
                error={amountError ?? undefined}
              >
                <Input
                  id="receive-amount"
                  inputMode="decimal"
                  invalid={amountError !== null}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
              <Field label="Note (optional)" htmlFor="receive-note" hint="For example: counted at the office.">
                <Input id="receive-note" value={text} onChange={(e) => setText(e.target.value)} />
              </Field>
            </div>

            {/* Short by something: somebody is holding it, and the GM is the
                one who knows who (D82). */}
            {shortfall > 0 && amountError === null && (
              <div className="p-3 rounded-control border border-warn bg-warn-soft space-y-2">
                <p className="text-tiny text-ink">
                  {formatSar(shortfall)} SAR short. Where is it?
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-start gap-2 text-tiny text-ink cursor-pointer">
                    <input
                      type="radio"
                      name="shortfall-owner"
                      id="owner-driver"
                      checked={owner === 'driver'}
                      onChange={() => setOwner('driver')}
                      className="mt-0.5 cursor-pointer"
                    />
                    <span>
                      Still with {live.driverName}
                      <span className="block text-micro text-ink-soft">
                        The customer paid in full, so the bill is settled and {formatSar(shortfall)} SAR goes
                        on {live.driverName}’s ledger.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-tiny text-ink cursor-pointer">
                    <input
                      type="radio"
                      name="shortfall-owner"
                      id="owner-customer"
                      checked={owner === 'customer'}
                      onChange={() => setOwner('customer')}
                      className="mt-0.5 cursor-pointer"
                    />
                    <span>
                      Still with {bill.customerName}
                      <span className="block text-micro text-ink-soft">
                        Only {formatSar(Number(amount) || 0)} SAR is credited; the bill stays open for{' '}
                        {formatSar(shortfall)} SAR and can be collected again.
                      </span>
                    </span>
                  </label>
                </div>
                <Field
                  label="What happened?"
                  htmlFor="shortfall-why"
                  required
                  hint="This is the line that will be shown when the money is asked for."
                >
                  <Textarea
                    id="shortfall-why"
                    rows={2}
                    value={why}
                    onChange={(e) => setWhy(e.target.value)}
                  />
                </Field>
              </div>
            )}

            <Button
              variant="primary"
              loading={busy}
              disabled={amountError !== null || (shortfall > 0 && (!owner || !why.trim()))}
              onClick={() =>
                void run(() =>
                  billingService.confirmCollection({
                    collectionId: live.id,
                    amount: Number(amount),
                    shortfallOwner: shortfall > 0 ? (owner ?? undefined) : undefined,
                    description: shortfall > 0 ? why : undefined,
                    note: text,
                  }),
                )
              }
            >
              Take in {formatSar(Number(amount) || 0)} SAR
              {shortfall <= 0 ? ' — this pays the bill' : ''}
            </Button>
          </div>
        )}

        {closed.length > 0 && (
          <ul className="space-y-1 pt-1">
            {closed.map((c) => (
              <li key={c.id} className="text-micro text-ink-faint">
                {new Date(c.assignedAt).toLocaleDateString()} · {c.driverName} ·{' '}
                {COLLECTION_LABEL[c.status]}
                {c.closedReason ? ` — ${c.closedReason}` : ''}
                {c.status === 'received' && c.receivedByName ? ` — taken in by ${c.receivedByName}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
};
