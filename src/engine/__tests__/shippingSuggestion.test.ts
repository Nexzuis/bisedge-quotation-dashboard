import { describe, it, expect } from 'vitest';
import {
  generateShippingSuggestion,
  collectMappingNotes,
  computeSuggestionSignature,
  signaturesMatch,
} from '../shippingSuggestion';
import type { ContainerMapping } from '../../types/quote';

// --- Test Data ---

const MAPPING_1275: ContainerMapping = {
  seriesCode: '1275',
  category: 'E Counterbalance',
  model: 'All',
  qtyPerContainer: 4,
  containerType: "40' standard",
  containerCostEUR: 3300,
  notes: '',
};

const MAPPING_386: ContainerMapping = {
  seriesCode: '386',
  category: 'E Counterbalance',
  model: 'All',
  qtyPerContainer: 6,
  containerType: "40' standard",
  containerCostEUR: 3300,
  notes: '* Quantities based on standard spec * Attachments reduce qty',
};

const MAPPING_5021: ContainerMapping = {
  seriesCode: '5021',
  category: 'IC Counterbalance',
  model: 'All',
  qtyPerContainer: 2,
  containerType: "40' standard",
  containerCostEUR: 3300,
  notes: '',
};

const ALL_MAPPINGS = [MAPPING_1275, MAPPING_386, MAPPING_5021];

// --- generateShippingSuggestion Tests ---

describe('generateShippingSuggestion', () => {
  it('returns empty array for empty fleet', () => {
    const result = generateShippingSuggestion({
      activeSlots: [],
      mappings: ALL_MAPPINGS,
      factoryROE: 19.73,
    });
    expect(result).toEqual([]);
  });

  it('generates one entry per series', () => {
    const result = generateShippingSuggestion({
      activeSlots: [
        { seriesCode: '12750000000', quantity: 3 },
        { seriesCode: '38600000000', quantity: 5 },
      ],
      mappings: ALL_MAPPINGS,
      factoryROE: 19.73,
    });
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe('suggested');
    expect(result[1].source).toBe('suggested');
    expect(result[0].seriesCodes).toBeDefined();
    expect(result[1].seriesCodes).toBeDefined();
  });

  it('calculates correct container count (exact divisible)', () => {
    // 4 units / 4 per container = 1 container
    const result = generateShippingSuggestion({
      activeSlots: [{ seriesCode: '12750000000', quantity: 4 }],
      mappings: ALL_MAPPINGS,
      factoryROE: 19.73,
    });
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(1);
  });

  it('uses ceil for remainder (extra container needed)', () => {
    // 5 units / 4 per container = ceil(1.25) = 2 containers
    const result = generateShippingSuggestion({
      activeSlots: [{ seriesCode: '12750000000', quantity: 5 }],
      mappings: ALL_MAPPINGS,
      factoryROE: 19.73,
    });
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(2);
  });

  it('converts EUR cost to ZAR using factoryROE', () => {
    const result = generateShippingSuggestion({
      activeSlots: [{ seriesCode: '12750000000', quantity: 1 }],
      mappings: ALL_MAPPINGS,
      factoryROE: 19.73,
    });
    expect(result[0].costZAR).toBeCloseTo(3300 * 19.73, 2);
  });

  it('aggregates quantities across multiple slots of same series', () => {
    // Two slots, same series: 3 + 4 = 7 units / 4 per = ceil(1.75) = 2 containers
    const result = generateShippingSuggestion({
      activeSlots: [
        { seriesCode: '12750000000', quantity: 3 },
        { seriesCode: '12750000000', quantity: 4 },
      ],
      mappings: ALL_MAPPINGS,
      factoryROE: 19.73,
    });
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(2);
  });

  it('creates placeholder entry for series with no mapping', () => {
    const result = generateShippingSuggestion({
      activeSlots: [{ seriesCode: '99990000000', quantity: 2 }],
      mappings: ALL_MAPPINGS,
      factoryROE: 19.73,
    });
    expect(result).toHaveLength(1);
    expect(result[0].costZAR).toBe(0);
    expect(result[0].source).toBe('suggested');
    expect(result[0].description).toContain('No mapping');
  });

  it('handles mixed series — some with mapping, some without', () => {
    const result = generateShippingSuggestion({
      activeSlots: [
        { seriesCode: '12750000000', quantity: 3 },
        { seriesCode: '99990000000', quantity: 2 },
      ],
      mappings: ALL_MAPPINGS,
      factoryROE: 19.73,
    });
    expect(result).toHaveLength(2);
    const mapped = result.find((e) => e.costZAR > 0);
    const unmapped = result.find((e) => e.costZAR === 0);
    expect(mapped).toBeDefined();
    expect(unmapped).toBeDefined();
    expect(unmapped!.description).toContain('No mapping');
  });

  it('all entries have source=suggested and seriesCodes populated', () => {
    const result = generateShippingSuggestion({
      activeSlots: [
        { seriesCode: '12750000000', quantity: 2 },
        { seriesCode: '38600000000', quantity: 3 },
      ],
      mappings: ALL_MAPPINGS,
      factoryROE: 19.73,
    });
    for (const entry of result) {
      expect(entry.source).toBe('suggested');
      expect(entry.seriesCodes).toBeDefined();
      expect(entry.seriesCodes!.length).toBeGreaterThan(0);
      expect(entry.suggestedAt).toBeDefined();
    }
  });

  it('sets containerType from mapping', () => {
    const result = generateShippingSuggestion({
      activeSlots: [{ seriesCode: '12750000000', quantity: 1 }],
      mappings: ALL_MAPPINGS,
      factoryROE: 19.73,
    });
    expect(result[0].containerType).toBe("40' standard");
  });
});

