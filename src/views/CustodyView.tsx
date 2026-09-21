import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, History, Loader2, RefreshCw, Search } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Field';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import { CUSTODY_ACTION_LABEL, type CustodyAction, type CustodyEntry } from '../models/deliveryNote';

/**
 * Who had which slip, and who they gave it to.
 *
 * The question this screen exists to answer is the client's own: which
 * driver did the warehouse hand that slip to? Every step is read from the
 * append-only handover ledger, so what is shown here is what happened —
 * the rows cannot be edited or removed once written.
 */
const TONE: Record<CustodyAction, 'neutral' | 'accent' | 'ok' | 'risk' | 'info' | 'warn'> = {
  hand_over: 'accent',
  reassign_driver: 'info',
  acknowledge: 'ok',
  approve: 'ok',
  reject: 'risk',
  receive: 'ok',
  // A replaced sheet is not a failure, but it is not routine either.
  replace: 'warn',
  deliver: 'ok',
};

export const CustodyView: React.FC = () => {
  const [entries, setEntries] = useState<CustodyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (dnNumber?: string) => {
    setLoading(true);
    try {
      setEntries(await deliveryNoteService.listCustody({ dnNumber }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the handover history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /*
   * The search runs in the database rather than over the loaded page: the
   * list is the newest hundred steps, and the slip being asked about is
   * usually older than that.
   */
  useEffect(() => {
    const term = query.trim();
    const timer = setTimeout(() => void refresh(term || undefined), term ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, refresh]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Handovers"
        description="Every time a slip changed hands: who passed it on, who took it, and when."
        stats={[{ label: 'steps shown', value: entries.length }]}
        actions={
          <Button icon={RefreshCw} size="sm" onClick={() => refresh(query.trim() || undefined)} loading={loading}>
            Refresh
          </Button>
        }
      />

      {error && <div className="px-3 py-2 rounded-panel bg-risk-soft text-risk text-tiny">{error}</div>}

      <div className="relative max-w-sm">
        <Search className="w-3.5 h-3.5 text-ink-faint absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          aria-label="Find a delivery note"
          placeholder="Delivery note number"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <Panel flush>
        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={History}
            title={query.trim() ? 'No handovers for that delivery note' : 'Nothing has changed hands yet'}
            description={
              query.trim()
                ? 'Check the number, or clear the search to see every recent step.'
                : 'Every handover, confirmation and count will be listed here as it happens.'
            }
          />
        ) : (
          <ul className="divide-line">
            {entries.map((e) => (
              <li key={e.id} className="px-4 py-3 flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="min-w-0 lg:w-44 shrink-0">
                  <p className="text-tiny font-semibold text-ink" data-numeric>
                    DN {e.dnNumber}
                  </p>
                  <p className="text-micro text-ink-faint" data-numeric>
                    SO {e.soNumber}
                  </p>
                </div>

                <div className="shrink-0 lg:w-40">
                  <Badge tone={TONE[e.action] ?? 'neutral'}>{CUSTODY_ACTION_LABEL[e.action] ?? e.action}</Badge>
                </div>

                <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap text-tiny">
                  <Person name={e.fromName} role={e.fromRole} fallback="—" />
                  <ArrowRight className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                  <Person name={e.toName} role={e.toRole} fallback="—" />
                  {e.note && <span className="text-micro text-ink-faint">· {e.note}</span>}
                </div>

                <div className="shrink-0 lg:w-56 lg:text-right">
                  <p className="text-micro text-ink-faint">
                    {new Date(e.createdAt).toLocaleString()}
                  </p>
                  {e.actorName && (
                    <p className="text-micro text-ink-faint">by {e.actorName}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};

const Person: React.FC<{ name: string | null; role: string | null; fallback: string }> = ({
  name,
  role,
  fallback,
}) => (
  <span className="min-w-0">
    <span className="text-ink">{name?.trim() || fallback}</span>
    {role && <span className="text-micro text-ink-faint"> ({role})</span>}
  </span>
);
