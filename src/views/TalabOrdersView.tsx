import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, Truck } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, Input, Textarea } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import { ROLE_LABEL } from '../models/base';
import {
  TERMS_LABEL,
  WORKFLOW_LABEL,
  WORKFLOW_TONE,
  type TalabOrder,
} from '../models/deliveryNote';

/**
 * Customer orders — the loads that never reach the warehouse.
 *
 * The supplier prints the slip in our name, but the truck goes straight from
 * the plant to the customer's yard (D49). Such a slip is real paperwork with
 * a real supplier bill behind it, so it is filed and handed over like any
 * other; what it never becomes is stock.
 *
 * It ends here instead: the office marks it delivered once the customer has
 * the goods (D50). The client accepted that nobody of ours counts the load,
 * so the quantity below is the supplier's claim and nothing more — the
 * screen says so rather than showing a figure that looks verified.
 */
export const TalabOrdersView: React.FC = () => {
  const { can } = useAuth();
  const [orders, setOrders] = useState<TalabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Who may close one, exactly as `mark_talab_delivered` has it.
  const canClose = can('admin', 'manager', 'gm', 'ceo');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await deliveryNoteService.listTalabOrders({ search, openOnly }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the customer orders');
    } finally {
      setLoading(false);
    }
  }, [search, openOnly]);

  useEffect(() => {
    const t = setTimeout(() => void refresh(), 250);
    return () => clearTimeout(t);
  }, [refresh]);

  const markDelivered = async (order: TalabOrder) => {
    setBusy(true);
    setError(null);
    try {
      await deliveryNoteService.markDelivered(order.deliveryNoteId, note);
      setNotice(`${order.dnNumber} is marked delivered to ${order.customerName}.`);
      setClosing(null);
      setNote('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark it delivered');
    } finally {
      setBusy(false);
    }
  };

  const openSlip = async (path: string | null) => {
    if (!path) return;
    const url = await deliveryNoteService.getSignedUrl(path);
    if (url) window.open(url, '_blank', 'noopener');
  };

  const open = orders.filter((o) => !o.deliveredAt);

  return (
    <div id="talab-view" className="space-y-5">
      <PageHeader
        title="Customer orders"
        description="Loads bought in our name that go straight from the supplier to the customer. They never become stock and are never counted in."
        stats={[
          { label: 'shown', value: orders.length },
          { label: 'not yet delivered', value: open.length },
        ]}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={() => void refresh()}>
            Refresh
          </Button>
        }
      />

      {error && (
        <p className="px-3 py-2 rounded-control border border-risk text-micro text-risk bg-risk-soft">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="px-3 py-2 rounded-control border border-line text-micro text-ink-soft bg-raised">
          {notice}
        </p>
      )}

      <Panel
        flush
        title="Orders"
        actions={
          <>
            <Input
              inputSize="sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a slip or customer"
              className="w-52"
            />
            <label className="flex items-center gap-1.5 text-micro text-ink-soft cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
                className="w-3.5 h-3.5 cursor-pointer"
              />
              Not yet delivered
            </label>
          </>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-micro text-ink-faint">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading customer orders…
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No customer orders"
            description="When a slip is uploaded, tick “This load goes straight to a customer” and name them. Those orders appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-tiny">
              <thead className="bg-sunken text-micro text-ink-faint">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Slip</th>
                  <th className="text-left font-medium px-4 py-2">Customer</th>
                  <th className="text-left font-medium px-4 py-2">Goods</th>
                  <th className="text-right font-medium px-4 py-2">On the slip</th>
                  <th className="text-left font-medium px-4 py-2">Where it is</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <React.Fragment key={o.deliveryNoteId}>
                    <tr>
                      <td className="px-4 py-2.5 align-top">
                        <span className="font-semibold text-ink" data-numeric>
                          {o.dnNumber}
                        </span>
                        <span className="block text-micro text-ink-faint" data-numeric>
                          SO {o.soNumber}
                        </span>
                        {o.pdfStoragePath && (
                          <button
                            onClick={() => void openSlip(o.pdfStoragePath)}
                            className="mt-1 inline-flex items-center gap-1 text-micro text-accent hover:underline cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open the slip
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-2.5 align-top">
                        <span className="font-semibold text-ink">{o.customerName}</span>
                        {o.customerNameAr && (
                          <span className="block text-micro text-ink-faint" dir="rtl">
                            {o.customerNameAr}
                          </span>
                        )}
                        <Badge
                          tone={o.customerTerms === 'weekly' ? 'accent' : 'neutral'}
                          subtle
                          className="mt-1"
                        >
                          {TERMS_LABEL[o.customerTerms]}
                        </Badge>
                      </td>

                      <td className="px-4 py-2.5 align-top text-ink-soft">
                        {o.itemDescription || '—'}
                      </td>

                      <td className="px-4 py-2.5 align-top text-right">
                        <span className="font-semibold text-ink" data-numeric>
                          {o.pdfQty.toLocaleString()} {o.uom ?? ''}
                        </span>
                        <span className="block text-micro text-ink-faint">not counted by us</span>
                      </td>

                      <td className="px-4 py-2.5 align-top">
                        <Badge tone={WORKFLOW_TONE[o.workflowStatus]} subtle>
                          {WORKFLOW_LABEL[o.workflowStatus]}
                        </Badge>
                        {o.deliveredAt ? (
                          <span className="block text-micro text-ink-faint mt-1">
                            {new Date(o.deliveredAt).toLocaleDateString()}
                            {o.deliveredByName ? ` · ${o.deliveredByName}` : ''}
                          </span>
                        ) : o.holderName ? (
                          <span className="block text-micro text-ink-faint mt-1">
                            with {o.holderName}
                            {o.holderRole ? ` (${ROLE_LABEL[o.holderRole]})` : ''}
                          </span>
                        ) : null}
                      </td>

                      <td className="px-4 py-2.5 align-top text-right whitespace-nowrap">
                        {o.deliveredAt ? (
                          <span className="inline-flex items-center gap-1 text-micro text-ok font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Delivered
                          </span>
                        ) : o.workflowStatus === 'replaced' || o.workflowStatus === 'rejected' ? (
                          // Dead paperwork: the database refuses to close it,
                          // so the screen does not offer to.
                          <span className="text-micro text-ink-faint">
                            {o.workflowStatus === 'replaced' ? 'replaced' : 'rejected'}
                          </span>
                        ) : canClose ? (
                          <Button
                            size="sm"
                            variant={closing === o.deliveryNoteId ? 'ghost' : 'secondary'}
                            onClick={() => {
                              setClosing(closing === o.deliveryNoteId ? null : o.deliveryNoteId);
                              setNote('');
                            }}
                          >
                            {closing === o.deliveryNoteId ? 'Cancel' : 'Mark delivered'}
                          </Button>
                        ) : (
                          <span className="text-micro text-ink-faint">with the office</span>
                        )}
                      </td>
                    </tr>

                    {closing === o.deliveryNoteId && (
                      <tr>
                        <td colSpan={6} className="px-4 py-3 bg-sunken">
                          <div className="max-w-xl space-y-2">
                            <Field
                              label={`Mark ${o.dnNumber} delivered to ${o.customerName}`}
                              htmlFor="talab-note"
                              hint="Optional. Anything worth remembering about this delivery — it is kept in the slip's history."
                            >
                              <Textarea
                                id="talab-note"
                                rows={2}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="For example: unloaded at their Jeddah yard, received by Mr Ali"
                              />
                            </Field>
                            <Button
                              size="sm"
                              icon={CheckCircle2}
                              loading={busy}
                              onClick={() => void markDelivered(o)}
                            >
                              Confirm delivery
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};
