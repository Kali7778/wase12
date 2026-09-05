import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Approval stamp for delivery notes.
 *
 * Produces a COPY of the supplier's PDF carrying the handover details. The
 * original is never modified: it is the supplier's document and the only
 * evidence of what was actually dispatched. Once overwritten there is no way
 * to show later what the slip said before the company wrote on it.
 *
 * The stamp is drawn on every page so it cannot be lost by separating them.
 */

export interface StampDetails {
  /** Name of the GM who approved the slip. */
  approvedBy: string;
  /** Name of the driver the slip was handed to. */
  grantedTo: string;
  /** Delivery note number, printed for cross-reference. */
  dnNumber: string;
  /** Defaults to now. */
  at?: Date;
}

const INK = rgb(0.09, 0.32, 0.24);
const INK_SOFT = rgb(0.3, 0.4, 0.38);
const FILL = rgb(0.93, 0.98, 0.95);

function formatStampTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return (
    `${pad(date.getDate())} ${months[date.getMonth()]} ${date.getFullYear()} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Returns a new PDF: the original with an approval stamp added.
 *
 * @throws when the file cannot be read as a PDF — the caller should then hand
 *         over the unstamped original rather than nothing.
 */
export async function stampDeliveryNote(
  source: ArrayBuffer | Uint8Array,
  details: StampDetails,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(source);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  const at = details.at ?? new Date();
  const stampedAt = formatStampTime(at);

  const lines: Array<{ label: string; value: string }> = [
    { label: 'Approved by GM', value: details.approvedBy },
    { label: 'Granted to Driver', value: details.grantedTo },
    { label: 'Date & Time', value: stampedAt },
  ];

  for (const page of pdf.getPages()) {
    const { width } = page.getSize();

    const boxWidth = 232;
    const boxHeight = 78;
    const x = width - boxWidth - 24;
    const y = 24;

    page.drawRectangle({
      x,
      y,
      width: boxWidth,
      height: boxHeight,
      color: FILL,
      borderColor: INK,
      borderWidth: 1.2,
      opacity: 0.94,
      borderOpacity: 0.9,
    });

    page.drawText('APPROVED FOR DISPATCH', {
      x: x + 10,
      y: y + boxHeight - 16,
      size: 8.5,
      font: bold,
      color: INK,
    });

    page.drawText(`DN ${details.dnNumber}`, {
      x: x + 10,
      y: y + boxHeight - 27,
      size: 7,
      font: regular,
      color: INK_SOFT,
    });

    lines.forEach((line, index) => {
      const lineY = y + boxHeight - 41 - index * 11;
      page.drawText(`${line.label}:`, {
        x: x + 10,
        y: lineY,
        size: 7,
        font: regular,
        color: INK_SOFT,
      });
      page.drawText(line.value, {
        x: x + 84,
        y: lineY,
        size: 7.5,
        font: bold,
        color: INK,
      });
    });
  }

  return pdf.save();
}

/** Storage path for the stamped copy, kept next to the original. */
export function stampedPathFor(originalPath: string): string {
  const dot = originalPath.lastIndexOf('.');
  return dot === -1
    ? `${originalPath}_stamped.pdf`
    : `${originalPath.slice(0, dot)}_stamped${originalPath.slice(dot)}`;
}
