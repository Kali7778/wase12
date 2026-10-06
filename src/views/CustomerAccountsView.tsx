import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Loader2, Printer, RefreshCw, Wallet } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Field';
import { ledgerService } from '../services/LedgerService';
import { downloadCsv, toCsv } from '../utils/csv';
import { formatSar } from '../models/pricing';
import { TERMS_LABEL } from '../models/deliveryNote';
import type { CustomerBalance, CustomerLedgerEntry } from '../models/ledger';

/**
 * What each customer owes (D51, D57, D86).
 *
 * A weekly customer's bills sit on their account until the money comes
 * in, and the money rarely arrives in one piece: a driver may bring part
 * of it, the rest a week later. So this is a ledger, not a flag — every
 * bill on one side, every payment on the other, and the balance after
 * each line.
 */
export const CustomerAccountsView: React.FC = () => {
  const [open, setOpen] = useState<CustomerBalance | null>(null);
  return open ? (
    <CustomerAccount customer={open} onBack={() => setOpen(null)} />
  ) : (
    <AccountList onOpen={setOpen} />
  );
};

// ---------------------------------------------------------------------------

const AccountList: React.FC<{ onOpen: (c: CustomerBalance) => void }> = ({ onOpen }) => {
  const [rows, setRows] = useState<CustomerBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [owingOnly, setOwingOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await ledgerService.customerBalances());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((r) => !owingOnly || r.balance > 0)
      .filter((r) => term === '' || r.customerName.toLowerCase().includes(term));
  }, [rows, search, owingOnly]);

  const owed = rows.reduce((s, r) => s + Math.max(r.balance, 0), 0);

  return (
    <div id="customer-accounts-view" className="space-y-5">
      <PageHeader
        title="Customer accounts"
        description="What every customer has been billed, what has been received, and what is still owed."
        stats={[
          { label: 'owing', value: rows.filter((r) => r.balance > 0).length },
          { label: 'owed in all (SAR)', value: formatSar(owed) },
        ]}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={() => void refresh()}>
            Refresh
          </Button>
        }
      />

      {error && (
        <p role="alert" className="px-3 py-2 rounded-control border border-risk text-micro text-risk bg-risk-soft">
          {error}
        </p>
      )}

      <Panel
        flush
        title="Accounts"
        actions={
          <>
            <Input
              inputSize="sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a customer"
              className="w-48"
            />
            <label className="flex items-center gap-1.5 text-micro text-ink-soft cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                id="owing-only"
                checked={owingOnly}
                onChange={(e) => setOwingOnly(e.target.checked)}
                className="w-3.5 h-3.5 cursor-pointer"
              />
              Only those who owe
            </label>
          </>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-micro text-ink-faint">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading accounts…
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={owingOnly ? 'Nobody owes anything' : 'No customers'}
            description={
              owingOnly
                ? 'Every bill written so far has been paid. Switch off the filter to see them all.'
                : 'Customers appear here once they have been billed.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-tiny">
              <thead className="bg-sunken text-micro text-ink-faint">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Customer</th>
                  <th className="text-right font-medium px-4 py-2">Billed</th>
                  <th className="text-right font-medium px-4 py-2">Received</th>
                  <th className="text-right font-medium px-4 py-2">Owed (SAR)</th>
                  <th className="text-left font-medium px-4 py-2">Open bills</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((c) => (
                  <tr
                    key={c.customerId}
                    onClick={() => onOpen(c)}
                    className="cursor-pointer hover:bg-raised"
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-accent">{c.customerName}</span>
                      <Badge tone={c.customerTerms === 'weekly' ? 'accent' : 'neutral'} subtle className="ml-2">
                        {TERMS_LABEL[c.customerTerms]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right text-ink-soft" data-numeric>{formatSar(c.billed)}</td>
                    <td className="px-4 py-2.5 text-right text-ink-soft" data-numeric>{formatSar(c.paid)}</td>
                    <td
                      className={`px-4 py-2.5 text-right font-semibold ${c.balance > 0 ? 'text-warn' : 'text-ink'}`}
                      data-numeric
                    >
                      {formatSar(c.balance)}
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft" data-numeric>
                      {c.openBills > 0 ? c.openBills : '—'}
                      {c.oldestOpen && (
                        <span className="block text-micro text-ink-faint">
                          oldest {new Date(c.oldestOpen).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};

// ---------------------------------------------------------------------------

const CustomerAccount: React.FC<{ customer: CustomerBalance; onBack: () => void }> = ({
  customer,
  onBack,
}) => {
  const [entries, setEntries] = useState<CustomerLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    ledgerService
      .customerLedger(customer.customerId)
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the account'))
      .finally(() => setLoading(false));
  }, [customer.customerId]);

  const exportCsv = () => {
    const csv = toCsv<CustomerLedgerEntry>(entries, [
      { header: 'Date', value: (e) => e.entryDate },
      { header: 'Description', value: (e) => describe(e) },
      { header: 'Debit (SAR)', value: (e) => (e.debit ? e.debit.toFixed(2) : '') },
      { header: 'Credit (SAR)', value: (e) => (e.credit ? e.credit.toFixed(2) : '') },
      { header: 'Balance (SAR)', value: (e) => e.balance.toFixed(2) },
    ]);
    downloadCsv(`account-${customer.customerName}.csv`, csv);
  };

  return (
    <div id="customer-account-view" className="space-y-5">
      <PageHeader
        title={customer.customerName}
        description={`${TERMS_LABEL[customer.customerTerms]} · billed ${formatSar(customer.billed)} · received ${formatSar(customer.paid)}`}
        stats={[{ label: 'owed now (SAR)', value: formatSar(customer.balance) }]}
        actions={
          <>
            <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
              All accounts
            </Button>
            <Button variant="secondary" icon={Download} onClick={exportCsv}>
              Export
            </Button>
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              Print
            </Button>
          </>
        }
      />

      {error && (
        <p role="alert" className="px-3 py-2 rounded-control border border-risk text-micro text-risk bg-risk-soft">
          {error}
        </p>
      )}

      <Panel flush title="Statement">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-micro text-ink-faint">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading the statement…
          </div>
        ) : entries.length === 0 ? (
          <EmptyState icon={Wallet} title="Nothing on this account yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-tiny">
              <thead className="bg-sunken text-micro text-ink-faint">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Date</th>
                  <th className="text-left font-medium px-4 py-2">Description</th>
                  <th className="text-right font-medium px-4 py-2">Debit</th>
                  <th className="text-right font-medium px-4 py-2">Credit</th>
                  <th className="text-right font-medium px-4 py-2">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {entries.map((e) => (
                  <tr key={`${e.entryKind}-${e.entryId}`}>
                    <td className="px-4 py-2 text-ink-soft whitespace-nowrap">
                      {new Date(e.entryDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-ink">{describe(e)}</td>
                    <td className="px-4 py-2 text-right text-ink" data-numeric>
                      {e.debit ? formatSar(e.debit) : ''}
                    </td>
                    <td className="px-4 py-2 text-right text-ok" data-numeric>
                      {e.credit ? formatSar(e.credit) : ''}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-ink" data-numeric>
                      {formatSar(e.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};

const describe = (e: CustomerLedgerEntry): string =>
  e.entryKind === 'bill'
    ? `Bill ${e.reference}${e.dnNumber ? ` · DN ${e.dnNumber}` : ''}${e.note ? ` · ${e.note}` : ''}`
    : `Payment against ${e.reference}${e.note ? ` · ${e.note}` : ''}`;
