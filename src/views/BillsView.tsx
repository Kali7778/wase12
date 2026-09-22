import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Loader2, Plus, Printer, ReceiptText, RefreshCw, XCircle } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, Input, Textarea } from '../components/ui/Field';
import { BillDocument } from '../components/billing/BillDocument';
import { useAuth } from '../context/AuthContext';
import { billingService } from '../services/BillingService';
import { pricingService } from '../services/PricingService';
import { takeBillRequest } from '../state/billIntent';
import { formatSar } from '../models/pricing';
import {
  BILL_KIND_LABEL,
  BILL_STATE_LABEL,
  BILL_STATE_TONE,
  billState,
  type Bill,
  type BillWithLines,
} from '../models/billing';
import { NewBillView } from './NewBillView';

type Mode = { at: 'list' } | { at: 'new'; slipId: string | null } | { at: 'bill'; id: string };

/**
 * Bills: the list, one bill on its A4 sheet, and the till for a new one.
 *
 * Reading is open to the office; writing and cancelling to an admin, the
 * GM or a superadmin (D58) — the database has the same rule.
 */
export const BillsView: React.FC = () => {
  const [mode, setMode] = useState<Mode>(() => {
    const slipId = takeBillRequest();
    return slipId ? { at: 'new', slipId } : { at: 'list' };
  });

  if (mode.at === 'new') {
    return (
      <NewBillView
        slipId={mode.slipId}
        onSaved={(id) => setMode({ at: 'bill', id })}
        onBack={() => setMode({ at: 'list' })}
      />
    );
  }
  if (mode.at === 'bill') {
    return <BillScreen id={mode.id} onBack={() => setMode({ at: 'list' })} />;
  }
  return <BillList onOpen={(id) => setMode({ at: 'bill', id })} onNew={() => setMode({ at: 'new', slipId: null })} />;
};

// ---------------------------------------------------------------------------