// --- collectMappingNotes Tests ---

describe('collectMappingNotes', () => {
  it('returns empty for series with no notes', () => {
    const notes = collectMappingNotes(ALL_MAPPINGS, ['12750000000']);
    expect(notes).toEqual([]);
  });

  it('returns notes for series that have them', () => {
    const notes = collectMappingNotes(ALL_MAPPINGS, ['38600000000']);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain('standard spec');
  });

  it('deduplicates identical notes', () => {
    const mappingsWithDupes: ContainerMapping[] = [
      MAPPING_386,
      { ...MAPPING_386, seriesCode: '387' },
    ];
    const notes = collectMappingNotes(mappingsWithDupes, ['38600000000', '38700000000']);
    expect(notes).toHaveLength(1);
  });

  it('returns empty for empty series codes', () => {
    const notes = collectMappingNotes(ALL_MAPPINGS, []);
    expect(notes).toEqual([]);
  });
});

// --- Signature Tests ---

describe('computeSuggestionSignature / signaturesMatch', () => {
  it('same slots and ROE produce matching signatures', () => {
    const slots = [{ seriesCode: '1275', quantity: 3 }];
    const a = computeSuggestionSignature(slots, 19.73);
    const b = computeSuggestionSignature(slots, 19.73);
    expect(signaturesMatch(a, b)).toBe(true);
  });

  it('different quantities produce different signatures', () => {
    const a = computeSuggestionSignature([{ seriesCode: '1275', quantity: 3 }], 19.73);
    const b = computeSuggestionSignature([{ seriesCode: '1275', quantity: 4 }], 19.73);
    expect(signaturesMatch(a, b)).toBe(false);
  });

  it('different ROE produces different signatures', () => {
    const slots = [{ seriesCode: '1275', quantity: 3 }];
    const a = computeSuggestionSignature(slots, 19.73);
    const b = computeSuggestionSignature(slots, 20.00);
    expect(signaturesMatch(a, b)).toBe(false);
  });

  it('order-independent: different slot order, same content', () => {
    const a = computeSuggestionSignature(
      [
        { seriesCode: '386', quantity: 2 },
        { seriesCode: '1275', quantity: 3 },
      ],
      19.73
    );
    const b = computeSuggestionSignature(
      [
        { seriesCode: '1275', quantity: 3 },
        { seriesCode: '386', quantity: 2 },
      ],
      19.73
    );
    expect(signaturesMatch(a, b)).toBe(true);
  });
});
