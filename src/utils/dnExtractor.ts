import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/**
 * Delivery note extraction.
 *
 * Text is pulled out of the PDF in the browser — the file never leaves the
 * machine during parsing — and matched against the El-Khayyat delivery note
 * layout.
 *
 * Honesty rule (CLAUDE.md): confidence is computed from the fields that
 * actually matched. Nothing is invented, and anything that fails to parse is
 * reported in `needsReview` so the user can correct it before saving.
 */

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type SourceFileType = 'pdf' | 'image' | 'doc' | 'other';

export function detectFileType(file: File): SourceFileType {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (file.type.startsWith('image/')) return 'image';
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'doc';
  return 'other';
}

/** Real SHA-256 of the file bytes, used to detect a re-uploaded slip. */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Extracts the text layer of a PDF. Returns '' for scanned PDFs with no text. */
export async function extractPdfText(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data });
  const doc = await task.promise;

  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' '),
      );
    }
    return pages.join('\n');
  } finally {
    await task.destroy();
  }
}

/** Renders page 1 to a data URL for the card thumbnail. */
export async function renderPdfThumbnail(file: File, width = 320): Promise<string | null> {
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const task = pdfjs.getDocument({ data });
  const doc = await task.promise;
    try {
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: width / base.width });

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) return null;

      await page.render({ canvas, canvasContext: context, viewport }).promise;
      return canvas.toDataURL('image/png');
    } finally {
      await task.destroy();
    }
  } catch {
    return null;
  }
}

