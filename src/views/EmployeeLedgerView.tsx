import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Loader2, Plus, Printer, RefreshCw, UserCog } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { ledgerService } from '../services/LedgerService';
import { downloadCsv, toCsv } from '../utils/csv';
import { formatSar } from '../models/pricing';
import {
  EMPLOYEE_KIND_LABEL,
  MANUAL_EMPLOYEE_KINDS,
  isCharge,
  type EmployeeBalance,
  type EmployeeLedgerEntry,
  type EmployeeLedgerKind,
} from '../models/ledger';

/**
 * What an employee owes the company (D84, D85).
 *
 * Most of it writes itself: when a driver brings back less than they
 * collected and the GM says the money stayed with them, the difference
 * lands here. The rest the GM adds — an advance before Eid, a fine, cash
 * handed back, or an amount taken out of a month's salary.
 *
 * Nothing is edited. A mistake is answered with an entry the other way,
 * so the history of what was asked for and what was settled stays whole.
 */
export const EmployeeLedgerView: React.FC = () => {
  const [open, setOpen] = useState<EmployeeBalance | null>(null);
  return open ? (
    <EmployeeAccount employee={open} onBack={() => setOpen(null)} />
  ) : (
    <EmployeeList onOpen={setOpen} />
  );
};

// ---------------------------------------------------------------------------

