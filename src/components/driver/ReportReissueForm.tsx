import React, { useState } from 'react';
import { Camera, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Field, Select, Textarea, Input } from '../ui/Field';
import { deliveryNoteService } from '../../services/DeliveryNoteService';
import {
  REISSUE_REASON_LABEL,
  type DeliveryNoteWithLines,
  type ReissueReason,
} from '../../models/deliveryNote';

const REASONS: ReissueReason[] = ['lost', 'damaged', 'supplier_correction', 'other'];

interface ReportReissueFormProps {
  slip: DeliveryNoteWithLines;
  onCancel: () => void;
  onDone: (message: string) => void | Promise<void>;
}

/**
 * The driver reports a sheet the supplier printed again (D34).
 *
 * This does not create a delivery note. The numbers on the new sheet are
 * what the warehouse will search for and what the supplier will be shown,
 * so an admin or the GM reads them off the photo first (D47). All the
 * driver has to get right is which slip it replaces, and why.
 */
export const ReportReissueForm: React.FC<ReportReissueFormProps> = ({ slip, onCancel, onDone }) => {
  const [reason, setReason] = useState<ReissueReason>('lost');
  const [note, setNote] = useState('');
  const [dnNumber, setDnNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsNote = reason === 'other';
  const valid = !needsNote || note.trim() !== '';

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      let filePath: string | undefined;
      if (file) {
        filePath = await deliveryNoteService.uploadReissuePhoto(file, slip.dnNumber);
      }

      await deliveryNoteService.submitReissue({
        originalDnId: slip.id,
        reason,
        note,
        filePath,
        fileType: file?.type.startsWith('image/') ? 'image' : 'pdf',
        dnNumber,
      });

      await onDone(`Reported. The office will check it and record the new slip.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not report this');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 pb-4">
      <div className="p-3 rounded-panel bg-sunken border border-line">
        <p className="text-tiny font-semibold text-ink">
          The supplier gave you another sheet for DN {slip.dnNumber}
        </p>
        <p className="text-micro text-ink-faint mt-0.5 mb-3">
          Photograph the new sheet. The office reads its numbers and records it; until then this slip
          stays as it is.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What happened" htmlFor={`why-${slip.id}`} required>
            <Select
              id={`why-${slip.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value as ReissueReason)}
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {REISSUE_REASON_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="New delivery note number"
            htmlFor={`dn-${slip.id}`}
            hint="Only if you can read it. The office will confirm it."
          >
            <Input
              id={`dn-${slip.id}`}
              value={dnNumber}
              onChange={(e) => setDnNumber(e.target.value)}
              data-numeric
            />
          </Field>
        </div>

        <Field
          label="Remarks"
          htmlFor={`note-${slip.id}`}
          required={needsNote}
          className="mt-3"
          hint={needsNote ? 'Required when you choose Other.' : 'Anything the office should know.'}
        >
          <Textarea
            id={`note-${slip.id}`}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. The first sheet blew away while loading"
          />
        </Field>

        <div className="mt-3">
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-control border border-line bg-surface text-tiny cursor-pointer hover:border-line-strong">
            <Camera className="w-4 h-4 text-ink-faint" />
            {file ? file.name : 'Photograph the new sheet'}
            <input
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {error && <p className="text-micro text-risk mt-3">{error}</p>}

        <div className="flex items-center gap-2 mt-4">
          <Button
            variant="primary"
            size="sm"
            icon={Check}
            disabled={!valid}
            loading={busy}
            onClick={submit}
          >
            Report it
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
