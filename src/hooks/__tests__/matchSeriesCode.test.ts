import { describe, it, expect } from 'vitest';
import { matchSeriesCode } from '../usePriceList';

// Simulate raw Supabase rows (snake_case)
const MAPPINGS = [
  { series_code: '386', category: 'E Counterbalance', model: 'All', qty_per_container: 6, container_type: "40' standard", container_cost_eur: 3300, notes: '' },
  { series_code: '1275', category: 'E Counterbalance', model: 'All', qty_per_container: 4, container_type: "40' standard", container_cost_eur: 3300, notes: '' },
  { series_code: '5021', category: 'IC Counterbalance', model: 'All', qty_per_container: 2, container_type: "40' standard", container_cost_eur: 3300, notes: '' },
  { series_code: '5213', category: 'VNA', model: 'All', qty_per_container: 1, container_type: "40' standard", container_cost_eur: 3300, notes: '' },
];

describe('matchSeriesCode', () => {
  it('exact match: "1275" finds mapping "1275"', () => {
    const result = matchSeriesCode('1275', MAPPINGS);
    expect(result).not.toBeNull();
    expect(result!.series_code).toBe('1275');
  });

  it('prefix match: "12750000000" finds mapping "1275"', () => {
    const result = matchSeriesCode('12750000000', MAPPINGS);
    expect(result).not.toBeNull();
    expect(result!.series_code).toBe('1275');
  });

  it('prefix match: "38600000000" finds mapping "386"', () => {
    const result = matchSeriesCode('38600000000', MAPPINGS);
    expect(result).not.toBeNull();
    expect(result!.series_code).toBe('386');
  });

  it('trailing-zero regex match: "50210000002" finds mapping "5021"', () => {
    const result = matchSeriesCode('50210000002', MAPPINGS);
    expect(result).not.toBeNull();
    expect(result!.series_code).toBe('5021');
  });

  it('no match returns null', () => {
    const result = matchSeriesCode('99990000000', MAPPINGS);
    expect(result).toBeNull();
  });

  it('empty seriesCode returns null', () => {
    const result = matchSeriesCode('', MAPPINGS);
    expect(result).toBeNull();
  });

  it('empty mappings returns null', () => {
    const result = matchSeriesCode('1275', []);
    expect(result).toBeNull();
  });

  it('handles short code "5213" (orphan mapping — still matches structurally)', () => {
    const result = matchSeriesCode('5213', MAPPINGS);
    expect(result).not.toBeNull();
    expect(result!.series_code).toBe('5213');
  });
});
