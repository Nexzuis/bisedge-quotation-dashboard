/**
 * merge-notes-from-excel.cjs
 *
 * Extracts TEXT1 notes (column AL, index 37) from the "Price List EU" sheet
 * and merges them into src/data/priceListSeries.json as `notes` fields on
 * each PriceListOption where a non-empty note exists.
 *
 * Usage:  node scripts/merge-notes-from-excel.cjs [optional-path-to-xlsm]
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// --- Paths ---
const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'src', 'data', 'priceListSeries.json');

const DEFAULT_EXCEL = path.resolve(
  ROOT,
  '..',
  'Copy of 20260130 - Master Costing Sheet (2026) - v3 (password protected).xlsm'
);

const excelPath = process.argv[2] || DEFAULT_EXCEL;

// --- Read Excel ---
if (!fs.existsSync(excelPath)) {
  console.error(`Excel file not found: ${excelPath}`);
  process.exit(1);
}

console.log(`Reading Excel: ${excelPath}`);
const wb = XLSX.readFile(excelPath, { type: 'file' });

const sheetName = 'Price List EU';
const ws = wb.Sheets[sheetName];
if (!ws) {
  console.error(`Sheet "${sheetName}" not found. Available sheets: ${wb.SheetNames.join(', ')}`);
  process.exit(1);
}

// --- Build lookup: materialNumber → TEXT1 ---
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
const lookup = new Map();
let skipped = 0;

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const rawMat = row[0]; // Column A — material number
  const rawNote = row[37]; // Column AL — TEXT1

  if (rawMat == null || rawMat === '') continue;

  const materialNumber = String(rawMat).trim();
  const note = String(rawNote ?? '').trim();

  if (note === '') {
    skipped++;
    continue;
  }

  lookup.set(materialNumber, note);
}

console.log(`Built lookup: ${lookup.size} material numbers with notes (${skipped} empty/skipped)`);

// --- Read existing JSON ---
const series = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

// --- Merge notes ---
let merged = 0;
let notFound = 0;

for (const s of series) {
  for (const opt of s.options) {
    const note = lookup.get(opt.materialNumber);
    if (note) {
      opt.notes = note;
      merged++;
    }
  }
}

console.log(`Merged ${merged} notes into priceListSeries.json`);

// --- Write back ---
fs.writeFileSync(JSON_PATH, JSON.stringify(series, null, 2) + '\n', 'utf-8');
console.log(`Written updated JSON to ${JSON_PATH}`);
