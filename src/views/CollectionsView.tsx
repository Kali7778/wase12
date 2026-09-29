import React, { useCallback, useEffect, useState } from 'react';
import { Check, HandCoins, Loader2, MapPin, Phone, RefreshCw, X } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, Input, Textarea } from '../components/ui/Field';
import { BillDocument } from '../components/billing/BillDocument';
import { useAuth } from '../context/AuthContext';
import { billingService } from '../services/BillingService';
import { pricingService } from '../services/PricingService';
import { formatSar } from '../models/pricing';
import {
  COLLECTION_LABEL,
  COLLECTION_TONE,
  isLiveCollection,
  type BillWithLines,
  type PaymentCollection,
} from '../models/billing';

/**
 * Collections.
 *
 * A driver sees the jobs given to them and answers on the spot (D78): the
 * amount, the customer's phone and address, the delivery note, the GM's
 * note, and the bill itself to show the customer.
 *
 * The office sees every job and, above them, how much money is out of the
 * building right now — the figure that only exists because cash spends a
 * day or two in somebody's pocket (D74).
 */
export const CollectionsView: React.FC = () => {
  const { can, profile } = useAuth();
  const isDriver = can('driver');

  const [jobs, setJobs] = useState<PaymentCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [openOnly, setOpenOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await billingService.listCollections({ liveOnly: openOnly, limit: 300 }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the collections');
    } finally {
      setLoading(false);
    }
  }, [openOnly]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const live = jobs.filter((j) => isLiveCollection(j.status));
  const onTheRoad = live.reduce((sum, j) => sum + j.amount, 0);

  return (
    <div id="collections-view" className="space-y-5">
      <PageHeader
        title={isDriver ? 'Money to collect' : 'Collections'}
        description={
          isDriver
            ? 'Bills the GM has asked you to collect. Bring the whole amount; if the customer pays less, turn it down and say why.'
            : 'Bills that are out with a driver, and what came of each one. The bill is paid when the money reaches the office.'
        }
        stats={[
          { label: isDriver ? 'to collect' : 'out with drivers', value: live.length },
          { label: 'SAR out', value: formatSar(onTheRoad) },
        ]}
        actions={
          <>
            <label className="flex items-center gap-1.5 text-micro text-ink-soft cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                id="open-only"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
                className="w-3.5 h-3.5 cursor-pointer"
              />
              Still open only
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
      {notice && !error && (
        <p className="px-3 py-2 rounded-control border border-line text-micro text-ink-soft bg-raised">
          {notice}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-micro text-ink-faint">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading…
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title={isDriver ? 'Nothing to collect' : 'No collections'}
          description={
            isDriver
              ? 'When the GM asks you to bring money from a customer, it appears here.'
              : 'Open an unpaid bill and use “Send with a driver” to start one.'
          }
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              mine={isDriver && job.driverId === profile?.id}
              onDone={(message) => {
                setNotice(message);
                void refresh();
              }}
              onError={setError}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const JobCard: React.FC<{
  job: PaymentCollection;
  mine: boolean;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}> = ({ job, mine, onDone, onError }) => {
  const [open, setOpen] = useState<'collected' | 'declined' | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [bill, setBill] = useState<BillWithLines | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showBill, setShowBill] = useState(false);

  const openBill = async () => {
    if (showBill) {
      setShowBill(false);
      return;
    }
    setShowBill(true);
    if (bill) return;
    try {
      const b = await billingService.getBill(job.billId);
      setBill(b);
      setLogoUrl(b?.company.logo_path ? await pricingService.logoUrl(b.company.logo_path) : null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not open the bill');
    }
  };

  const run = async (fn: () => Promise<void>, message: string) => {
    setBusy(true);
    try {
      await fn();
      setOpen(null);
      setText('');
      onDone(message);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'That did not work');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="bg-surface border border-line rounded-panel p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-tiny font-semibold text-ink">{job.customerName}</p>
          <p className="text-micro text-ink-faint" data-numeric>
            {job.billNumber}
            {job.dnNumber ? ` · DN ${job.dnNumber}` : ''} ·{' '}
            {new Date(job.billDate).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lead font-semibold text-ink" data-numeric>
            {formatSar(job.amount)}
          </p>
          <p className="text-micro text-ink-faint">SAR</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={COLLECTION_TONE[job.status]} subtle>
          {COLLECTION_LABEL[job.status]}
        </Badge>
        <span className="text-micro text-ink-faint">
          {job.driverName} · sent {new Date(job.assignedAt).toLocaleDateString()} by {job.assignedByName}
        </span>
      </div>

      {(job.customerPhone || job.customerAddress) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-micro">
          {job.customerPhone && (
            <a href={`tel:${job.customerPhone}`} className="inline-flex items-center gap-1 text-accent hover:underline">
              <Phone className="w-3 h-3" />
              <span data-numeric>{job.customerPhone}</span>
            </a>
          )}
          {job.customerAddress && (
            <span className="inline-flex items-center gap-1 text-ink-soft">
              <MapPin className="w-3 h-3 text-ink-faint" />
              {job.customerAddress}
            </span>
          )}
        </div>
      )}

      {job.note && <p className="text-micro text-ink-soft">“{job.note}”</p>}
      {job.collectedNote && <p className="text-micro text-ink-soft">Driver: “{job.collectedNote}”</p>}
      {job.closedReason && <p className="text-micro text-ink-soft">{job.closedReason}</p>}
      {job.receivedAt && (
        <p className="text-micro text-ink-faint">
          Taken in {new Date(job.receivedAt).toLocaleDateString()}
          {job.receivedByName ? ` by ${job.receivedByName}` : ''}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => void openBill()}>
          {showBill ? 'Hide the bill' : 'Open the bill'}
        </Button>
        {mine && job.status === 'with_driver' && (
          <>
            <Button
              variant="primary"
              size="sm"
              icon={Check}
              onClick={() => setOpen(open === 'collected' ? null : 'collected')}
            >
              Collected
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={X}
              onClick={() => setOpen(open === 'declined' ? null : 'declined')}
            >
              Not collected
            </Button>
          </>
        )}
      </div>

      {open === 'collected' && (
        <div className="space-y-2">
          <Field
            label={`Taking ${formatSar(job.amount)} SAR — note (optional)`}
            htmlFor={`col-note-${job.id}`}
            hint="The money stays with you until the office takes it in."
          >
            <Input id={`col-note-${job.id}`} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <Button
            variant="primary"
            size="sm"
            loading={busy}
            onClick={() => void run(() => billingService.markCollected(job.id, text), `${job.billNumber}: money collected.`)}
          >
            I have the money
          </Button>
        </div>
      )}

      {open === 'declined' && (
        <div className="space-y-2">
          <Field label="Why not?" htmlFor={`dec-note-${job.id}`} required hint="The whole bill or nothing — say what happened.">
            <Textarea id={`dec-note-${job.id}`} rows={2} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <Button
            variant="secondary"
            size="sm"
            loading={busy}
            disabled={!text.trim()}
            onClick={() =>
              void run(() => billingService.markNotCollected(job.id, text), `${job.billNumber}: reported back to the office.`)
            }
          >
            Send it back to the office
          </Button>
        </div>
      )}

      {showBill && (
        <div className="overflow-x-auto pt-1">
          {bill ? (
            <BillDocument bill={bill} logoUrl={logoUrl} />
          ) : (
            <p className="text-micro text-ink-faint">Loading the bill…</p>
          )}
        </div>
      )}
    </li>
  );
};
