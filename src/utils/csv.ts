/**
 * CSV export.
 *
 * Two things this gets right that a naive `join(',')` does not:
 *
 * 1. Quoting. Item descriptions carry commas and the odd quote mark; without
 *    escaping, one such row silently shifts every column after it.
 *
 * 2. Formula injection. A cell beginning with `=`, `+`, `-`, `@`, or a tab or
 *    carriage return is treated as a formula by Excel and other spreadsheets,
 *    which will happily run it when the file is opened. The values here come
 *    from the supplier's own PDFs, so they are not ours to trust. Prefixing a
 *    single quote makes the spreadsheet treat the cell as text.
 */

const RISKY_LEAD = /^[=+\-@\t\r]/;

/**
 * A plain number, sign and exponent included.
 *
 * This matters: `Missing Qty` is negative when more arrived than the delivery
 * note claimed, and treating `-20` as a formula would export the client's most
 * important column as text that no spreadsheet will add up.
 */
const PLAIN_NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';

  let text = String(value);
  if (RISKY_LEAD.test(text) && !PLAIN_NUMBER.test(text)) text = `'${text}`;

  // Quote whenever the cell could otherwise break the row, and double any
  // quote already inside it — that is how CSV escapes a quote.
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;

  return text;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

/** Builds CSV text with a UTF-8 BOM so Excel reads Arabic names correctly. */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines = [
    columns.map((c) => escapeCell(c.header)).join(','),
    ...rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(',')),
  ];

  return '﻿' + lines.join('\r\n');
}

/** Offers the text to the browser as a file download. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
