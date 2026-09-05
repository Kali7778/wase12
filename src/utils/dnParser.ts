/**
 * Delivery note text parser — pure functions, no PDF library.
 *
 * Kept free of pdf.js so it can be tested against real delivery note text
 * without a browser (see `npm run test:parser`).
 *
 * Honesty rule (CLAUDE.md): a field counts as parsed only when it also passes
 * validation. Presence alone is not enough — an earlier version happily
 * reported 100% confidence while it had captured the footer phone number as
 * the item number. Confidence here is the share of required fields that both
 * matched AND validated.
 *
 * Layout note: pdf.js emits text in draw order, not visual order. The page
 * footer therefore appears BEFORE the header, and every Arabic label follows
 * its English value. Both facts shape the patterns below.
 */

export interface ExtractedDn {
  dnNumber: string;
  soNumber: string;
  customerNumber: string;
  customerName: string;
  shippingReference: string;
  shipFrom: string;
  shipTo: string;
  salesman: string;
  printDate: string;
  orderDate: string;
  itemNumber: string;
  itemDescription: string;
  uom: string;
  pdfQty: number | null;
  /** Required fields that are missing or failed validation. */
  needsReview: string[];
  /** Share of required fields that parsed AND validated, 0-100. */
  confidence: number;
  /** Raw text, kept so a failed parse can be diagnosed. */
  rawText: string;
}

/**
 * Fields that must be correct before a slip can be saved.
 *
 * `customerName` is deliberately excluded: pdf.js returns the Arabic in
 * reversed word order and in presentation forms, so the captured string does
 * not round-trip. The customer is identified by `customerNumber` instead.
 * `shipTo` is excluded because it is genuinely blank on these delivery notes.
 */
const REQUIRED_FIELDS = [
  'dnNumber',
  'soNumber',
  'customerNumber',
  'printDate',
  'orderDate',
  'itemNumber',
  'itemDescription',
  'uom',
  'pdfQty',
] as const;

const KNOWN_UOM = ['BAG', 'BAGS', 'TON', 'TONS', 'KG', 'PCS', 'EA', 'UNIT'];

/** Any Arabic character — used as the terminator for an English value. */
const ARABIC = '\\u0600-\\u06FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF';

const isDigits = (min: number, max: number) => (v: string) =>
  new RegExp(`^\\d{${min},${max}}$`).test(v);

const isIsoDate = (v: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100;
};

const VALIDATORS: Record<string, (value: unknown) => boolean> = {
  dnNumber: (v) => typeof v === 'string' && isDigits(8, 14)(v),
  soNumber: (v) => typeof v === 'string' && isDigits(8, 14)(v),
  customerNumber: (v) => typeof v === 'string' && isDigits(4, 14)(v),
  printDate: (v) => typeof v === 'string' && isIsoDate(v),
  orderDate: (v) => typeof v === 'string' && isIsoDate(v),
  itemNumber: (v) => typeof v === 'string' && isDigits(6, 14)(v),
  itemDescription: (v) => typeof v === 'string' && /^[A-Za-z]/.test(v) && v.length >= 3 && v.length <= 80,
  uom: (v) => typeof v === 'string' && KNOWN_UOM.includes(v),
  pdfQty: (v) => typeof v === 'number' && Number.isFinite(v) && v > 0,
};

/** Collapses the whitespace pdf.js emits between positioned text runs. */
function normalise(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function matchOne(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const found = text.match(pattern);
    if (found?.[1]) return found[1].trim();
  }
  return '';
}

/**
 * Finds the line item row.
 *
 * Anchored after the `QTY` column header, because the page footer — which
 * contains 10-digit phone numbers — is emitted before the table and would
 * otherwise be captured as the item number.
 */
function findItemRow(text: string): { number: string; description: string; uom: string; qty: number | null } {
  const headerAt = text.search(/\bQTY\b/i);
  const region = headerAt >= 0 ? text.slice(headerAt) : text;

  const row = region.match(
    new RegExp(
      `(\\d{6,14})\\s+([A-Za-z][A-Za-z0-9 ,.'&/()\\-]{2,79}?)\\s+(${KNOWN_UOM.join('|')})\\s+([\\d,]+(?:\\.\\d+)?)`,
      'i',
    ),
  );
  if (!row) return { number: '', description: '', uom: '', qty: null };

  const qty = Number(row[4].replace(/,/g, ''));
  return {
    number: row[1],
    description: row[2].trim(),
    uom: row[3].toUpperCase(),
    qty: Number.isFinite(qty) ? qty : null,
  };
}

