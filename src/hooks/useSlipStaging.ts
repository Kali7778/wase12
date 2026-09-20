import { useCallback, useRef, useState } from 'react';
import { detectFileType, extractPdfText, hashFile, renderPdfThumbnail, type SourceFileType } from '../utils/dnExtractor';
import { emptyExtraction, parseDeliveryNote, revalidate, type ExtractedDn } from '../utils/dnParser';
import { deliveryNoteService, uploadBatchService } from '../services/DeliveryNoteService';
import type { DuplicateMatch, PossibleOriginal, ReissueReason } from '../models/deliveryNote';

export type StagedStatus = 'parsing' | 'ready' | 'saving' | 'saved' | 'error';

/** What the uploader said about "is this a replacement?". */
export interface ReissueAnswer {
  answered: boolean;
  isReplacement: boolean;
  originalId: string;
  reason: ReissueReason | '';
  note: string;
}

const NO_REISSUE: ReissueAnswer = {
  answered: false,
  isReplacement: false,
  originalId: '',
  reason: '',
  note: '',
};

export interface StagedSlip {
  /** Local id, valid only while the file sits in the staging area. */
  key: string;
  file: File;
  fileType: SourceFileType;
  sha256: string;
  thumbnail: string | null;
  data: ExtractedDn;
  /** Set when this file, or its delivery note number, was uploaded before. Never saveable. */
  duplicate: DuplicateMatch | null;
  /**
   * Set when the sales order number is already on another delivery note.
   * Saveable only by an admin, with a reason (decision D35).
   */
  soConflict: DuplicateMatch | null;
  soOverrideReason: string;
  /**
   * Slips this one could be replacing (D33). The supplier reprints a lost
   * sheet with new numbers, so nothing here can tell on its own; when the
   * database finds a still-expected slip for the same goods, the card has
   * to ask rather than hope somebody remembers to say so.
   */
  possibleOriginals: PossibleOriginal[];
  reissue: ReissueAnswer;
  status: StagedStatus;
  error?: string;
  /** Id of the saved delivery note, once it has been written. */
  savedId?: string;
}

let counter = 0;
const nextKey = () => `staged-${Date.now()}-${counter++}`;

/**
 * Whether a staged slip can be written. One definition, used for both the
 * button's count and the save itself, so the two can never disagree.
 */
/** A replacement is only complete with an original, a reason and — for
 *  "other" — a sentence saying what happened (D32, D48). */
const reissueComplete = (r: ReissueAnswer) =>
  r.originalId !== '' && r.reason !== '' && (r.reason !== 'other' || r.note.trim() !== '');

const isSaveable = (s: StagedSlip, canOverrideSo: boolean) =>
  s.status === 'ready' &&
  s.data.needsReview.length === 0 &&
  !s.duplicate &&
  (!s.soConflict || (canOverrideSo && s.soOverrideReason.trim() !== '')) &&
  // A slip the system suspects is a replacement cannot be filed until
  // somebody says one way or the other.
  (s.possibleOriginals.length === 0 || s.reissue.answered) &&
  (!s.reissue.isReplacement || reissueComplete(s.reissue));

/**
 * Staging area for a bulk slip upload.
 *
 * Files are hashed, parsed and duplicate-checked entirely in the browser.
 * Nothing reaches the database until `saveAll()` runs, so the admin can fix
 * anything the parser flagged first.
 */
