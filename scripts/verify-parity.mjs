/**
 * Data Parity Verification Script
 *
 * Compares local JSON files (canonical source) against Supabase tables.
 * Exits 0 if all counts match, 1 if any mismatch found.
 *
 * Usage:
 *   node scripts/verify-parity.mjs
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY env vars.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing environment variables.');
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function loadJSON(relativePath) {
  const fullPath = resolve(__dirname, '..', relativePath);
  return JSON.parse(readFileSync(fullPath, 'utf-8'));
}

async function verifyTable({ label, jsonPath, tableName, jsonKeyExtractor, supabaseKeyColumn }) {
  const jsonData = loadJSON(jsonPath);
  const jsonCount = jsonData.length;
  const jsonKeys = new Set(jsonData.map(jsonKeyExtractor));

  const { count: supabaseCount, error: countError } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error(`  ERROR querying ${tableName}:`, countError.message);
    return { label, jsonCount, supabaseCount: -1, match: false, keyDiff: ['query error'] };
  }

  const result = { label, jsonCount, supabaseCount, match: jsonCount === supabaseCount, keyDiff: [] };

  // Key-level diff (only for tables with a meaningful key)
  if (supabaseKeyColumn) {
    const { data: rows, error: fetchError } = await supabase
      .from(tableName)
      .select(supabaseKeyColumn);

    if (fetchError) {
      result.keyDiff = ['key fetch error: ' + fetchError.message];
    } else {
      const supabaseKeys = new Set(rows.map((r) => r[supabaseKeyColumn]));

      for (const key of jsonKeys) {
        if (!supabaseKeys.has(key)) {
          result.keyDiff.push(`in JSON but not Supabase: ${key}`);
        }
      }
      for (const key of supabaseKeys) {
        if (!jsonKeys.has(key)) {
          result.keyDiff.push(`in Supabase but not JSON: ${key}`);
        }
      }
    }
  }

  return result;
}

async function findOrphanMappings() {
  const mappings = loadJSON('src/data/containerMappings.json');
  const series = loadJSON('src/data/priceListSeries.json');

  const seriesCodes = new Set(series.map((s) => s.seriesCode));
  const orphans = [];

  for (const m of mappings) {
    // Check if any price list series starts with this mapping's series code
    const hasMatch = [...seriesCodes].some(
      (sc) => sc === m.seriesCode || sc.startsWith(m.seriesCode)
    );
    if (!hasMatch) {
      orphans.push(`${m.seriesCode} (${m.category})`);
    }
  }

  return orphans;
}

async function main() {
  console.log('=== Data Parity Report ===\n');

  const tables = [
    {
      label: 'price_list_series',
      jsonPath: 'src/data/priceListSeries.json',
      tableName: 'price_list_series',
      jsonKeyExtractor: (s) => s.seriesCode,
      supabaseKeyColumn: 'series_code',
    },
    {
      label: 'container_mappings',
      jsonPath: 'src/data/containerMappings.json',
      tableName: 'container_mappings',
      jsonKeyExtractor: (c) => c.seriesCode,
      supabaseKeyColumn: 'series_code',
    },
    {
      label: 'telematics_packages',
      jsonPath: 'src/data/telematicsPackages.json',
      tableName: 'telematics_packages',
      jsonKeyExtractor: (t) => t.name,
      supabaseKeyColumn: null, // UUIDs differ, skip key check
    },
  ];

  let allMatch = true;

  for (const cfg of tables) {
    const result = await verifyTable(cfg);

    const statusIcon = result.match ? 'MATCH ✓' : 'MISMATCH ✗';
    if (!result.match) allMatch = false;

    console.log(`${result.label}:`);
    console.log(`  JSON count:     ${result.jsonCount}`);
    console.log(`  Supabase count: ${result.supabaseCount}`);
    console.log(`  Status:         ${statusIcon}`);
    if (result.keyDiff.length > 0) {
      console.log(`  Key diff:       ${result.keyDiff.join(', ')}`);
    } else if (cfg.supabaseKeyColumn) {
      console.log(`  Key diff:       (none)`);
    }
    console.log('');
  }

  // Settings check
  console.log('settings:');
  const { data: settingsData } = await supabase.from('settings').select('*');
  const settingsCount = settingsData?.length || 0;
  console.log(`  Expected:       9`);
  console.log(`  Supabase count: ${settingsCount}`);
  console.log(`  Status:         ${settingsCount >= 9 ? 'OK ✓' : 'LOW ⚠'}`);
  console.log('');

  // Orphan mappings
  const orphans = await findOrphanMappings();
  if (orphans.length > 0) {
    console.log('Orphan mappings (container mapping with no price list series):');
    for (const o of orphans) {
      console.log(`  - ${o} — no matching price_list_series entry`);
    }
  } else {
    console.log('Orphan mappings: none');
  }
  console.log('');

  // Final verdict
  const orphanNote = orphans.length > 0 ? `, ${orphans.length} orphan(s) noted` : '';
  if (allMatch) {
    console.log(`=== RESULT: PASS (all counts match${orphanNote}) ===`);
    process.exit(0);
  } else {
    console.log(`=== RESULT: FAIL (count mismatch detected${orphanNote}) ===`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