export function parseDeliveryNote(rawText: string): ExtractedDn {
  const text = normalise(rawText);

  // English values run until the next Arabic label or the next English label.
  const untilArabic = (label: string, extra = '') =>
    new RegExp(`${label}\\s*:?\\s*([A-Za-z0-9][^${ARABIC}]{1,60}?)\\s*(?=[${ARABIC}]${extra})`, 'i');

  const item = findItemRow(text);

  const extracted = {
    dnNumber: matchOne(text, [/Delivery\s*NO\.?\s*:?\s*(\d{8,14})/i]),
    soNumber: matchOne(text, [/SO\s*NO\.?\s*:?\s*(\d{8,14})/i]),
    customerNumber: matchOne(text, [/Customer\s*NO\.?\s*:?\s*(\d{4,14})/i]),
    // Lossy: reversed word order and presentation forms. Informational only.
    customerName: matchOne(text, [new RegExp(`Customer\\s*Name\\.?\\s*([${ARABIC}\\s]{6,60}?)\\s*(?=Print\\s*Date)`, 'i')]),
    shippingReference: matchOne(text, [untilArabic('Shipping\\s*Reference')]),
    shipFrom: matchOne(text, [untilArabic('Ship\\s*From')]),
    shipTo: matchOne(text, [untilArabic('Ship\\s*To')]),
    salesman: matchOne(text, [untilArabic('Salesman')]),
    printDate: matchOne(text, [/Print\s*Date\s*:?\s*(\d{4}-\d{2}-\d{2})/i]),
    orderDate: matchOne(text, [/Order\s*Date\s*:?\s*(\d{4}-\d{2}-\d{2})/i]),
    itemNumber: item.number,
    itemDescription: item.description,
    uom: item.uom,
    pdfQty: item.qty,
  };

  const needsReview = REQUIRED_FIELDS.filter((field) => !VALIDATORS[field](extracted[field]));

  const confidence = Math.round(
    ((REQUIRED_FIELDS.length - needsReview.length) / REQUIRED_FIELDS.length) * 100,
  );

  return { ...extracted, needsReview, confidence, rawText };
}

/** Human-readable field names for the review warnings shown on a card. */
export const FIELD_LABEL: Record<string, string> = {
  dnNumber: 'Delivery No',
  soNumber: 'SO No',
  customerNumber: 'Customer No',
  customerName: 'Customer Name',
  shippingReference: 'Shipping Reference',
  shipFrom: 'Ship From',
  shipTo: 'Ship To',
  salesman: 'Salesman',
  printDate: 'Print Date',
  orderDate: 'Order Date',
  itemNumber: 'Item Number',
  itemDescription: 'Item Description',
  uom: 'UOM',
  pdfQty: 'Quantity',
};

export const REQUIRED_DN_FIELDS: readonly string[] = REQUIRED_FIELDS;

/** Re-validates after the user has edited a card by hand. */
export function revalidate(dn: ExtractedDn): ExtractedDn {
  const needsReview = REQUIRED_FIELDS.filter(
    (field) => !VALIDATORS[field](dn[field as keyof ExtractedDn]),
  );
  return {
    ...dn,
    needsReview,
    confidence: Math.round(
      ((REQUIRED_FIELDS.length - needsReview.length) / REQUIRED_FIELDS.length) * 100,
    ),
  };
}

export function emptyExtraction(rawText = ''): ExtractedDn {
  return {
    dnNumber: '',
    soNumber: '',
    customerNumber: '',
    customerName: '',
    shippingReference: '',
    shipFrom: '',
    shipTo: '',
    salesman: '',
    printDate: '',
    orderDate: '',
    itemNumber: '',
    itemDescription: '',
    uom: '',
    pdfQty: null,
    needsReview: [...REQUIRED_FIELDS],
    confidence: 0,
    rawText,
  };
}
