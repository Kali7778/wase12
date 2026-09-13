import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Field, Input } from '../ui/Field';
import { itemService } from '../../services/MasterDataService';

interface AddProductFormProps {
  /**
   * Item numbers already in the master, lower-cased and trimmed. Used only to
   * warn while typing — the unique constraint in the database is what
   * actually refuses a duplicate.
   */
  existingNumbers: ReadonlySet<string>;
  onCancel: () => void;
  onSaved: (message: string) => void | Promise<void>;
}

/**
 * Adding a product by hand.
 *
 * The fields are exactly what the item master holds today. Anything the
 * client adds later belongs here and in `NewItem` together.
 */
export const AddProductForm: React.FC<AddProductFormProps> = ({
  existingNumbers,
  onCancel,
  onSaved,
}) => {
  const [itemNumber, setItemNumber] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [uom, setUom] = useState('');
  const [weight, setWeight] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duplicate = existingNumbers.has(itemNumber.trim().toLowerCase());
  const weightValue = weight.trim() === '' ? null : Number(weight);
  const weightOk = weightValue === null || (Number.isFinite(weightValue) && weightValue > 0);

  const valid =
    itemNumber.trim() !== '' &&
    !duplicate &&
    descriptionEn.trim() !== '' &&
    uom.trim() !== '' &&
    weightOk;

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const item = await itemService.create({
        itemNumber,
        descriptionEn,
        descriptionAr: descriptionAr.trim() || null,
        uom,
        unitWeightKg: weightValue,
      });
      await onSaved(`${item.itemNumber} added.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the product');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="px-4 py-4 rounded-panel border border-line bg-surface"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <p className="text-tiny font-semibold text-ink">New product</p>
      <p className="text-micro text-ink-faint mt-0.5 mb-4">
        Use the item number exactly as it appears on the supplier's delivery note, so that slips
        for this product are matched to it.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Item number"
          htmlFor="new-item-number"
          required
          error={duplicate ? 'A product with this item number already exists.' : undefined}
        >
          <Input
            id="new-item-number"
            autoFocus
            value={itemNumber}
            invalid={duplicate}
            onChange={(e) => setItemNumber(e.target.value)}
            data-numeric
          />
        </Field>

        <Field
          label="Description (English)"
          htmlFor="new-item-desc-en"
          required
          className="sm:col-span-2"
        >
          <Input
            id="new-item-desc-en"
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mt-3">
        <Field label="Description (Arabic)" htmlFor="new-item-desc-ar" className="sm:col-span-2">
          <Input
            id="new-item-desc-ar"
            dir="rtl"
            lang="ar"
            className="font-arabic"
            value={descriptionAr}
            onChange={(e) => setDescriptionAr(e.target.value)}
          />
        </Field>

        <Field label="Unit" htmlFor="new-item-uom" required hint="For example BAG or TON.">
          <Input id="new-item-uom" value={uom} onChange={(e) => setUom(e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mt-3">
        <Field
          label="Unit weight (kg)"
          htmlFor="new-item-kg"
          error={weightOk ? undefined : 'Enter a weight greater than zero, or leave it blank.'}
          hint={weightOk ? 'Optional. Used to turn bags into tonnes.' : undefined}
        >
          <Input
            id="new-item-kg"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            invalid={!weightOk}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            data-numeric
          />
        </Field>
      </div>

      {error && <p className="text-micro text-risk mt-3">{error}</p>}

      <div className="flex items-center gap-2 mt-4">
        <Button type="submit" variant="primary" size="sm" icon={Check} disabled={!valid} loading={busy}>
          Add product
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
