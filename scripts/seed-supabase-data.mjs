/**
 * Seed Supabase with price list, telematics, and container data
 * from local JSON files (the original spreadsheet-derived data).
 *
 * Usage:
 *   node scripts/seed-supabase-data.mjs
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY
 * as environment variables (or hardcode below for one-time use).
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- CONFIG ---
// Use service_role key to bypass RLS for seeding
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing environment variables.');
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Example:');
  console.error('  VITE_SUPABASE_URL=https://xxx.supabase.co VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/seed-supabase-data.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- HELPERS ---
function loadJSON(relativePath) {
  const fullPath = resolve(__dirname, '..', relativePath);
  return JSON.parse(readFileSync(fullPath, 'utf-8'));
}

async function upsertChunked(table, rows, chunkSize, conflictColumn) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict: conflictColumn });

    if (error) {
      console.error(`  ERROR on ${table} chunk ${i}-${i + chunk.length}:`, error.message);
      throw error;
    }
    inserted += chunk.length;
    process.stdout.write(`  ${table}: ${inserted}/${rows.length}\r`);
  }
  console.log(`  ${table}: ${inserted}/${rows.length} done`);
}

// --- SEED FUNCTIONS ---

async function seedPriceListSeries() {
  console.log('\n1. Seeding price_list_series (81 series)...');

  const data = loadJSON('src/data/priceListSeries.json');

  const rows = data.map((s) => ({
    series_code: s.seriesCode,
    series_name: s.seriesName,
    models: JSON.stringify(s.models),
    options: JSON.stringify(s.options),
  }));

  // Chunk by 5 because each row has large JSONB payloads
  await upsertChunked('price_list_series', rows, 5, 'series_code');
}

async function seedTelematicsPackages() {
  console.log('\n2. Seeding telematics_packages (15 packages)...');

  const data = loadJSON('src/data/telematicsPackages.json');

  // Omit id — Supabase table uses UUID with default gen_random_uuid()
  // The local JSON has string ids like "tel-1" which aren't valid UUIDs
  const rows = data.map((t) => ({
    name: t.name,
    description: t.description || '',
    tags: t.tags || '',
    cost_zar: t.costZAR,
  }));

  // Delete existing first, then insert fresh
  const { error: delError } = await supabase.from('telematics_packages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delError) {
    console.log('  Note: delete returned:', delError.message);
  }

  // Insert in one go (only 15 rows) — let Supabase generate UUIDs
  const { error } = await supabase.from('telematics_packages').insert(rows);
  if (error) {
    console.error('  ERROR seeding telematics_packages:', error.message);
    throw error;
  }
  console.log(`  telematics_packages: ${rows.length} done`);
}

async function seedContainerMappings() {
  console.log('\n3. Seeding container_mappings (48 mappings)...');

  const data = loadJSON('src/data/containerMappings.json');

  const rows = data.map((c) => ({
    series_code: c.seriesCode,
    category: c.category || '',
    model: c.model || '',
    qty_per_container: c.qtyPerContainer,
    container_type: c.containerType,
    container_cost_eur: c.containerCostEUR,
    notes: c.notes || '',
  }));

  // Delete existing and re-insert (serial PK, no natural conflict column)
  await supabase.from('container_mappings').delete().neq('id', 0);

  const { error } = await supabase.from('container_mappings').insert(rows);
  if (error) {
    console.error('  ERROR seeding container_mappings:', error.message);
    throw error;
  }
  console.log(`  container_mappings: ${rows.length} done`);
}

async function seedSettings() {
  console.log('\n4. Seeding settings (9 default values)...');

  const defaults = [
    { key: 'defaultFactoryROE', value: '19.73' },
    { key: 'defaultROE', value: '19.73' },
    { key: 'defaultDiscountPct', value: '66' },
    { key: 'defaultInterestRate', value: '9.5' },
    { key: 'defaultCPIRate', value: '5.5' },
    { key: 'defaultOperatingHours', value: '180' },
    { key: 'defaultLeaseTerm', value: '60' },
    { key: 'defaultTelematicsCost', value: '250' },
    { key: 'defaultResidualTruckPct', value: '15' },
  ];

  const { error } = await supabase
    .from('settings')
    .upsert(defaults, { onConflict: 'key' });

  if (error) {
    console.error('  ERROR seeding settings:', error.message);
    throw error;
  }
  console.log(`  settings: ${defaults.length} done`);
}

// --- MAIN ---
async function main() {
  console.log('=== Supabase Data Seed ===');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log('');

  // Verify connection
  const { data, error } = await supabase.from('price_list_series').select('series_code', { count: 'exact', head: true });
  if (error) {
    console.error('Connection failed:', error.message);
    process.exit(1);
  }
  console.log('Connection OK');

  await seedPriceListSeries();
  await seedTelematicsPackages();
  await seedContainerMappings();
  await seedSettings();

  // Verify counts
  console.log('\n=== Verification ===');
  const { count: seriesCount } = await supabase.from('price_list_series').select('*', { count: 'exact', head: true });
  const { count: telCount } = await supabase.from('telematics_packages').select('*', { count: 'exact', head: true });
  const { count: contCount } = await supabase.from('container_mappings').select('*', { count: 'exact', head: true });
  const { data: settingsData } = await supabase.from('settings').select('*');

  console.log(`  price_list_series:  ${seriesCount} rows`);
  console.log(`  telematics_packages: ${telCount} rows`);
  console.log(`  container_mappings:  ${contCount} rows`);
  console.log(`  settings:            ${settingsData?.length || 0} rows`);
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
