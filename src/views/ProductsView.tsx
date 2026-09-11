import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, Check, Loader2, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, Input } from '../components/ui/Field';
import { itemService } from '../services/MasterDataService';
import { useAuth } from '../context/AuthContext';
import type { Item } from '../models/masterData';

/**
 * The product master.
 *
 * Products are not typed in here — they arrive with the delivery notes. Every
 * note carries an item number, a description and a unit, and a product the
 * system has not seen before is recorded the first time one turns up. An item
 * number is unique, so the same product arriving on a hundred notes is still
 * one record.
 *
 * What this screen is for is the other half of that: checking them. The parser
 * is reliable but not perfect, and a product invented by a bad parse should be
 * caught by a person rather than quietly joining the real ones. Saving a row
 * is what marks it checked.
 */
export const ProductsView: React.FC = () => {
  const { can } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canEdit = can('ceo', 'gm', 'manager', 'admin');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await itemService.listWithUsage());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (i) =>
        i.itemNumber.toLowerCase().includes(term) ||
        i.descriptionEn.toLowerCase().includes(term),
    );
  }, [items, query]);

  const unverified = items.filter((i) => i.isAutoAdded).length;

  const onSaved = async (message: string) => {
    setEditing(null);
    setNotice(message);
    await refresh();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        description="Recorded automatically from the delivery notes. Check the new ones and correct anything the PDF got wrong."
        stats={[
          { label: 'products', value: items.length },
          { label: 'needing a check', value: unverified },
        ]}
        actions={
          <Button icon={RefreshCw} size="sm" onClick={refresh} loading={loading}>
            Refresh
          </Button>
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

      {unverified > 0 && (
        <div className="px-3 py-2.5 rounded-panel bg-warn-soft border border-warn/25 text-warn text-tiny flex items-start gap-2">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong data-numeric>{unverified}</strong>{' '}
            {unverified === 1 ? 'product came' : 'products came'} from a delivery note and nobody
            has checked {unverified === 1 ? 'it' : 'them'} yet. Confirm the description and unit,
            and add the weight if you know it.
          </span>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="w-3.5 h-3.5 text-ink-faint absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          aria-label="Search products"
          placeholder="Product name or number"
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
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={items.length === 0 ? 'No products yet' : 'Nothing matches that search'}
            description={
              items.length === 0
                ? 'Products are recorded automatically the first time they appear on an uploaded delivery note.'
                : 'Try another item number or description.'
            }
          />
        ) : (
          <ul className="divide-line">
            {visible.map((item) => (
              <li key={item.id}>
                {editing === item.id ? (
                  <EditRow item={item} onCancel={() => setEditing(null)} onSaved={onSaved} />
                ) : (
                  <ReadRow
                    item={item}
                    canEdit={canEdit}
                    onEdit={() => {
                      setEditing(item.id);
                      setNotice(null);
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};

const ReadRow: React.FC<{ item: Item; canEdit: boolean; onEdit: () => void }> = ({
  item,
  canEdit,
  onEdit,
}) => (
  <div className="px-4 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center hover:bg-raised transition-colors">
    <span className="w-9 h-9 rounded-control bg-sunken border border-line flex items-center justify-center shrink-0">
      <Boxes className="w-4 h-4 text-ink-faint" />
    </span>

    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-tiny font-semibold text-ink" data-numeric>
          {item.itemNumber}
        </span>
        {item.isAutoAdded && (
          <Badge tone="warn" icon={Sparkles}>
            Needs a check
          </Badge>
        )}
        {!item.isActive && <Badge tone="neutral">Retired</Badge>}
      </div>
      <p className="text-micro text-ink-faint mt-0.5 truncate">{item.descriptionEn}</p>
    </div>

    <div className="flex items-center gap-6 shrink-0 sm:px-4">
      <div className="text-right">
        <p className="text-micro text-ink-faint">Unit</p>
        <p className="text-tiny text-ink-soft">{item.uom}</p>
      </div>
      <div className="text-right">
        <p className="text-micro text-ink-faint">Weight</p>
        <p className="text-tiny text-ink-soft" data-numeric>
          {item.unitWeightKg === null ? '—' : `${item.unitWeightKg} kg`}
        </p>
      </div>
      <div className="text-right w-24">
        <p className="text-micro text-ink-faint">Used on</p>
        <p className="text-tiny text-ink-soft" data-numeric>
          {item.usageCount ?? 0} {item.usageCount === 1 ? 'note' : 'notes'}
        </p>
      </div>
    </div>

    {canEdit && (
      <Button size="sm" variant={item.isAutoAdded ? 'primary' : 'secondary'} onClick={onEdit}>
        {item.isAutoAdded ? 'Check' : 'Edit'}
      </Button>
    )}
  </div>
);

const EditRow: React.FC<{
  item: Item;
  onCancel: () => void;
  onSaved: (message: string) => void | Promise<void>;
}> = ({ item, onCancel, onSaved }) => {
  const [description, setDescription] = useState(item.descriptionEn);
  const [uom, setUom] = useState(item.uom);
  const [weight, setWeight] = useState(item.unitWeightKg === null ? '' : String(item.unitWeightKg));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weightValue = weight.trim() === '' ? null : Number(weight);
  const weightOk = weightValue === null || (Number.isFinite(weightValue) && weightValue > 0);
  const valid = description.trim() !== '' && uom.trim() !== '' && weightOk;

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await itemService.correct(item.id, {
        descriptionEn: description,
        uom,
        unitWeightKg: weightValue,
      });
      await onSaved(`${item.itemNumber} saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the product');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 py-4 bg-sunken">
      <p className="text-tiny font-semibold text-ink mb-3" data-numeric>
        {item.itemNumber}
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Description" htmlFor={`desc-${item.id}`} required className="sm:col-span-2">
          <Input
            id={`desc-${item.id}`}
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label="Unit" htmlFor={`uom-${item.id}`} required hint="For example BAG or TON.">
          <Input id={`uom-${item.id}`} value={uom} onChange={(e) => setUom(e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mt-3">
        <Field
          label="Unit weight (kg)"
          htmlFor={`kg-${item.id}`}
          error={weightOk ? undefined : 'Enter a weight greater than zero, or leave it blank.'}
          hint={weightOk ? 'Optional. Used to turn bags into tonnes.' : undefined}
        >
          <Input
            id={`kg-${item.id}`}
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            invalid={!weightOk}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="—"
            data-numeric
          />
        </Field>
      </div>

      {error && <p className="text-micro text-risk mt-2">{error}</p>}

      <div className="flex items-center gap-2 mt-4">
        <Button variant="primary" size="sm" icon={Check} disabled={!valid} loading={busy} onClick={save}>
          Save
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        {item.isAutoAdded && (
          <span className="text-micro text-ink-faint ml-auto">
            Saving marks this product as checked.
          </span>
        )}
      </div>
    </div>
  );
};
