import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { History, Loader2, RefreshCw, Tag } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, Input } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { pricingService } from '../services/PricingService';
import { formatSar, type ItemCurrentPrice, type ItemPriceChange } from '../models/pricing';

/**
 * What each product sells for.
 *
 * One price per product (D53). Changing it never overwrites the old one —
 * a new line is added to the history with the name of whoever set it, so
 * the question "what did this sell for last month?" always has an answer
 * (D63). The bill itself will copy the price when it is written, and may
 * revise it for that one sale; neither touches this list.
 */
export const PricesView: React.FC = () => {
  const { can } = useAuth();
  // Who may set a price, exactly as set_item_price() has it (D64).
  const canSet = can('admin', 'gm', 'ceo');

  const [items, setItems] = useState<ItemCurrentPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyOf, setHistoryOf] = useState<string | null>(null);
  const [history, setHistory] = useState<ItemPriceChange[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await pricingService.listCurrentPrices());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the prices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (i) =>
        i.itemNumber.toLowerCase().includes(term) ||
        i.descriptionEn.toLowerCase().includes(term) ||
        (i.descriptionAr ?? '').includes(term),
    );
  }, [items, search]);

  const unpriced = items.filter((i) => i.isActive && i.price === null).length;

  const startEdit = (item: ItemCurrentPrice) => {
    setEditing(item.itemId);
    setPrice(item.price === null ? '' : item.price.toFixed(2));
    setNote('');
    setError(null);
    setNotice(null);
  };

  const save = async (item: ItemCurrentPrice) => {
    const value = Number(price);
    if (!price.trim() || !Number.isFinite(value)) {
      setError('Enter the price as a number, for example 18.50.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await pricingService.setPrice(item.itemId, value, note);
      setNotice(`${item.descriptionEn} now sells for ${formatSar(value)} SAR per ${item.uom}.`);
      setEditing(null);
      await refresh();
      if (historyOf === item.itemId) setHistory(await pricingService.listHistory(item.itemId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set the price');
    } finally {
      setSaving(false);
    }
  };

  const toggleHistory = async (item: ItemCurrentPrice) => {
    if (historyOf === item.itemId) {
      setHistoryOf(null);
      return;
    }
    setHistoryOf(item.itemId);
    setHistory([]);
    try {
      setHistory(await pricingService.listHistory(item.itemId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the price history');
    }
  };

  return (
    <div id="prices-view" className="space-y-5">
      <PageHeader
        title="Prices"
        description="What each product sells for. A change never overwrites the old price — it is kept in the history with who set it and when."
        stats={[
          { label: 'products', value: items.filter((i) => i.isActive).length },
          { label: 'not priced yet', value: unpriced },
        ]}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={() => void refresh()}>
            Refresh
          </Button>
        }
      />

      {error && (
        <p className="px-3 py-2 rounded-control border border-risk text-micro text-risk bg-risk-soft">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="px-3 py-2 rounded-control border border-line text-micro text-ink-soft bg-raised">
          {notice}
        </p>
      )}

      <Panel
        flush
        title="Price list"
        description={canSet ? undefined : 'Only an admin, the GM or a superadmin can change a price.'}
        actions={
          <Input
            inputSize="sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a product"
            className="w-48"
          />
        }
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-micro text-ink-faint">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading prices…
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={Tag}
            title={items.length === 0 ? 'No products yet' : 'Nothing matches that'}
            description={
              items.length === 0
                ? 'Products are added from the delivery slips as they arrive. Once there are some, give each a price here.'
                : 'Try another name or number.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-tiny">
              <thead className="bg-sunken text-micro text-ink-faint">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Product</th>
                  <th className="text-right font-medium px-4 py-2">Price (SAR)</th>
                  <th className="text-left font-medium px-4 py-2">Set</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((item) => (
                  <React.Fragment key={item.itemId}>
                    <tr className={item.isActive ? '' : 'opacity-60'}>
                      <td className="px-4 py-2.5 align-top">
                        <span className="font-semibold text-ink">{item.descriptionEn}</span>
                        <span className="block text-micro text-ink-faint" data-numeric>
                          {item.itemNumber} · per {item.uom}
                        </span>
                        {!item.isActive && (
                          <Badge tone="neutral" subtle className="mt-1">
                            Switched off
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-2.5 align-top text-right">
                        {item.price === null ? (
                          <Badge tone="warn" subtle>
                            Not priced
                          </Badge>
                        ) : (
                          <span className="font-semibold text-ink" data-numeric>
                            {formatSar(item.price)}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-2.5 align-top text-micro text-ink-faint">
                        {item.priceSince ? (
                          <>
                            {new Date(item.priceSince).toLocaleDateString()}
                            {item.priceSetByName ? ` · ${item.priceSetByName}` : ''}
                            {item.priceNote && (
                              <span className="block text-ink-soft">{item.priceNote}</span>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="px-4 py-2.5 align-top text-right whitespace-nowrap">
                        {item.priceSince && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={History}
                            onClick={() => void toggleHistory(item)}
                          >
                            {historyOf === item.itemId ? 'Hide history' : 'History'}
                          </Button>
                        )}
                        {canSet && item.isActive && (
                          <Button
                            variant={editing === item.itemId ? 'ghost' : 'secondary'}
                            size="sm"
                            onClick={() =>
                              editing === item.itemId ? setEditing(null) : startEdit(item)
                            }
                          >
                            {editing === item.itemId
                              ? 'Cancel'
                              : item.price === null
                                ? 'Set price'
                                : 'Change price'}
                          </Button>
                        )}
                      </td>
                    </tr>

                    {editing === item.itemId && (
                      <tr>
                        <td colSpan={4} className="px-4 py-3 bg-sunken">
                          <div className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end max-w-2xl">
                            <Field label={`Price per ${item.uom} (SAR)`} htmlFor="price-value" required>
                              <Input
                                id="price-value"
                                inputMode="decimal"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="18.50"
                              />
                            </Field>
                            <Field label="Why (optional)" htmlFor="price-note">
                              <Input
                                id="price-note"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="For example: supplier raised their price"
                              />
                            </Field>
                            <Button variant="primary" loading={saving} onClick={() => void save(item)}>
                              Save price
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {historyOf === item.itemId && (
                      <tr>
                        <td colSpan={4} className="px-4 py-3 bg-sunken">
                          {history.length === 0 ? (
                            <p className="text-micro text-ink-faint">Loading the history…</p>
                          ) : (
                            <ul className="space-y-1.5 max-w-2xl">
                              {history.map((h) => (
                                <li key={h.id} className="flex flex-wrap items-baseline gap-x-3 text-micro">
                                  <span className="text-ink-faint w-24 shrink-0">
                                    {new Date(h.createdAt).toLocaleDateString()}
                                  </span>
                                  <span className="font-semibold text-ink" data-numeric>
                                    {h.previousPrice === null
                                      ? `${formatSar(h.price)} (first price)`
                                      : `${formatSar(h.previousPrice)} → ${formatSar(h.price)}`}
                                  </span>
                                  <span className="text-ink-soft">{h.setByName ?? 'Unknown'}</span>
                                  {h.note && <span className="text-ink-faint">— {h.note}</span>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};
