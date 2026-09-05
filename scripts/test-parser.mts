/**
 * Regression test for the delivery note parser.
 *
 * Runs the real parser over the client's reference delivery notes using the
 * same pdf.js text path the browser uses, then checks a few negative cases so
 * a bug that reports false confidence cannot slip through again.
 *
 *   npm run test:parser
 *
 * Point DN_SAMPLES at the folder of reference PDFs (defaults to the path used
 * during development). Missing folder = the PDF checks are skipped, not failed.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseDeliveryNote } from '../src/utils/dnParser.ts';

const DIR = process.env.DN_SAMPLES ?? 'E:/Projects/logi/Refrence PDfs';

let failures = 0;
const check = (ok: boolean, label: string, detail = '') => {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

async function pdfText(path: string): Promise<string> {
  const task = pdfjs.getDocument({ data: new Uint8Array(readFileSync(path)) });
  const doc = await task.promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((it) => ('str' in it ? it.str : '')).join(' '));
  }
  await task.destroy();
  return pages.join('\n');
}

console.log('\nNegative cases (confidence must NOT be high)');
for (const [label, text] of [
  ['empty text', ''],
  ['unrelated text', 'This is an invoice for office supplies. Total 450 SAR.'],
  ['footer only', '0126633337 0126651039 6507 Andalus, Jeddah 23322, KSA VAT NO. 300696451500003'],
] as const) {
  const r = parseDeliveryNote(text);
  check(r.confidence < 50, `${label}: confidence ${r.confidence}%`, `${r.needsReview.length} field(s) need review`);
}

if (!existsSync(DIR)) {
  console.log(`\nSample folder not found (${DIR}) — skipping PDF checks.`);
} else {
  const files = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
  console.log(`\nReference delivery notes (${files.length} files)`);
  let clean = 0;

  for (const file of files) {
    const r = parseDeliveryNote(await pdfText(join(DIR, file)));
    const ok =
      r.needsReview.length === 0 &&
      /^\d{8,14}$/.test(r.dnNumber) &&
      /^\d{8,14}$/.test(r.soNumber) &&
      // The item number must come from the table, never from the footer phone number.
      r.itemNumber.startsWith('129') &&
      /^[A-Za-z]/.test(r.itemDescription) &&
      (r.pdfQty ?? 0) > 0;
    if (ok) clean++;
    else check(false, file, `item=${r.itemNumber} desc="${r.itemDescription.slice(0, 30)}" conf=${r.confidence}%`);
  }
  check(clean === files.length, `${clean}/${files.length} delivery notes parsed and validated`);
}

console.log(failures === 0 ? '\nAll parser checks passed.\n' : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
