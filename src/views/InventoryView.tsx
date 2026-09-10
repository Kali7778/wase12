import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  PackageSearch,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Select } from '../components/ui/Field';
import { inventoryService } from '../services/InventoryService';
import type { InventoryFilter, InventoryRow } from '../models/inventory';
import type { DnStatus } from '../models/base';
import { DISCREPANCY_LABEL, DN_STATUS_LABEL } from '../models/deliveryNote';
import { downloadCsv, toCsv, type CsvColumn } from '../utils/csv';
import { InventoryDetailPanel } from '../components/inventory/InventoryDetailPanel';

const PAGE_SIZE = 50;

const STATUS_TONE: Record<DnStatus, 'neutral' | 'ok' | 'warn' | 'risk'> = {
  not_arrived: 'neutral',
  partial: 'warn',
  arrived: 'ok',
  cancelled: 'risk',
};

const EXPORT_COLUMNS: readonly CsvColumn<InventoryRow>[] = [
  { header: 'DN No', value: (r) => r.dnNumber },
  { header: 'SO No', value: (r) => r.soNumber },
  { header: 'Print Date', value: (r) => r.printDate ?? '' },
  { header: 'Supplier', value: (r) => r.supplier },
  { header: 'Item Number', value: (r) => r.itemNumber },
  { header: 'Item', value: (r) => r.itemDescription },
  { header: 'UOM', value: (r) => r.uom },
  { header: 'PDF Qty', value: (r) => r.pdfQty },
  { header: 'Arrived Qty', value: (r) => r.arrivedQty },
  { header: 'Missing Qty', value: (r) => r.missingQty },
  { header: 'In Qty', value: (r) => r.inQty },
  { header: 'Out Qty', value: (r) => r.outQty },
  { header: 'Balance', value: (r) => r.balanceQty },
  { header: 'Status', value: (r) => DN_STATUS_LABEL[r.status] },
  {
    header: 'Discrepancy Reason',
    value: (r) => (r.discrepancyCode ? DISCREPANCY_LABEL[r.discrepancyCode] : ''),
  },
  { header: 'Received At', value: (r) => r.receivedAt ?? '' },
];

/**
 * The inventory register.
 *
 * This is the table the client described in their own requirement, column for
 * column. The one it exists for is `Missing Qty`: in the paper system a
 * shortage is written on a slip and then lost, and their whole reason for
 * wanting software was to stop that happening.
 *
 * Every figure is derived from the append-only ledger when the page loads.
 * Nothing here is stored, and `PDF Qty` never contributes to `Balance` — the
 * supplier's claim is not stock.
 */
