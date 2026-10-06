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
  EMPLOYEE_KIND_HINT,
  EMPLOYEE_KIND_LABEL,
  MANUAL_EMPLOYEE_KINDS,
  VIOLATION_LABEL,
  VIOLATION_TYPES,
  isCharge,
  type EmployeeBalance,
  type EmployeeLedgerEntry,
  type EmployeeLedgerKind,
  type ViolationType,
} from '../models/ledger';

/**
 * Today as the office counts days (Asia/Riyadh).
 *
 * The database refuses an entry dated in the future, and it measures that
 * in Riyadh — so a browser running a few hours ahead must not hand it
 * tomorrow's date as the default. `en-CA` formats as YYYY-MM-DD, which is
 * what a date input wants.
 */
const riyadhToday = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());

/**
 * What an employee owes the company (D84, D85).
 *
 * Most of it writes itself: when a driver brings back less than they
 * collected and the GM says the money stayed with them, the difference
 * lands here. The rest the GM adds — what the driver spent on the road, a
 * fine with the rule it was for, an advance before Eid, cash handed back,
 * or an amount taken out of a month's salary (D87, D88).
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
        description="What the drivers and warehouse keepers owe the company, and what has been settled. Only the GM and a superadmin can see or write this."
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
  const [kind, setKind] = useState<EmployeeLedgerKind>('expense');
  const [violation, setViolation] = useState<ViolationType | ''>('');
  const [occurredOn, setOccurredOn] = useState(riyadhToday);
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

  /**
   * Picking a violation fills the description with it, so a fine takes one
   * choice and an amount. It stays editable, and a description the GM has
   * written themselves is never overwritten.
   */
  const chooseViolation = (next: ViolationType | '') => {
    const previous = violation === '' ? null : VIOLATION_LABEL[violation];
    setViolation(next);
    if (next !== '' && (description.trim() === '' || description === previous)) {
      setDescription(VIOLATION_LABEL[next]);
    }
  };

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
        occurredOn,
        violationType: violation === '' ? undefined : violation,
      });
      setNotice(`${EMPLOYEE_KIND_LABEL[kind]} ${formatSar(Number(amount))} SAR recorded.`);
      setAdding(false);
      setAmount('');
      setDescription('');
      setRemarks('');
      setViolation('');
      setOccurredOn(riyadhToday());
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
      { header: 'Type', value: (e) => EMPLOYEE_KIND_LABEL[e.kind] },
      { header: 'Violation', value: (e) => (e.violationType ? VIOLATION_LABEL[e.violationType] : '') },
      { header: 'Description', value: (e) => e.description },
      { header: 'Amount (SAR)', value: (e) => e.signedAmount.toFixed(2) },
      { header: 'Remarks', value: (e) => e.remarks ?? '' },
      { header: 'Balance (SAR)', value: (e) => e.balance.toFixed(2) },
      { header: 'Entered by', value: (e) => e.createdByName ?? '' },
    ]);
    downloadCsv(`ledger-${employee.employeeName || employee.email}.csv`, csv);
  };

  const amountNumber = Number(amount);
  const canSave =
    amount.trim() !== '' &&
    Number.isFinite(amountNumber) &&
    amountNumber > 0 &&
    description.trim() !== '' &&
    occurredOn !== '' &&
    occurredOn <= riyadhToday() &&
    (kind !== 'fine' || violation !== '');

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
          description="An expense, a fine, an advance, cash handed back, or an amount taken out of a salary. A shortfall is not typed in here — it is recorded when the money is taken in."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <fieldset className="sm:col-span-2">
              <legend className="block text-micro font-medium text-ink-soft mb-1">
                What is it
                <span className="text-risk ml-0.5" aria-hidden="true">
                  *
                </span>
              </legend>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {MANUAL_EMPLOYEE_KINDS.map((k) => (
                  <label
                    key={k}
                    htmlFor={`entry-kind-${k}`}
                    className={`flex flex-col gap-1 p-2.5 rounded-control border cursor-pointer transition-colors ${
                      kind === k
                        ? 'border-accent bg-accent-soft'
                        : 'border-line bg-surface hover:border-line-strong'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        id={`entry-kind-${k}`}
                        name="entry-kind"
                        value={k}
                        checked={kind === k}
                        onChange={() => {
                          setKind(k);
                          if (k !== 'fine') setViolation('');
                        }}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                      <span
                        className={`text-tiny font-semibold ${kind === k ? 'text-accent-ink' : 'text-ink'}`}
                      >
                        {EMPLOYEE_KIND_LABEL[k]}
                      </span>
                    </span>
                    <span className="text-micro text-ink-faint leading-snug">
                      {EMPLOYEE_KIND_HINT[k]}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Field
              label="Date"
              htmlFor="entry-date"
              required
              hint="The day it happened, which need not be today."
              error={occurredOn > riyadhToday() ? 'That date is in the future.' : undefined}
            >
              <Input
                id="entry-date"
                type="date"
                max={riyadhToday()}
                value={occurredOn}
                invalid={occurredOn > riyadhToday()}
                onChange={(e) => setOccurredOn(e.target.value)}
              />
            </Field>
            <Field
              label={kind === 'fine' ? 'Fine amount (SAR)' : 'Amount (SAR)'}
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

            {kind === 'fine' && (
              <Field
                label="Violation type"
                htmlFor="entry-violation"
                required
                hint="Which rule was broken. This is a value, so fines can be counted by reason."
              >
                <Select
                  id="entry-violation"
                  value={violation}
                  onChange={(e) => chooseViolation(e.target.value as ViolationType | '')}
                >
                  <option value="">Choose one…</option>
                  {VIOLATION_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {VIOLATION_LABEL[v]}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field
              label={kind === 'fine' ? 'What happened' : 'Description'}
              htmlFor="entry-description"
              required
              className="sm:col-span-2"
              hint={
                kind === 'fine'
                  ? 'The line the employee will be shown — for example: red light on Madinah Road.'
                  : 'The line the employee will be shown — for example: lunch on the Makkah road.'
              }
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
                        {e.violationType ? ` · ${VIOLATION_LABEL[e.violationType]}` : ''}
                        {e.billNumber ? ` · ${e.billNumber}` : ''}
                        {e.createdByName ? ` · ${e.createdByName}` : ''}
                      </span>
                    </td>
                    {/* The sign comes from the database, which decides which way a kind moves the balance. */}
                    <td
                      className={`px-4 py-2 text-right font-semibold whitespace-nowrap ${
                        e.signedAmount > 0 ? 'text-risk' : 'text-ok'
                      }`}
                      data-numeric
                    >
                      {e.signedAmount > 0 ? '+' : '−'}
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
