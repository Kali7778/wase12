import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Field';
import { ProductPicker } from '../components/billing/ProductPicker';
import { BillCart } from '../components/billing/BillCart';
import { useBillDraft } from '../hooks/useBillDraft';
import { billingService } from '../services/BillingService';
import { customerService } from '../services/CustomerService';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import { TERMS_LABEL, type Customer, type TalabOrder } from '../models/deliveryNote';
import { BILL_KIND_LABEL, type BillKind, type SellableItem } from '../models/billing';

interface NewBillViewProps {
  /** Opens straight onto this customer order (from the Customer Orders screen). */
  slipId: string | null;
  onSaved: (billId: string) => void;
  onBack: () => void;
}

/**
 * The till: write a bill from warehouse stock, or for a customer order.
 *
 * The screen adds things up as they are typed; create_bill() decides
 * whether the bill may be written, and its message is shown if not.
 */
export const NewBillView: React.FC<NewBillViewProps> = ({ slipId, onSaved, onBack }) => {
  const draft = useBillDraft();
  const [items, setItems] = useState<SellableItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<TalabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sellable, people, talab, billed] = await Promise.all([
        billingService.listSellable(),
        customerService.listAll(false),
        deliveryNoteService.listTalabOrders({ limit: 500 }),
        billingService.listBills({ kind: 'talab', liveOnly: true, limit: 1000 }),
      ]);
      setItems(sellable);
      setCustomers(people);
      // Orders that can still be billed: not dead paperwork, not billed yet (D60, D66).
      const taken = new Set(billed.map((b) => b.deliveryNoteId));
      setOrders(
        talab.filter(
          (o) =>
            o.workflowStatus !== 'rejected' &&
            o.workflowStatus !== 'replaced' &&
            !taken.has(o.deliveryNoteId),
        ),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load what is needed for a bill');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byNumber = useMemo(() => new Map(items.map((i) => [i.itemNumber, i])), [items]);
  const order = orders.find((o) => o.deliveryNoteId === draft.deliveryNoteId) ?? null;
  const orderItem = order?.itemNumber ? byNumber.get(order.itemNumber) ?? null : null;

  // Choosing a customer order fills the bill with the slip's product (D69).
  const chooseOrder = useCallback(
    (id: string) => {
      draft.setDeliveryNoteId(id);
      const o = orders.find((x) => x.deliveryNoteId === id);
      const item = o?.itemNumber ? byNumber.get(o.itemNumber) : undefined;
      if (o && item && item.price !== null) {
        draft.setLines([
          {
            itemId: item.itemId,
            itemNumber: item.itemNumber,
            description: item.descriptionEn,
            uom: item.uom,
            listPrice: item.price,
            qty: o.pdfQty,
            maxQty: o.pdfQty,
            revisedPrice: null,
            reviseNote: '',
          },
        ]);
      } else {
        draft.setLines([]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, byNumber],
  );

  // Arriving from Customer Orders with a slip already chosen.
  useEffect(() => {
    if (!slipId || loading) return;
    if (draft.kind !== 'talab') draft.setKind('talab');
    if (orders.some((o) => o.deliveryNoteId === slipId)) chooseOrder(slipId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slipId, loading, orders]);

  const onBill = useMemo(
    () => Object.fromEntries(draft.lines.map((l) => [l.itemId, l.qty])),
    [draft.lines],
  );

  const addItem = (item: SellableItem) => {
    if (item.price === null) return;
    draft.addLine({
      itemId: item.itemId,
      itemNumber: item.itemNumber,
      description: item.descriptionEn,
      uom: item.uom,
      listPrice: item.price,
      qty: 1,
      maxQty: item.inStock,
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const id = await billingService.createBill({
        kind: draft.kind,
        lines: draft.lines,
        customerId: draft.kind === 'stock' && !draft.walkIn ? draft.customerId : undefined,
        walkInName: draft.kind === 'stock' && draft.walkIn ? draft.walkInName : undefined,
        walkInPhone: draft.kind === 'stock' && draft.walkIn ? draft.walkInPhone : undefined,
        deliveryNoteId: draft.kind === 'talab' ? draft.deliveryNoteId : undefined,
        transport: draft.transportAmount ?? undefined,
        labour: draft.labourAmount ?? undefined,
        note: draft.note,
      });
      onSaved(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not write the bill');
      // Stock may have moved under us; show the figures as they are now.
      void billingService.listSellable().then(setItems).catch(() => undefined);
    } finally {
      setSaving(false);
    }
  };

  const customer = customers.find((c) => c.id === draft.customerId);

  return (
    <div id="new-bill-view" className="space-y-5">
      <PageHeader
        title="New bill"
        description="Sell from warehouse stock, or bill a customer order. The bill number is given when it is saved."
        actions={
          <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
            All bills
          </Button>
        }
      />

      {error && (
        <p role="alert" className="px-3 py-2 rounded-control border border-risk text-micro text-risk bg-risk-soft">
          {error}
        </p>
      )}

      <div role="tablist" aria-label="Kind of bill" className="inline-flex rounded-control border border-line bg-surface p-0.5">
        {(['stock', 'talab'] as BillKind[]).map((k) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={draft.kind === k}
            onClick={() => draft.setKind(k)}
            className={`px-3 h-8 rounded-control text-tiny font-semibold cursor-pointer transition-colors ${
              draft.kind === k ? 'bg-accent text-white' : 'text-ink-soft hover:bg-raised'
            }`}
          >
            {BILL_KIND_LABEL[k]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-micro text-ink-faint">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading products and customers…
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_22rem] items-start">
          <div className="space-y-5 min-w-0">
            {draft.kind === 'stock' ? (
              <>
                <Panel title="Who is it for" description="Every bill carries a name.">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-tiny text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        id="walk-in"
                        checked={draft.walkIn}
                        onChange={(e) => {
                          draft.setWalkIn(e.target.checked);
                          draft.setCustomerId('');
                        }}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                      On the spot — cash customer not on the list
                    </label>

                    {draft.walkIn ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Name" htmlFor="walk-in-name" required>
                          <Input id="walk-in-name" value={draft.walkInName} onChange={(e) => draft.setWalkInName(e.target.value)} />
                        </Field>
                        <Field label="Phone (optional)" htmlFor="walk-in-phone">
                          <Input id="walk-in-phone" inputMode="tel" value={draft.walkInPhone} onChange={(e) => draft.setWalkInPhone(e.target.value)} />
                        </Field>
                      </div>
                    ) : (
                      <Field
                        label="Customer"
                        htmlFor="bill-customer"
                        required
                        hint={customer ? `${TERMS_LABEL[customer.terms]}${customer.terms === 'cash' ? ' — the bill is paid when saved.' : ' — the bill goes on their account.'}` : undefined}
                      >
                        <Select id="bill-customer" value={draft.customerId} onChange={(e) => draft.setCustomerId(e.target.value)}>
                          <option value="">Choose the customer</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {`${c.name} · ${TERMS_LABEL[c.terms]}`}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    )}
                  </div>
                </Panel>

                <Panel title="Products" description="Priced products with stock on hand. Oldest stock goes first.">
                  <ProductPicker items={items} onBill={onBill} onAdd={addItem} />
                </Panel>
              </>
            ) : (
              <Panel title="Customer order" description="A load that went straight from the supplier to the customer. It is billed to the customer on the slip.">
                {orders.length === 0 ? (
                  <p className="text-micro text-ink-faint">Every customer order already has a bill.</p>
                ) : (
                  <div className="space-y-3">
                    <Field label="Delivery note" htmlFor="bill-slip" required>
                      <Select id="bill-slip" value={draft.deliveryNoteId} onChange={(e) => chooseOrder(e.target.value)}>
                        <option value="">Choose the customer order</option>
                        {orders.map((o) => (
                          <option key={o.deliveryNoteId} value={o.deliveryNoteId}>
                            {`${o.dnNumber} · ${o.customerName} · ${o.pdfQty.toLocaleString()} ${o.uom ?? ''}`}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    {order && (
                      <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-tiny">
                        <dt className="text-ink-faint">Customer</dt>
                        <dd className="text-ink font-semibold">
                          {order.customerName}{' '}
                          <span className="font-normal text-ink-faint">· {TERMS_LABEL[order.customerTerms]}</span>
                        </dd>
                        <dt className="text-ink-faint">Goods</dt>
                        <dd className="text-ink">{order.itemDescription}</dd>
                        <dt className="text-ink-faint">On the slip</dt>
                        <dd className="text-ink" data-numeric>
                          {order.pdfQty.toLocaleString()} {order.uom} — the bill can be for less, not more
                        </dd>
                      </dl>
                    )}

                    {order && orderItem?.price === null && (
                      <p className="px-3 py-2 rounded-control border border-warn text-micro text-ink bg-warn-soft">
                        {order.itemDescription} has no price yet. Set it on the Prices screen first.
                      </p>
                    )}
                  </div>
                )}
              </Panel>
            )}
          </div>

          <BillCart draft={draft} saving={saving} onSave={() => void save()} fixedLines={draft.kind === 'talab'} />
        </div>
      )}
    </div>
  );
};