export function useSlipStaging({ canOverrideSo }: { canOverrideSo: boolean }) {
  const [slips, setSlips] = useState<StagedSlip[]>([]);
  const [busy, setBusy] = useState(false);
  const seen = useRef(new Set<string>());

  const update = useCallback((key: string, patch: Partial<StagedSlip>) => {
    setSlips((current) => current.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }, []);

  /** Reads, parses and thumbnails the dropped files, then checks for duplicates. */
  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setBusy(true);

      const staged: StagedSlip[] = [];
      for (const file of files) {
        const fileType = detectFileType(file);
        let sha256 = '';
        try {
          sha256 = await hashFile(file);
        } catch {
          sha256 = '';
        }

        // Skip a file already sitting in the staging area.
        if (sha256 && seen.current.has(sha256)) continue;
        if (sha256) seen.current.add(sha256);

        staged.push({
          key: nextKey(),
          file,
          fileType,
          sha256,
          thumbnail: null,
          data: emptyExtraction(),
          duplicate: null,
          soConflict: null,
          soOverrideReason: '',
          possibleOriginals: [],
          reissue: NO_REISSUE,
          status: 'parsing',
        });
      }

      if (staged.length === 0) {
        setBusy(false);
        return;
      }
      setSlips((current) => [...current, ...staged]);

      // What each file was read as, kept here as well as in state. State
      // updates are applied on the next render, so reading them back from a
      // `setSlips` callback below returned nothing: the delivery note number
      // was never sent to the duplicate check, and only an identical file was
      // ever caught before saving.
      const parsedByKey = new Map<string, ExtractedDn>();

      // Parse each file. Only text PDFs can be read automatically; anything
      // else is staged for manual entry rather than pretending to parse it.
      for (const slip of staged) {
        try {
          if (slip.fileType !== 'pdf') {
            const data = emptyExtraction();
            parsedByKey.set(slip.key, data);
            update(slip.key, { status: 'ready', data });
            continue;
          }

          const text = await extractPdfText(slip.file);
          const parsed = text.trim() ? parseDeliveryNote(text) : emptyExtraction(text);
          parsedByKey.set(slip.key, parsed);
          const thumbnail = await renderPdfThumbnail(slip.file);
          update(slip.key, { data: parsed, thumbnail, status: 'ready' });
        } catch (err) {
          const data = emptyExtraction();
          parsedByKey.set(slip.key, data);
          update(slip.key, {
            status: 'ready',
            data,
            error: err instanceof Error ? err.message : 'Could not read this file',
          });
        }
      }

      // One round-trip for the whole drop rather than one per file.
      try {
        const hashes = staged.map((s) => s.sha256).filter(Boolean);
        const parsed = [...parsedByKey.values()];
        const dnNumbers = parsed.map((d) => d.dnNumber.trim()).filter(Boolean);
        const soNumbers = parsed.map((d) => d.soNumber.trim()).filter(Boolean);

        const matches = await deliveryNoteService.findDuplicates(hashes, dnNumbers, soNumbers);
        if (matches.length) {
          setSlips((current) =>
            current.map((s) => {
              const read = parsedByKey.get(s.key);
              if (!read) return s;
              const dn = read.dnNumber.trim();
              const so = read.soNumber.trim();
              const duplicate =
                matches.find((m) => m.matchedOn === 'file' && m.pdfSha256 === s.sha256) ??
                matches.find((m) => m.matchedOn === 'dn_number' && dn !== '' && m.dnNumber === dn) ??
                null;
              const soConflict =
                matches.find((m) => m.matchedOn === 'so_number' && so !== '' && m.soNumber === so) ??
                null;
              return { ...s, duplicate, soConflict };
            }),
          );
        }
      } catch {
        // A failed duplicate check must not block the upload; the database
        // still rejects a repeated delivery note number on save.
      }

      // Then, for each slip, whether it looks like a replacement.
      for (const slip of staged) {
        const read = parsedByKey.get(slip.key);
        if (!read || !read.itemNumber || !read.pdfQty) continue;
        try {
          const originals = await deliveryNoteService.findPossibleOriginals({
            itemNumber: read.itemNumber,
            pdfQty: read.pdfQty,
            customerNumber: read.customerNumber || null,
          });
          if (originals.length > 0) update(slip.key, { possibleOriginals: originals });
        } catch {
          // Only a prompt. Nothing here decides whether the slip can be saved.
        }
      }

      setBusy(false);
    },
    [update],
  );

  /** Applies an inline edit and revalidates the card. */
  const editField = useCallback(
    (key: string, field: keyof ExtractedDn, value: string) => {
      setSlips((current) =>
        current.map((s) => {
          if (s.key !== key) return s;
          const next =
            field === 'pdfQty'
              ? { ...s.data, pdfQty: value === '' ? null : Number(value) }
              : { ...s.data, [field]: value };
          // A corrected number no longer matches what it matched before. The
          // database checks again on save and gives the same sentence if it
          // still does.
          const duplicate =
            field === 'dnNumber' && s.duplicate?.matchedOn === 'dn_number' ? null : s.duplicate;
          const soConflict = field === 'soNumber' ? null : s.soConflict;
          return { ...s, duplicate, soConflict, data: revalidate(next as ExtractedDn) };
        }),
      );
    },
    [],
  );

  /** Records what the uploader said about this slip being a replacement. */
  const setReissue = useCallback(
    (key: string, patch: Partial<ReissueAnswer>) =>
      setSlips((current) =>
        current.map((s) => (s.key === key ? { ...s, reissue: { ...s.reissue, ...patch } } : s)),
      ),
    [],
  );

  /** Records an admin's reason for accepting a sales order already in use. */
  const setSoOverrideReason = useCallback(
    (key: string, reason: string) => update(key, { soOverrideReason: reason }),
    [update],
  );

  const remove = useCallback((key: string) => {
    setSlips((current) => {
      const target = current.find((s) => s.key === key);
      if (target?.sha256) seen.current.delete(target.sha256);
      return current.filter((s) => s.key !== key);
    });
  }, []);

  const clearSaved = useCallback(() => {
    setSlips((current) => {
      current.filter((s) => s.status === 'saved').forEach((s) => seen.current.delete(s.sha256));
      return current.filter((s) => s.status !== 'saved');
    });
  }, []);

  /**
   * Writes every ready slip to the database.
   *
   * Slips are saved one at a time so that a single bad file does not lose the
   * whole batch; each card reports its own outcome.
   */
  const saveAll = useCallback(
    async (batchDate: string, note?: string): Promise<{ saved: number; failed: number }> => {
      const pending = slips.filter((s) => isSaveable(s, canOverrideSo));
      if (pending.length === 0) return { saved: 0, failed: 0 };

      setBusy(true);
      let saved = 0;
      let failed = 0;

      try {
        const batch = await uploadBatchService.open(batchDate, note);

        for (const slip of pending) {
          update(slip.key, { status: 'saving', error: undefined });
          try {
            let pdfPath: string | undefined;
            try {
              pdfPath = await deliveryNoteService.uploadFile(slip.file, batchDate, slip.data.dnNumber);
            } catch (err) {
              // Record the slip even if the file upload fails; the data matters
              // more than the attachment, and the gap is visible on the card.
              update(slip.key, {
                error: err instanceof Error ? err.message : 'File upload failed',
              });
            }

            const created = await deliveryNoteService.create(
              {
                dnNumber: slip.data.dnNumber,
                soNumber: slip.data.soNumber,
                itemNumber: slip.data.itemNumber,
                itemDescription: slip.data.itemDescription,
                uom: slip.data.uom,
                pdfQty: slip.data.pdfQty ?? 0,
                customerNumber: slip.data.customerNumber,
                customerName: slip.data.customerName,
                shippingReference: slip.data.shippingReference,
                shipFrom: slip.data.shipFrom,
                shipTo: slip.data.shipTo,
                salesman: slip.data.salesman,
                printDate: slip.data.printDate,
                orderDate: slip.data.orderDate,
                needsReview: slip.data.needsReview,
                confidence: slip.data.confidence,
                fileType: slip.fileType,
                extractionMethod: slip.fileType === 'pdf' ? 'pdf_text' : 'manual',
              },
              {
                batchId: batch.id,
                pdfPath,
                pdfFileName: slip.file.name,
                pdfSha256: slip.sha256,
                soOverrideReason: slip.soConflict ? slip.soOverrideReason : undefined,
                replacesDnId: slip.reissue.isReplacement ? slip.reissue.originalId : undefined,
                reissueReason: slip.reissue.isReplacement
                  ? (slip.reissue.reason as ReissueReason)
                  : undefined,
                reissueNote: slip.reissue.isReplacement ? slip.reissue.note : undefined,
              },
            );

            update(slip.key, { status: 'saved', savedId: created.id });
            saved++;
          } catch (err) {
            update(slip.key, {
              status: 'error',
              error: err instanceof Error ? err.message : 'Could not save this slip',
            });
            failed++;
          }
        }
      } catch (err) {
        setBusy(false);
        throw err;
      }

      setBusy(false);
      return { saved, failed };
    },
    [slips, update, canOverrideSo],
  );

  const readyCount = slips.filter((s) => isSaveable(s, canOverrideSo)).length;
  const reviewCount = slips.filter((s) => s.status === 'ready' && s.data.needsReview.length > 0).length;
  const duplicateCount = slips.filter((s) => s.duplicate).length;
  const soConflictCount = slips.filter((s) => !s.duplicate && s.soConflict).length;
  const unansweredReissueCount = slips.filter(
    (s) => s.possibleOriginals.length > 0 && !s.reissue.answered,
  ).length;

  return {
    slips,
    busy,
    addFiles,
    editField,
    setReissue,
    setSoOverrideReason,
    remove,
    clearSaved,
    saveAll,
    readyCount,
    reviewCount,
    duplicateCount,
    soConflictCount,
    unansweredReissueCount,
  };
}
