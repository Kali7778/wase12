import { toCsv } from '../src/utils/csv';

/**
 * CSV export checks.
 *
 * The formula-injection guard has to neutralise a spreadsheet formula without
 * mangling a negative number — `Missing Qty` is negative on an over-delivery,
 * and quoting it as text would break every total built on the export.
 */
interface Case { a: string; b: string | null; c: number }

const rows: Case[] = [
  { a: 'Bags - Special, 40 kg', b: 'he said "ok"', c: 1000 },
  { a: '=SUM(A1:A9)',           b: '+1-800-EVIL',  c: -20 },
  { a: 'line\nbreak',           b: null,           c: 0 },
  { a: '@import',               b: '-cmd|calc',    c: 1.5 },
];

const csv = toCsv(rows, [
  { header: 'Item', value: (r: Case) => r.a },
  { header: 'Note', value: (r: Case) => r.b },
  { header: 'Qty',  value: (r: Case) => r.c },
]);

const lines = csv.split('\r\n');
let pass = 0;
let fail = 0;

const check = (name: string, ok: boolean) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  ok ? pass++ : fail++;
};

check('BOM present so Excel reads Arabic', csv.charCodeAt(0) === 0xfeff);
check('header row is first', lines[0] === '﻿Item,Note,Qty'.slice(1) || lines[0].endsWith('Item,Note,Qty'));
check('comma inside a value is quoted', lines[1].includes('"Bags - Special, 40 kg"'));
check('embedded quote is doubled', lines[1].includes('"he said ""ok"""'));
check('= formula is neutralised', lines[2].startsWith("'=SUM(A1:A9)"));
check('+ formula is neutralised', lines[2].includes("'+1-800-EVIL"));
check('@ formula is neutralised', lines[4].startsWith("'@import"));
check('- formula is neutralised', lines[4].includes("'-cmd|calc"));
check('negative number survives intact', lines[2].endsWith(',-20'));
check('decimal survives intact', lines[4].endsWith(',1.5'));
check('newline inside a value is quoted', csv.includes('"line\nbreak"'));
check('null becomes an empty cell', lines[3].includes(',,'));

console.log(`\n  ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
