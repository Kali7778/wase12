import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarDays, Loader2, RefreshCw, Save, Send } from 'lucide-react';
import { SlipDropzone } from '../components/admin/SlipDropzone';
import { StagedSlipCard } from '../components/admin/StagedSlipCard';
import { SavedSlipCard } from '../components/admin/SavedSlipCard';
import { useSlipStaging } from '../hooks/useSlipStaging';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import type { DeliveryNoteWithLines, Recipient, WorkflowEntry } from '../models/deliveryNote';
import { WORKFLOW_LABEL } from '../models/deliveryNote';
import { useAuth } from '../context/AuthContext';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Admin slip intake.
 *
 * The admin uploads the day's delivery slips in bulk, corrects anything the
 * parser could not read, saves them under that date, and then hands each slip
 * to the GM — individually or several at once.
 */
export const AdminSlipsView: React.FC = () => {
  const { can } = useAuth();
  const staging = useSlipStaging();

  const [batchDate, setBatchDate] = useState(today());
  const [saved, setSaved] = useState<DeliveryNoteWithLines[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  // Which GM a slip goes to. There can be several, so the sender chooses.
  const [gms, setGms] = useState<Recipient[]>([]);
  const [gmId, setGmId] = useState('');
  const [handovers, setHandovers] = useState<WorkflowEntry[]>([]);
  const [everyone, setEveryone] = useState<Recipient[]>([]);

  const canUpload = can('admin', 'dispatcher', 'warehouse', 'manager', 'gm', 'ceo');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [slips, log] = await Promise.all([
        deliveryNoteService.listWithLines(),
        deliveryNoteService.listHandovers(),
      ]);
      setSaved(slips);
      setHandovers(log);
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Could not load slips' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Both lists are needed: GMs to choose from, drivers to name in the record.
    Promise.all([
      deliveryNoteService.listRecipients('gm'),
      deliveryNoteService.listRecipients('driver'),
    ])
      .then(([gmList, driverList]) => {
        setGms(gmList);
        setGmId((current) => current || gmList[0]?.id || '');
        setEveryone([...gmList, ...driverList]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSave = async () => {
    setMessage(null);
    try {
      const { saved: n, failed } = await staging.saveAll(batchDate);
      if (n === 0 && failed === 0) {
        setMessage({ tone: 'error', text: 'Nothing to save — check the warnings on the cards.' });
        return;
      }
      setMessage({
        tone: failed ? 'error' : 'ok',
        text: failed ? `Saved ${n}, ${failed} failed.` : `Saved ${n} slip${n === 1 ? '' : 's'}.`,
      });
      staging.clearSaved();
      await refresh();
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Could not save' });
    }
  };

  const sendSlips = async (ids: string[]) => {
    if (ids.length === 0) return;
    setSendingId(ids.length === 1 ? ids[0] : 'bulk');
    setMessage(null);
    try {
      const gm = gms.find((g) => g.id === gmId);
      const count = await deliveryNoteService.sendToGm(ids, undefined, gmId || undefined);
      setMessage({
        tone: 'ok',
        text: `Sent ${count} slip${count === 1 ? '' : 's'} to ${gm?.fullName ?? 'the GM'}.`,
      });
      setSelected(new Set());
      await refresh();
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Could not send' });
    } finally {
      setSendingId(null);
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** Saved slips grouped by the day they were received. */
  const byDate = useMemo(() => {
    const groups = new Map<string, DeliveryNoteWithLines[]>();
    for (const slip of saved) {
      const key = slip.createdAt.slice(0, 10);
      groups.set(key, [...(groups.get(key) ?? []), slip]);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [saved]);

  const people = useMemo(
    () => new Map(everyone.map((p) => [p.id, p.fullName || p.email])),
    [everyone],
  );

  const draftsOnScreen = saved.filter((s) => s.workflowStatus === 'draft');
  const allSelected = draftsOnScreen.length > 0 && selected.size === draftsOnScreen.length;

  if (!canUpload) {
    return (
      <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
        You do not have permission to upload delivery slips.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Delivery Slips
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Upload the slips received from the supplier, then hand them to the GM.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {message && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium ${
            message.tone === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="shrink-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
              Date received
            </span>
            <div className="relative">
              <CalendarDays className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={batchDate}
                onChange={(e) => setBatchDate(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </label>
          <div className="flex-1">
            <SlipDropzone onFiles={staging.addFiles} busy={staging.busy} />
          </div>
        </div>

        {staging.slips.length > 0 && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {staging.slips.length} file{staging.slips.length === 1 ? '' : 's'}
                </span>
                <Stat label="ready" value={staging.readyCount} tone="emerald" />
                {staging.reviewCount > 0 && (
                  <Stat label="need review" value={staging.reviewCount} tone="orange" />
                )}
                {staging.duplicateCount > 0 && (
                  <Stat label="duplicate" value={staging.duplicateCount} tone="amber" />
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={staging.busy || staging.readyCount === 0}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {staging.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save {staging.readyCount} slip{staging.readyCount === 1 ? '' : 's'}
              </button>
            </div>

            {staging.reviewCount > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 text-xs text-orange-800 dark:text-orange-300">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  {staging.reviewCount} slip{staging.reviewCount === 1 ? '' : 's'} could not be read
                  completely. Fill in the highlighted fields — they will not be saved until every required
                  field is valid.
                </span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {staging.slips.map((slip) => (
                <StagedSlipCard
                  key={slip.key}
                  slip={slip}
                  onEdit={staging.editField}
                  onRemove={staging.remove}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">
            Uploaded slips
            {saved.length > 0 && (
              <span className="ml-2 text-xs font-semibold text-slate-400">{saved.length}</span>
            )}
          </h2>

          {draftsOnScreen.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setSelected(allSelected ? new Set() : new Set(draftsOnScreen.map((s) => s.id)))
                }
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {allSelected ? 'Clear selection' : 'Select all not sent'}
              </button>
              {gms.length > 1 && (
                <select
                  value={gmId}
                  onChange={(e) => setGmId(e.target.value)}
                  aria-label="General Manager to send to"
                  className="h-7 px-2 pr-7 rounded-control border border-line bg-surface text-micro text-ink cursor-pointer"
                >
                  {gms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.fullName || g.email}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => sendSlips([...selected])}
                disabled={selected.size === 0 || sendingId !== null}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {sendingId === 'bulk' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Send {selected.size || ''} to GM
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          </div>
        ) : saved.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 py-8 text-center">
            No slips uploaded yet.
          </p>
        ) : (
          byDate.map(([date, slips]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {slips.length} slip{slips.length === 1 ? '' : 's'}
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {slips.map((slip) => (
                  <SavedSlipCard
                    key={slip.id}
                    slip={slip}
                    selected={selected.has(slip.id)}
                    onToggleSelect={toggleSelect}
                    onSend={(id) => sendSlips([id])}
                    sending={sendingId === slip.id}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>
      {handovers.length > 0 && (
        <section className="bg-surface border border-line rounded-panel overflow-hidden">
          <header className="px-4 py-3 border-b border-line">
            <h2 className="text-tiny font-semibold text-ink">Handover record</h2>
            <p className="text-micro text-ink-faint mt-0.5">
              Every slip that has been passed on, and to whom.
            </p>
          </header>
          <ul className="divide-line max-h-80 overflow-y-auto custom-scrollbar">
            {handovers.map((entry) => {
              const slip = saved.find((s) => s.id === entry.deliveryNoteId);
              const to = people.get(entry.assignedTo ?? "");
              const by = people.get(entry.actor ?? "");
              return (
                <li key={entry.id} className="px-4 py-2.5 flex items-center gap-3 text-tiny">
                  <ArrowRight className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                  <span className="font-semibold text-ink shrink-0" data-numeric>
                    DN {slip?.dnNumber ?? entry.deliveryNoteId.slice(0, 8)}
                  </span>
                  <span className="text-ink-soft truncate">
                    {by ? `${by} sent it` : "Sent"} to <strong className="text-ink">{to ?? "—"}</strong>
                    {" "}({WORKFLOW_LABEL[entry.toStatus]})
                    {entry.note ? ` — ${entry.note}` : ""}
                  </span>
                  <span className="ml-auto text-micro text-ink-faint shrink-0">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; tone: 'emerald' | 'orange' | 'amber' }> = ({
  label,
  value,
  tone,
}) => {
  const tones = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    orange: 'text-orange-600 dark:text-orange-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };
  return (
    <span className={`font-semibold ${tones[tone]}`}>
      {value} {label}
    </span>
  );
};