const EmployeeList: React.FC<{ onOpen: (e: EmployeeBalance) => void }> = ({ onOpen }) => {
  const [rows, setRows] = useState<EmployeeBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [owingOnly, setOwingOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await ledgerService.employeeBalances());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the ledgers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const shown = useMemo(
    () => rows.filter((r) => (owingOnly ? r.balance > 0 : r.isActive || r.balance !== 0)),
    [rows, owingOnly],
  );
  const owed = rows.reduce((s, r) => s + Math.max(r.balance, 0), 0);

  return (
    <div id="employee-ledger-view" className="space-y-5">
      <PageHeader
        title="Employee ledger"
        description="What each employee owes the company, and what has been settled. Only the GM and a superadmin can see or write this."
        stats={[
          { label: 'owing', value: rows.filter((r) => r.balance > 0).length },
          { label: 'owed in all (SAR)', value: formatSar(owed) },
        ]}
        actions={
          <>
            <label className="flex items-center gap-1.5 text-micro text-ink-soft cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                id="emp-owing-only"
                checked={owingOnly}
                onChange={(e) => setOwingOnly(e.target.checked)}
                className="w-3.5 h-3.5 cursor-pointer"
              />
              Only those who owe
            </label>
            <Button variant="secondary" icon={RefreshCw} onClick={() => void refresh()}>
              Refresh
            </Button>
          </>
        }
      />

      {error && (
        <p role="alert" className="px-3 py-2 rounded-control border border-risk text-micro text-risk bg-risk-soft">
          {error}
        </p>
      )}

      <Panel flush title="Employees">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-micro text-ink-faint">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title={owingOnly ? 'Nobody owes anything' : 'No employees'}
            description={owingOnly ? 'Switch off the filter to see everyone.' : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-tiny">
              <thead className="bg-sunken text-micro text-ink-faint">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Employee</th>
                  <th className="text-right font-medium px-4 py-2">Charged</th>
                  <th className="text-right font-medium px-4 py-2">Settled</th>
                  <th className="text-right font-medium px-4 py-2">Owes (SAR)</th>
                  <th className="text-left font-medium px-4 py-2">Last entry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((e) => (
                  <tr
                    key={e.employeeId}
                    onClick={() => onOpen(e)}
                    className={`cursor-pointer hover:bg-raised ${e.isActive ? '' : 'opacity-60'}`}
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-accent">{e.employeeName || e.email}</span>
                      {!e.isActive && (
                        <Badge tone="neutral" subtle className="ml-2">
                          Switched off
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-ink-soft" data-numeric>{formatSar(e.owed)}</td>
                    <td className="px-4 py-2.5 text-right text-ink-soft" data-numeric>{formatSar(e.settled)}</td>
                    <td
                      className={`px-4 py-2.5 text-right font-semibold ${e.balance > 0 ? 'text-warn' : 'text-ink'}`}
                      data-numeric
                    >
                      {formatSar(e.balance)}
                    </td>
                    <td className="px-4 py-2.5 text-ink-faint">
                      {e.lastEntryOn ? new Date(e.lastEntryOn).toLocaleDateString() : '—'}
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

const EmployeeAccount: React.FC<{ employee: EmployeeBalance; onBack: () => void }> = ({
  employee,
  onBack,
}) => {
  const [entries, setEntries] = useState<EmployeeLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<EmployeeLedgerKind>('charge');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await ledgerService.employeeLedger(employee.employeeId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the ledger');
    } finally {
      setLoading(false);
    }
  }, [employee.employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const balance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await ledgerService.addEmployeeEntry({
        employeeId: employee.employeeId,
        kind,
        amount: Number(amount),
        description,
        remarks,
      });
      setNotice(`${EMPLOYEE_KIND_LABEL[kind]} ${formatSar(Number(amount))} SAR recorded.`);
      setAdding(false);
      setAmount('');
      setDescription('');
      setRemarks('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not write the entry');
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const csv = toCsv<EmployeeLedgerEntry>(entries, [
      { header: 'Date', value: (e) => e.occurredOn },
      { header: 'Description', value: (e) => e.description },
      { header: 'Amount (SAR)', value: (e) => `${isCharge(e.kind) ? '' : '-'}${e.amount.toFixed(2)}` },
      { header: 'Remarks', value: (e) => e.remarks ?? '' },
      { header: 'Balance (SAR)', value: (e) => e.balance.toFixed(2) },
      { header: 'Entered by', value: (e) => e.createdByName ?? '' },
    ]);
    downloadCsv(`ledger-${employee.employeeName || employee.email}.csv`, csv);
  };

  const amountNumber = Number(amount);
  const canSave =
    amount.trim() !== '' && Number.isFinite(amountNumber) && amountNumber > 0 && description.trim() !== '';

  return (
    <div id="employee-account-view" className="space-y-5">
      <PageHeader
        title={employee.employeeName || employee.email}
        description="Every charge and every settlement, oldest first. Entries are never edited — a mistake is answered with an entry the other way."
        stats={[{ label: 'owes now (SAR)', value: formatSar(balance) }]}
        actions={
          <>
            <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
              All employees
            </Button>
            <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={entries.length === 0}>
              Export
            </Button>
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              Print
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => setAdding(!adding)}>
              Add entry
            </Button>
          </>
        }
      />

      {error && (
        <p role="alert" className="px-3 py-2 rounded-control border border-risk text-micro text-risk bg-risk-soft">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="px-3 py-2 rounded-control border border-line text-micro text-ink-soft bg-raised">
          {notice}
        </p>
      )}

      {adding && (
        <Panel
          title="New entry"
          description="A shortfall is not typed in here — it is recorded when the money is taken in."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="What is it" htmlFor="entry-kind" required>
              <Select id="entry-kind" value={kind} onChange={(e) => setKind(e.target.value as EmployeeLedgerKind)}>
                {MANUAL_EMPLOYEE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {EMPLOYEE_KIND_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Amount (SAR)"
              htmlFor="entry-amount"
              required
              hint={isCharge(kind) ? 'Adds to what they owe.' : 'Takes it off what they owe.'}
            >
              <Input
                id="entry-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field
              label="Description"
              htmlFor="entry-description"
              required
              className="sm:col-span-2"
              hint="The line the employee will be shown — for example: taken out of October salary."
            >
              <Input
                id="entry-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Field label="Remarks (optional)" htmlFor="entry-remarks" className="sm:col-span-2">
              <Textarea id="entry-remarks" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button variant="primary" loading={busy} disabled={!canSave} onClick={() => void save()}>
              Save entry
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </Panel>
      )}

      <Panel flush title="Ledger">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-micro text-ink-faint">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading the ledger…
          </div>
        ) : entries.length === 0 ? (
          <EmptyState icon={UserCog} title="Nothing on this ledger" description="Nothing is owed and nothing has been charged." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-tiny">
              <thead className="bg-sunken text-micro text-ink-faint">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Date</th>
                  <th className="text-left font-medium px-4 py-2">Description</th>
                  <th className="text-right font-medium px-4 py-2">Amount</th>
                  <th className="text-left font-medium px-4 py-2">Remarks</th>
                  <th className="text-right font-medium px-4 py-2">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2 text-ink-soft whitespace-nowrap">
                      {new Date(e.occurredOn).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-ink">
                      {e.description}
                      <span className="block text-micro text-ink-faint">
                        {EMPLOYEE_KIND_LABEL[e.kind]}
                        {e.billNumber ? ` · ${e.billNumber}` : ''}
                        {e.createdByName ? ` · ${e.createdByName}` : ''}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-semibold whitespace-nowrap ${
                        isCharge(e.kind) ? 'text-risk' : 'text-ok'
                      }`}
                      data-numeric
                    >
                      {isCharge(e.kind) ? '+' : '−'}
                      {formatSar(e.amount)}
                    </td>
                    <td className="px-4 py-2 text-ink-soft">{e.remarks ?? '—'}</td>
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
