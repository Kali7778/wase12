import { useCallback, useRef, useState } from 'react';
import { detectFileType, extractPdfText, hashFile, renderPdfThumbnail, type SourceFileType } from '../utils/dnExtractor';
import { emptyExtraction, parseDeliveryNote, revalidate, type ExtractedDn } from '../utils/dnParser';
import { deliveryNoteService, uploadBatchService } from '../services/DeliveryNoteService';
import type { DuplicateMatch } from '../models/deliveryNote';

export type StagedStatus = 'parsing' | 'ready' | 'saving' | 'saved' | 'error';

export interface StagedSlip {
  /** Local id, valid only while the file sits in the staging area. */
  key: string;
  file: File;
  fileType: SourceFileType;
  sha256: string;
  thumbnail: string | null;
  data: ExtractedDn;
  /** Set when this file, or its delivery note number, was uploaded before. */
  duplicate: DuplicateMatch | null;
  status: StagedStatus;
  error?: string;
  /** Id of the saved delivery note, once it has been written. */
  savedId?: string;
}

let counter = 0;
const nextKey = () => `staged-${Date.now()}-${counter++}`;

/**
 * Staging area for a bulk slip upload.
 *
 * Files are hashed, parsed and duplicate-checked entirely in the browser.
 * Nothing reaches the database until `saveAll()` runs, so the admin can fix
 * anything the parser flagged first.
 */
export function useSlipStaging() {
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
          status: 'parsing',
        });
      }

      if (staged.length === 0) {
        setBusy(false);
        return;
      }
      setSlips((current) => [...current, ...staged]);

      // Parse each file. Only text PDFs can be read automatically; anything
      // else is staged for manual entry rather than pretending to parse it.
      for (const slip of staged) {
        try {
          if (slip.fileType !== 'pdf') {
            update(slip.key, { status: 'ready', data: emptyExtraction() });
            continue;
          }

          const text = await extractPdfText(slip.file);
          const parsed = text.trim() ? parseDeliveryNote(text) : emptyExtraction(text);
          const thumbnail = await renderPdfThumbnail(slip.file);
          update(slip.key, { data: parsed, thumbnail, status: 'ready' });
        } catch (err) {
          update(slip.key, {
            status: 'ready',
            data: emptyExtraction(),
            error: err instanceof Error ? err.message : 'Could not read this file',
          });
        }
      }

      // One round-trip for the whole drop rather than one per file.
      try {
        const hashes = staged.map((s) => s.sha256).filter(Boolean);
        const numbers: string[] = [];
        setSlips((current) => {
          current.forEach((s) => {
            if (staged.some((x) => x.key === s.key) && s.data.dnNumber) numbers.push(s.data.dnNumber);
          });
          return current;
        });

        const matches = await deliveryNoteService.findDuplicates(hashes, numbers);
        if (matches.length) {
          setSlips((current) =>
            current.map((s) => {
              const hit =
                matches.find((m) => m.pdfSha256 && m.pdfSha256 === s.sha256) ??
                matches.find((m) => s.data.dnNumber && m.dnNumber === s.data.dnNumber);
              return hit ? { ...s, duplicate: hit } : s;
            }),
          );
        }
      } catch {
        // A failed duplicate check must not block the upload; the database
        // still rejects a repeated delivery note number on save.
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
          return { ...s, data: revalidate(next as ExtractedDn) };
        }),
      );
    },
    [],
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
      const pending = slips.filter(
        (s) => s.status === 'ready' && s.data.needsReview.length === 0 && !s.duplicate,
      );
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
    [slips, update],
  );

  const readyCount = slips.filter(
    (s) => s.status === 'ready' && s.data.needsReview.length === 0 && !s.duplicate,
  ).length;
  const reviewCount = slips.filter((s) => s.status === 'ready' && s.data.needsReview.length > 0).length;
  const duplicateCount = slips.filter((s) => s.duplicate).length;

  return {
    slips,
    busy,
    addFiles,
    editField,
    remove,
    clearSaved,
    saveAll,
    readyCount,
    reviewCount,
    duplicateCount,
  };
}
