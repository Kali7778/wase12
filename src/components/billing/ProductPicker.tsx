import React, { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Input } from '../ui/Field';
import { formatSar } from '../../models/pricing';
import type { SellableItem } from '../../models/billing';

interface ProductPickerProps {
  items: SellableItem[];
  /** How much of each product is already on the bill, so the grid shows what is left. */
  onBill: Record<string, number>;
  onAdd: (item: SellableItem) => void;
}

/**
 * The products the warehouse can sell, as tiles to tap.
 *
 * A product without a price, or without stock, is shown but cannot be
 * added — the tile says which, so nobody wonders why it is missing.
 */
export const ProductPicker: React.FC<ProductPickerProps> = ({ items, onBill, onAdd }) => {
  const [search, setSearch] = useState('');

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = term
      ? items.filter(
          (i) =>
            i.descriptionEn.toLowerCase().includes(term) ||
            i.itemNumber.includes(term) ||
            (i.descriptionAr ?? '').includes(term),
        )
      : items;
    // Sellable products first.
    return [...list].sort(
      (a, b) =>
        Number(b.price !== null && b.inStock > 0) - Number(a.price !== null && a.inStock > 0) ||
        a.descriptionEn.localeCompare(b.descriptionEn),
    );
  }, [items, search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 text-ink-faint absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          id="pos-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search a product by name or number"
          className="pl-8"
        />
      </div>

      {shown.length === 0 ? (
        <p className="text-micro text-ink-faint py-6 text-center">
          {items.length === 0 ? 'No products yet.' : 'Nothing matches that.'}
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((item) => {
            const left = item.inStock - (onBill[item.itemId] ?? 0);
            const reason =
              item.price === null ? 'No price yet' : item.inStock <= 0 ? 'Out of stock' : left <= 0 ? 'All on the bill' : null;
            return (
              <li key={item.itemId}>
                <button
                  type="button"
                  disabled={reason !== null}
                  onClick={() => onAdd(item)}
                  className="w-full h-full text-left p-3 rounded-control border border-line bg-surface hover:border-accent hover:bg-accent-soft transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-surface disabled:hover:border-line flex flex-col gap-1"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-tiny font-semibold text-ink">{item.descriptionEn}</span>
                    {reason === null && <Plus className="w-4 h-4 text-accent shrink-0" />}
                  </span>
                  <span className="text-micro text-ink-faint" data-numeric>
                    {item.itemNumber}
                  </span>
                  <span className="flex items-baseline justify-between gap-2 mt-1">
                    <span className="text-tiny font-semibold text-ink" data-numeric>
                      {item.price === null ? '—' : `${formatSar(item.price)} SAR`}
                      <span className="text-micro font-normal text-ink-faint"> / {item.uom}</span>
                    </span>
                    <span className={`text-micro ${reason ? 'text-warn' : 'text-ink-faint'}`} data-numeric>
                      {reason ?? `${left.toLocaleString()} left`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
