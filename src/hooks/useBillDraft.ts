import { useCallback, useMemo, useState } from 'react';
import { draftUnitPrice, lineAmount, type BillKind, type DraftLine } from '../models/billing';

/** A service charge on the bill: ticked or not, and the amount typed in (D55). */
export interface ServiceCharge {
  on: boolean;
  amount: string;
}

const OFF: ServiceCharge = { on: false, amount: '' };

const parseAmount = (s: string): number | null => {
  const n = Number(s);
  return s.trim() !== '' && Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

/**
 * The bill being written at the till, before it is saved.
 *
 * Only the running figures are worked out here, so the person at the till
 * sees them as they type. Whether the bill is allowed — the name, the stock,
 * the slip's quantity, the prices — is decided by create_bill(), and its
 * answer is what the screen shows if anything is wrong.
 */
export function useBillDraft() {
  const [kind, setKindState] = useState<BillKind>('stock');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [walkIn, setWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [deliveryNoteId, setDeliveryNoteId] = useState('');
  const [transport, setTransport] = useState<ServiceCharge>(OFF);
  const [labour, setLabour] = useState<ServiceCharge>(OFF);
  const [note, setNote] = useState('');

  const reset = useCallback((nextKind: BillKind = 'stock') => {
    setKindState(nextKind);
    setLines([]);
    setCustomerId('');
    setWalkIn(false);
    setWalkInName('');
    setWalkInPhone('');
    setDeliveryNoteId('');
    setTransport(OFF);
    setLabour(OFF);
    setNote('');
  }, []);

  /** Switching between a stock sale and a customer order starts afresh. */
  const setKind = useCallback((k: BillKind) => reset(k), [reset]);

  const addLine = useCallback((line: Omit<DraftLine, 'revisedPrice' | 'reviseNote'>) => {
    setLines((current) => {
      const existing = current.find((l) => l.itemId === line.itemId);
      if (existing) {
        // Adding a product already on the bill adds to its quantity.
        return current.map((l) =>
          l.itemId === line.itemId ? { ...l, qty: Math.min(l.qty + line.qty, l.maxQty) } : l,
        );
      }
      return [...current, { ...line, revisedPrice: null, reviseNote: '' }];
    });
  }, []);

  const updateLine = useCallback((itemId: string, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)));
  }, []);

  const removeLine = useCallback((itemId: string) => {
    setLines((current) => current.filter((l) => l.itemId !== itemId));
  }, []);

  const transportAmount = transport.on ? parseAmount(transport.amount) : null;
  const labourAmount = labour.on ? parseAmount(labour.amount) : null;

  const totals = useMemo(() => {
    const goods = lines.reduce((sum, l) => sum + lineAmount(l.qty, draftUnitPrice(l)), 0);
    const services = (transportAmount ?? 0) + (labourAmount ?? 0);
    return {
      goods: Math.round(goods * 100) / 100,
      services: Math.round(services * 100) / 100,
      total: Math.round((goods + services) * 100) / 100,
    };
  }, [lines, transportAmount, labourAmount]);

  /** What still stops the bill from being saved, in the words the screen shows. */
  const missing: string[] = [];
  if (kind === 'talab' && !deliveryNoteId) missing.push('Choose the customer order.');
  if (kind === 'stock' && !walkIn && !customerId) missing.push('Choose the customer, or tick "on the spot".');
  if (kind === 'stock' && walkIn && !walkInName.trim()) missing.push('Type the customer’s name.');
  if (lines.length === 0) missing.push('Add at least one product.');
  if (lines.some((l) => !(l.qty > 0))) missing.push('Every quantity must be more than zero.');
  if (lines.some((l) => l.qty > l.maxQty)) missing.push('A quantity is more than there is.');
  if (lines.some((l) => l.revisedPrice !== null && !(l.revisedPrice > 0)))
    missing.push('A revised price must be more than zero.');
  if (transport.on && transportAmount === null) missing.push('Type the transport amount.');
  if (labour.on && labourAmount === null) missing.push('Type the labour amount.');

  return {
    kind,
    setKind,
    lines,
    addLine,
    updateLine,
    removeLine,
    customerId,
    setCustomerId,
    walkIn,
    setWalkIn,
    walkInName,
    setWalkInName,
    walkInPhone,
    setWalkInPhone,
    deliveryNoteId,
    setDeliveryNoteId,
    setLines,
    transport,
    setTransport,
    labour,
    setLabour,
    transportAmount,
    labourAmount,
    note,
    setNote,
    totals,
    missing,
    reset,
  };
}

export type BillDraft = ReturnType<typeof useBillDraft>;