export const InventoryView: React.FC = () => {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({
    notes: 0,
    pdfQty: 0,
    missingQty: 0,
    balanceQty: 0,
    discrepancies: 0,
  });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openRow, setOpenRow] = useState<InventoryRow | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DnStatus | 'all'>('all');
  const [discrepanciesOnly, setDiscrepanciesOnly] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Typing should not fire a query per keystroke.
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const filter: InventoryFilter = useMemo(
    () => ({
      search: debounced,
      status,
      discrepanciesOnly,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    }),
    [debounced, status, discrepanciesOnly, fromDate, toDate],
  );

  // A narrower filter can leave the current page past the end of the results.
  useEffect(() => setPage(0), [filter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [result, totals] = await Promise.all([
        inventoryService.listPage(filter, page, PAGE_SIZE),
        inventoryService.summarise(filter),
      ]);
      setRows(result.rows);
      setTotal(result.total);
      setSummary(totals);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the inventory register');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await inventoryService.listAllForExport(filter);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`inventory-${stamp}.csv`, toCsv(all, EXPORT_COLUMNS));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export the register');
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setDiscrepanciesOnly(false);
    setFromDate('');
    setToDate('');
  };

  const filtered =
    debounced !== '' || status !== 'all' || discrepanciesOnly || fromDate !== '' || toDate !== '';
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        description="Every delivery note: what the supplier claimed, what actually arrived, and what is left."
        stats={[
          { label: 'lines', value: summary.notes },
          { label: 'PDF qty', value: summary.pdfQty },
          { label: 'missing', value: summary.missingQty },
          { label: 'balance', value: summary.balanceQty },
          { label: 'discrepancies', value: summary.discrepancies },
        ]}
        actions={
          <>
            <Button
              icon={Download}
              size="sm"
              onClick={exportCsv}
              loading={exporting}
              disabled={total === 0}
            >
              Export
            </Button>
            <Button icon={RefreshCw} size="sm" onClick={load} loading={loading}>
              Refresh
            </Button>
          </>
        }
      />

      {error && <div className="px-3 py-2 rounded-panel bg-risk-soft text-risk text-tiny">{error}</div>}

      <div className="flex flex-wrap items-end gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-ink-faint absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            aria-label="Search the register"
            placeholder="Delivery note, SO or item"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value as DnStatus | 'all')}
          className="w-full sm:w-44"
        >
          <option value="all">All statuses</option>
          {(Object.keys(DN_STATUS_LABEL) as DnStatus[]).map((s) => (
            <option key={s} value={s}>
              {DN_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>

        <Input
          aria-label="From date"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="w-full sm:w-40"
        />
        <Input
          aria-label="To date"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="w-full sm:w-40"
        />

        <Button
          size="sm"
          variant={discrepanciesOnly ? 'primary' : 'secondary'}
          icon={AlertTriangle}
          onClick={() => setDiscrepanciesOnly((v) => !v)}
          aria-pressed={discrepanciesOnly}
        >
          Discrepancies only
        </Button>

        {filtered && (
          <Button size="sm" variant="ghost" icon={X} onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      <Panel flush>
        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={filtered ? 'Nothing matches those filters' : 'No delivery notes yet'}
            description={
              filtered
                ? 'Try a wider date range, another status, or clear the filters.'
                : 'Delivery notes appear here as soon as the admin uploads them.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-tiny border-collapse">
              <thead>
                <tr className="border-b border-line bg-sunken">
                  <Th>DN No</Th>
                  <Th hide="2xl">SO No</Th>
                  <Th hide="xl">Date</Th>
                  <Th>Item</Th>
                  <Th align="right">PDF Qty</Th>
                  <Th align="right">Arrived</Th>
                  <Th align="right">Missing</Th>
                  <Th align="right" hide="2xl">In</Th>
                  <Th align="right" hide="2xl">Out</Th>
                  <Th align="right">Balance</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.deliveryNoteId}-${row.itemNumber}`}
                    onClick={() => setOpenRow(row)}
                    className="border-b border-line last:border-0 hover:bg-raised cursor-pointer transition-colors"
                  >
                    <Td>
                      <span className="font-semibold text-ink" data-numeric>
                        {row.dnNumber}
                      </span>
                    </Td>
                    <Td numeric muted hide="2xl">
                      {row.soNumber}
                    </Td>
                    <Td muted hide="xl">
                      {row.printDate ?? '—'}
                    </Td>
                    <Td>
                      <span
                        className="block max-w-[10rem] lg:max-w-[16rem] truncate"
                        title={row.itemDescription}
                      >
                        {row.itemDescription}
                      </span>
                    </Td>
                    <Td numeric align="right" muted>
                      {row.pdfQty}
                    </Td>
                    <Td numeric align="right">
                      {row.receivedAt ? row.arrivedQty : '—'}
                    </Td>
                    <Td align="right">
                      <MissingCell row={row} />
                    </Td>
                    <Td numeric align="right" muted hide="2xl">
                      {row.inQty}
                    </Td>
                    <Td numeric align="right" muted hide="2xl">
                      {row.outQty}
                    </Td>
                    <Td numeric align="right">
                      <span className="font-semibold text-ink">{row.balanceQty}</span>
                    </Td>
                    <Td>
                      <Badge tone={STATUS_TONE[row.status]}>{DN_STATUS_LABEL[row.status]}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-micro text-ink-faint">
            Showing <span data-numeric>{page * PAGE_SIZE + 1}</span>–
            <span data-numeric>{Math.min((page + 1) * PAGE_SIZE, total)}</span> of{' '}
            <span data-numeric>{total}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              icon={ChevronLeft}
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              icon={ChevronRight}
              disabled={page >= lastPage || loading}
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {openRow && <InventoryDetailPanel row={openRow} onClose={() => setOpenRow(null)} />}
    </div>
  );
};

/**
 * Columns drop away as the window narrows, least important first.
 *
 * A table of eleven columns cannot fit a laptop, and letting it scroll
 * sideways hides exactly the figures the screen exists for — the reader has
 * no way of knowing a Missing column is out there at all. What is left at the
 * narrowest size is the question the client actually asks: what was claimed,
 * what arrived, what is short, what is left.
 */
// Breakpoints watch the WINDOW, but this table only gets the window minus the
// 240px sidebar. Each threshold is therefore one step higher than the width
// the columns actually need.
type Hide = 'never' | 'lg' | 'xl' | '2xl';

const HIDE_CLASS: Record<Hide, string> = {
  never: '',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
  '2xl': 'hidden 2xl:table-cell',
};

const Th: React.FC<{
  children: React.ReactNode;
  align?: 'left' | 'right';
  hide?: Hide;
}> = ({ children, align = 'left', hide = 'never' }) => (
  <th
    scope="col"
    className={`px-3 py-2 font-semibold text-ink-soft whitespace-nowrap ${
      align === 'right' ? 'text-right' : 'text-left'
    } ${HIDE_CLASS[hide]}`}
  >
    {children}
  </th>
);

const Td: React.FC<{
  children: React.ReactNode;
  align?: 'left' | 'right';
  numeric?: boolean;
  muted?: boolean;
  hide?: Hide;
}> = ({ children, align = 'left', numeric, muted, hide = 'never' }) => (
  <td
    {...(numeric ? { 'data-numeric': true } : {})}
    className={`px-3 py-2 whitespace-nowrap ${align === 'right' ? 'text-right' : ''} ${
      muted ? 'text-ink-soft' : 'text-ink'
    } ${HIDE_CLASS[hide]}`}
  >
    {children}
  </td>
);

/**
 * The column the client cares about most.
 *
 * A shortage is red and an over-delivery amber, but neither relies on colour
 * alone: the sign and the word carry the meaning for anyone who cannot
 * distinguish them.
 */
const MissingCell: React.FC<{ row: InventoryRow }> = ({ row }) => {
  if (!row.receivedAt) return <span className="text-ink-faint">—</span>;
  if (row.missingQty === 0) return <span className="text-ink-faint">0</span>;

  const short = row.missingQty > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold ${short ? 'text-risk' : 'text-warn'}`}
      data-numeric
      title={row.discrepancyCode ? DISCREPANCY_LABEL[row.discrepancyCode] : undefined}
    >
      {Math.abs(row.missingQty)} {short ? 'short' : 'over'}
    </span>
  );
};
