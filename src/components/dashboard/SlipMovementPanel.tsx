import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { deliveryNoteService } from '../../services/DeliveryNoteService';
import type { DailySlipCount } from '../../models/deliveryNote';

const DAYS = 7;

/**
 * What happened to the slips today, and on the days before it.
 *
 * The intake screen has always shown how many slips came in. This is the
 * other half the client asked for: how many went out — and "out" means
 * what this person passed on, so the admin sees the admin's own number and
 * the GM sees theirs (D36).
 *
 * A day here is a day in Jeddah (D44). Counted at midnight UTC the numbers
 * would move to the wrong column for anything handled late in the evening.
 */
export const SlipMovementPanel: React.FC = () => {
  const [days, setDays] = useState<DailySlipCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setDays(await deliveryNoteService.listDailyCounts(DAYS));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load today’s slip movement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const today = days[0];
  const earlier = days.slice(1);

  if (error) {
    return (
      <Panel title="Slips today">
        <p className="text-tiny text-risk">{error}</p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Slips today"
      description="In Jeddah time. “You sent on” counts the slips you passed to somebody else."
      actions={
        <Button icon={RefreshCw} size="sm" onClick={refresh} loading={loading}>
          Refresh
        </Button>
      }
    >
      {loading && days.length === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Figure label="Uploaded" value={today?.uploaded ?? 0} />
            <Figure label="You sent on" value={today?.sentByMe ?? 0} accent />
            <Figure label="Out with drivers" value={today?.outToDriver ?? 0} />
            <Figure label="Counted in" value={today?.received ?? 0} />
            <Figure label="Reissued" value={today?.reissued ?? 0} />
          </div>

          {earlier.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-tiny">
                <thead className="text-micro text-ink-faint">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">Day</th>
                    <th className="px-2 py-1.5 text-right font-medium">Uploaded</th>
                    <th className="px-2 py-1.5 text-right font-medium">You sent on</th>
                    <th className="px-2 py-1.5 text-right font-medium">Out</th>
                    <th className="px-2 py-1.5 text-right font-medium">Counted in</th>
                    <th className="px-2 py-1.5 text-right font-medium">Reissued</th>
                  </tr>
                </thead>
                <tbody className="divide-line">
                  {earlier.map((d) => (
                    <tr key={d.day} className="text-ink-soft">
                      <td className="px-2 py-1.5">
                        {new Date(`${d.day}T00:00:00`).toLocaleDateString(undefined, {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <Cell value={d.uploaded} />
                      <Cell value={d.sentByMe} />
                      <Cell value={d.outToDriver} />
                      <Cell value={d.received} />
                      <Cell value={d.reissued} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {today && today.uploaded === 0 && today.sentByMe === 0 && today.outToDriver === 0 && (
            <p className="text-micro text-ink-faint mt-3 flex items-center gap-1.5">
              Nothing has moved yet today
              <ArrowRight className="w-3 h-3" />
              upload the morning’s slips to start the count
            </p>
          )}
        </>
      )}
    </Panel>
  );
};

const Figure: React.FC<{ label: string; value: number; accent?: boolean }> = ({
  label,
  value,
  accent,
}) => (
  <div className="px-3 py-2.5 rounded-panel bg-sunken border border-line">
    <p className="text-micro text-ink-faint">{label}</p>
    <p
      className={`text-lead font-semibold ${accent ? 'text-accent' : 'text-ink'}`}
      data-numeric
    >
      {value}
    </p>
  </div>
);

const Cell: React.FC<{ value: number }> = ({ value }) => (
  <td className="px-2 py-1.5 text-right" data-numeric>
    {value === 0 ? <span className="text-ink-faint">—</span> : value}
  </td>
);
