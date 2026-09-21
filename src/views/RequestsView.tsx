import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Inbox, Loader2, RefreshCw, Send, X } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import {
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
  REQUEST_TYPE_LABEL,
  REQUEST_TYPES,
  type DeliveryNoteWithLines,
  type SlipRequest,
  type SlipRequestType,
} from '../models/deliveryNote';

/**
 * Asking for a slip, and answering.
 *
 * Before this, somebody waiting on paperwork picked up the phone, and
 * nothing was left behind: not who asked, not what for, not whether
 * anybody answered. The warehouse asks the office — where the admin and
 * the GM both see it and either can answer (D40) — and a driver asks the
 * warehouse.
 */
export const RequestsView: React.FC = () => {
  const { profile, can } = useAuth();
  const [requests, setRequests] = useState<SlipRequest[]>([]);
  const [slips, setSlips] = useState<DeliveryNoteWithLines[]>([]);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Who may ask follows from the role, exactly as the database has it.
  const canAsk = can('warehouse', 'driver');
  const isOffice = can('admin', 'manager', 'gm', 'ceo');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, mine, upstream] = await Promise.all([
        deliveryNoteService.listRequests(),
        profile ? deliveryNoteService.listHeldBy(profile.id) : Promise.resolve([]),
        isOffice ? deliveryNoteService.listNotYetDispatched() : Promise.resolve([]),
      ]);
      setRequests(list);

      // What this person could hand over in answer: what they are holding,
      // and — for the office — anything not yet out for delivery.
      const byId = new Map<string, DeliveryNoteWithLines>();
      [...mine, ...upstream].forEach((s) => byId.set(s.id, s));
      setSlips([...byId.values()]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the requests');
    } finally {
      setLoading(false);
    }
  }, [profile, isOffice]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const inbox = useMemo(
    () => requests.filter((r) => r.status === 'pending' && r.requestedBy !== profile?.id),
    [requests, profile],
  );
  const mine = useMemo(
    () => requests.filter((r) => r.requestedBy === profile?.id),
    [requests, profile],
  );

  const done = async (message: string) => {
    setOpenId(null);
    setAsking(false);
    setNotice(message);
    await refresh();
  };

  const withdraw = async (request: SlipRequest) => {
    setError(null);
    try {
      await deliveryNoteService.cancelRequest(request.id);
      await done('Request withdrawn.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not withdraw the request');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Requests"
        description={
          canAsk
            ? 'Ask for a slip you need, and see what came of it.'
            : 'Slips the warehouse and the drivers have asked for.'
        }
        stats={[
          { label: 'waiting for you', value: inbox.length },
          { label: 'your requests', value: mine.filter((r) => r.status === 'pending').length },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button icon={RefreshCw} size="sm" onClick={refresh} loading={loading}>
              Refresh
            </Button>
            {canAsk && (
              <Button
                icon={Send}
                size="sm"
                variant="primary"
                disabled={asking}
                onClick={() => {
                  setAsking(true);
                  setNotice(null);
                }}
              >
                Ask for a slip
              </Button>
            )}
          </div>
        }
      />

      {error && <div className="px-3 py-2 rounded-panel bg-risk-soft text-risk text-tiny">{error}</div>}
      {notice && (
        <div className="px-3 py-2 rounded-panel bg-ok-soft text-ok text-tiny flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {asking && <AskForm onCancel={() => setAsking(false)} onDone={done} />}

      <Panel
        title="Waiting for you"
        description={
          isOffice
            ? 'The warehouse is waiting on these. Either you or the GM can answer.'
            : 'Your drivers are waiting on these.'
        }
        flush
      >
        {loading && requests.length === 0 ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          </div>
        ) : inbox.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Nothing waiting"
            description="Requests addressed to you appear here."
          />
        ) : (
          <ul className="divide-line">
            {inbox.map((r) => (
              <li key={r.id}>
                <RequestRow
                  request={r}
                  action={
                    <Button
                      size="sm"
                      variant={openId === r.id ? 'secondary' : 'primary'}
                      onClick={() => {
                        setOpenId(openId === r.id ? null : r.id);
                        setNotice(null);
                      }}
                    >
                      {openId === r.id ? 'Close' : 'Answer'}
                    </Button>
                  }
                />
                {openId === r.id && (
                  <AnswerForm
                    request={r}
                    slips={slips}
                    onCancel={() => setOpenId(null)}
                    onDone={done}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Your requests" flush>
        {mine.length === 0 ? (
          <EmptyState
            icon={Send}
            title={canAsk ? 'You have not asked for anything' : 'Nothing to show'}
            description={
              canAsk
                ? 'Ask for a slip and it will be listed here until somebody answers.'
                : 'The office hands slips out; it does not ask for them.'
            }
          />
        ) : (
          <ul className="divide-line">
            {mine.map((r) => (
              <li key={r.id}>
                <RequestRow
                  request={r}
                  mine
                  action={
                    r.status === 'pending' ? (
                      <Button size="sm" variant="ghost" onClick={() => withdraw(r)}>
                        Withdraw
                      </Button>
                    ) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};

const RequestRow: React.FC<{
  request: SlipRequest;
  mine?: boolean;
  action?: React.ReactNode;
}> = ({ request, mine, action }) => (
  <div className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center hover:bg-raised transition-colors">
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-tiny font-semibold text-ink">
          {REQUEST_TYPE_LABEL[request.requestType]}
        </span>
        <Badge tone={REQUEST_STATUS_TONE[request.status]}>
          {REQUEST_STATUS_LABEL[request.status]}
        </Badge>
        {request.dnNumber && (
          <span className="text-micro text-ink-faint" data-numeric>
            about DN {request.dnNumber}
          </span>
        )}
      </div>

      {request.message && <p className="text-micro text-ink-soft mt-0.5">{request.message}</p>}

      <p className="text-micro text-ink-faint mt-0.5">
        {mine ? 'You asked' : `${request.requestedByName || 'Someone'} asked`}{' '}
        {new Date(request.createdAt).toLocaleString()}
        {request.decidedAt && request.status !== 'cancelled' && (
          <>
            {' · '}
            {REQUEST_STATUS_LABEL[request.status].toLowerCase()} by{' '}
            {request.decidedByName || 'the office'}
            {request.fulfilledDnNumber ? ` · DN ${request.fulfilledDnNumber}` : ''}
            {request.decisionNote ? ` · ${request.decisionNote}` : ''}
          </>
        )}
      </p>
    </div>

    {action && <div className="shrink-0">{action}</div>}
  </div>
);

/** Asking. The type is one of four; "Other" has to say what is needed. */
const AskForm: React.FC<{
  onCancel: () => void;
  onDone: (message: string) => void | Promise<void>;
}> = ({ onCancel, onDone }) => {
  const [type, setType] = useState<SlipRequestType>('slip_for_delivery');
  const [message, setMessage] = useState('');
  const [dnNumber, setDnNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = type !== 'other' || message.trim() !== '';

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      let deliveryNoteId: string | undefined;
      if (dnNumber.trim()) {
        const slip = await deliveryNoteService.findByDn(dnNumber);
        if (!slip) {
          setError(`No delivery note numbered ${dnNumber.trim()}.`);
          setBusy(false);
          return;
        }
        deliveryNoteId = slip.id;
      }

      await deliveryNoteService.createRequest({ requestType: type, message, deliveryNoteId });
      await onDone('Asked. You will see the answer here.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the request');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Ask for a slip">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="What do you need?" htmlFor="request-type" required>
          <Select
            id="request-type"
            value={type}
            onChange={(e) => setType(e.target.value as SlipRequestType)}
          >
            {REQUEST_TYPES.map((t) => (
              <option key={t} value={t}>
                {REQUEST_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Delivery note number"
          htmlFor="request-dn"
          hint="If you know which slip you need."
        >
          <Input
            id="request-dn"
            value={dnNumber}
            onChange={(e) => setDnNumber(e.target.value)}
            data-numeric
          />
        </Field>
      </div>

      <Field
        label="Message"
        htmlFor="request-message"
        required={type === 'other'}
        className="mt-3"
        hint={type === 'other' ? 'Required when you choose Other.' : 'Anything that helps.'}
      >
        <Textarea
          id="request-message"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Truck 42 is loading and I have no paperwork"
        />
      </Field>

      {error && <p className="text-micro text-risk mt-2">{error}</p>}

      <div className="flex items-center gap-2 mt-4">
        <Button variant="primary" size="sm" icon={Send} disabled={!valid} loading={busy} onClick={submit}>
          Send the request
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </Panel>
  );
};

/**
 * Answering. Handing a slip over in the same step is the point of the
 * screen; the handover itself still goes through the usual rules, so a
 * slip that cannot be passed on is refused here too.
 */
const AnswerForm: React.FC<{
  request: SlipRequest;
  slips: DeliveryNoteWithLines[];
  onCancel: () => void;
  onDone: (message: string) => void | Promise<void>;
}> = ({ request, slips, onCancel, onDone }) => {
  const [slipId, setSlipId] = useState(request.deliveryNoteId ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'send' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choices = useMemo(() => {
    // The slip they asked about first, if it is one this person can pass on.
    const sorted = [...slips].sort((a, b) => a.dnNumber.localeCompare(b.dnNumber));
    return sorted;
  }, [slips]);

  const send = async () => {
    setBusy('send');
    setError(null);
    try {
      await deliveryNoteService.fulfilRequest({
        requestId: request.id,
        deliveryNoteId: slipId || undefined,
        note,
      });
      await onDone(
        slipId ? 'Slip handed over and the request closed.' : 'Request marked as answered.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not answer the request');
    } finally {
      setBusy(null);
    }
  };

  const decline = async () => {
    setBusy('decline');
    setError(null);
    try {
      await deliveryNoteService.declineRequest(request.id, note);
      await onDone('Request turned down. Whoever asked can see it.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not turn down the request');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="px-4 pb-4">
      <div className="p-3 rounded-panel bg-sunken border border-line">
        <Field
          label="Hand over a slip"
          htmlFor={`slip-${request.id}`}
          hint="Leave this empty to close the request without handing anything over."
        >
          <Select
            id={`slip-${request.id}`}
            value={slipId}
            onChange={(e) => setSlipId(e.target.value)}
          >
            <option value="">No slip — just answer</option>
            {choices.map((s) => (
              <option key={s.id} value={s.id}>
                {`DN ${s.dnNumber} · ${s.lines[0]?.pdfQty ?? '—'} ${s.lines[0]?.uom ?? ''}`}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Note"
          htmlFor={`note-${request.id}`}
          className="mt-3"
          hint="Optional either way — it is shown to whoever asked."
        >
          <Textarea
            id={`note-${request.id}`}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        {error && <p className="text-micro text-risk mt-2">{error}</p>}

        <div className="flex items-center gap-2 mt-4">
          <Button
            variant="primary"
            size="sm"
            icon={Check}
            loading={busy === 'send'}
            disabled={busy !== null}
            onClick={send}
          >
            {slipId ? 'Hand it over' : 'Mark as answered'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={X}
            loading={busy === 'decline'}
            disabled={busy !== null}
            onClick={decline}
          >
            Turn it down
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy !== null}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