const BillList: React.FC<{ onOpen: (id: string) => void; onNew: () => void }> = ({ onOpen, onNew }) => {
  const { can } = useAuth();
  const canWrite = can('admin', 'gm', 'ceo');
  const [bills, setBills] = useState<Bill[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setBills(await billingService.listBills({ search }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the bills');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => void refresh(), 250);
    return () => clearTimeout(t);
  }, [refresh]);

  const live = bills.filter((b) => !b.cancelledAt);
  const unpaid = live.filter((b) => !b.paidAt);

  return (
    <div id="bills-view" className="space-y-5">
      <PageHeader
        title="Bills"
        description="Every bill, newest first. A bill is never edited: a wrong one is cancelled with a reason and written again."
        stats={[
          { label: 'shown', value: bills.length },
          { label: 'unpaid', value: unpaid.length },
          { label: 'unpaid total (SAR)', value: formatSar(unpaid.reduce((s, b) => s + b.total, 0)) },
        ]}
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={() => void refresh()}>
              Refresh
            </Button>
            {canWrite && (
              <Button variant="primary" icon={Plus} onClick={onNew}>
                New bill
              </Button>
            )}
          </>
        }
      />

      {error && (
        <p className="px-3 py-2 rounded-control border border-risk text-micro text-risk bg-risk-soft">{error}</p>
      )}

      <Panel
        flush
        title="All bills"
        actions={
          <Input
            inputSize="sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Bill no., customer or slip"
            className="w-52"
          />
        }
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-micro text-ink-faint">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading bills…
          </div>
        ) : bills.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={search ? 'Nothing matches that' : 'No bills yet'}
            description={
              search
                ? 'Try a bill number, a customer name or a delivery note number.'
                : 'A bill is written from warehouse stock or for a customer order.'
            }
            action={
              canWrite && !search ? (
                <Button variant="primary" icon={Plus} onClick={onNew}>
                  New bill
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-tiny">
              <thead className="bg-sunken text-micro text-ink-faint">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Bill</th>
                  <th className="text-left font-medium px-4 py-2">Customer</th>
                  <th className="text-left font-medium px-4 py-2">Kind</th>
                  <th className="text-right font-medium px-4 py-2">Total (SAR)</th>
                  <th className="text-left font-medium px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {bills.map((b) => {
                  const state = billState(b);
                  return (
                    <tr
                      key={b.id}
                      onClick={() => onOpen(b.id)}
                      className={`cursor-pointer hover:bg-raised ${state === 'cancelled' ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpen(b.id);
                          }}
                          className="font-semibold text-accent hover:underline cursor-pointer"
                          data-numeric
                        >
                          {b.billNumber}
                        </button>
                        <span className="block text-micro text-ink-faint">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-ink">{b.customerName}</span>
                        {b.isWalkIn && <span className="block text-micro text-ink-faint">on the spot</span>}
                      </td>
                      <td className="px-4 py-2.5 text-ink-soft">
                        {BILL_KIND_LABEL[b.kind]}
                        {b.dnNumber && <span className="block text-micro text-ink-faint" data-numeric>{b.dnNumber}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-ink" data-numeric>
                        {formatSar(b.total)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={BILL_STATE_TONE[state]} subtle>
                          {BILL_STATE_LABEL[state]}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};

// ---------------------------------------------------------------------------

const BillScreen: React.FC<{ id: string; onBack: () => void }> = ({ id, onBack }) => {
  const { can } = useAuth();
  const canCancel = can('admin', 'gm', 'ceo');
  const [bill, setBill] = useState<BillWithLines | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await billingService.getBill(id);
      setBill(b);
      setLogoUrl(b?.company.logo_path ? await pricingService.logoUrl(b.company.logo_path) : null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the bill');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Paper gets the bill and nothing else: see `.print-bill` in index.css.
  const print = () => {
    const done = () => {
      document.body.classList.remove('print-bill');
      window.removeEventListener('afterprint', done);
    };
    document.body.classList.add('print-bill');
    window.addEventListener('afterprint', done);
    window.print();
  };

  const cancel = async () => {
    if (!bill) return;
    setBusy(true);
    setError(null);
    try {
      await billingService.cancelBill(bill.id, reason);
      setCancelling(false);
      setReason('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel the bill');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-micro text-ink-faint">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading the bill…
      </div>
    );
  }
  if (!bill) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="Bill not found"
        action={<Button variant="secondary" icon={ArrowLeft} onClick={onBack}>All bills</Button>}
      />
    );
  }

  const state = billState(bill);
  const revised = bill.lines.filter((l) => l.isRevised);

  return (
    <div id="bill-screen" className="space-y-5">
      <PageHeader
        title={bill.billNumber}
        description={`${BILL_KIND_LABEL[bill.kind]} · ${bill.customerName} · ${formatSar(bill.total)} SAR`}
        actions={
          <>
            <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
              All bills
            </Button>
            <Button variant="primary" icon={Printer} onClick={print}>
              Print or save as PDF
            </Button>
          </>
        }
      />

      {error && (
        <p role="alert" className="px-3 py-2 rounded-control border border-risk text-micro text-risk bg-risk-soft">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={BILL_STATE_TONE[state]}>{BILL_STATE_LABEL[state]}</Badge>
        {state === 'cancelled' && (
          <span className="text-micro text-ink-soft">
            by {bill.cancelledByName ?? 'unknown'} — {bill.cancelReason}
          </span>
        )}
        {canCancel && state !== 'cancelled' && !cancelling && (
          <Button variant="ghost" size="sm" icon={XCircle} onClick={() => setCancelling(true)}>
            Cancel this bill
          </Button>
        )}
      </div>

      {cancelling && (
        <Panel title={`Cancel ${bill.billNumber}`} description={bill.kind === 'stock' ? 'The goods on it go back into stock. The bill stays in the list, marked cancelled.' : 'The bill stays in the list, marked cancelled, and the customer order can be billed again.'}>
          <div className="max-w-xl space-y-3">
            <Field label="Why is it being cancelled?" htmlFor="cancel-reason" required>
              <Textarea id="cancel-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <Button variant="danger" loading={busy} disabled={!reason.trim()} onClick={() => void cancel()}>
                Cancel the bill
              </Button>
              <Button variant="ghost" onClick={() => setCancelling(false)}>
                Keep it
              </Button>
            </div>
          </div>
        </Panel>
      )}

      {revised.length > 0 && (
        <p className="text-micro text-ink-soft">
          Office only, not printed — revised prices:{' '}
          {revised
            .map((l) => `${l.description} ${formatSar(l.listPrice ?? 0)} → ${formatSar(l.unitPrice)}${l.reviseNote ? ` (${l.reviseNote})` : ''}`)
            .join('; ')}
        </p>
      )}

      <div className="overflow-x-auto pb-4">
        <BillDocument bill={bill} logoUrl={logoUrl} />
      </div>

      {createPortal(
        <div className="bill-print-root">
          <BillDocument bill={bill} logoUrl={logoUrl} />
        </div>,
        document.body,
      )}
    </div>
  );
};
