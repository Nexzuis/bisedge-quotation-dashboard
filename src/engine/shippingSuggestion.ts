/**
 * Shipping Suggestion Engine
 *
 * Pure, deterministic functions for generating shipping container suggestions
 * from fleet slot data and container mappings.
 */

import type { ShippingEntry, ContainerMapping, ZAR } from '../types/quote';

export interface SuggestionSlot {
  seriesCode: string;
  quantity: number;
}

export interface SuggestionInput {
  activeSlots: SuggestionSlot[];
  mappings: ContainerMapping[];
  factoryROE: number;
}

/**
 * Generate shipping entry suggestions from fleet configuration and container mappings.
 *
 * For each unique series in the fleet:
 * 1. Find the matching container mapping (prefix match)
 * 2. Calculate containers needed = ceil(totalUnits / qtyPerContainer)
 * 3. Convert EUR cost to ZAR using factoryROE
 * 4. Return one ShippingEntry per series group
 *
 * Series with no mapping get a placeholder entry with costZAR: 0.
 */
export function generateShippingSuggestion(input: SuggestionInput): ShippingEntry[] {
  const { activeSlots, mappings, factoryROE } = input;

  if (activeSlots.length === 0) return [];

  // Group slots by series code and sum quantities
  const seriesGroups = new Map<string, number>();
  for (const slot of activeSlots) {
    if (!slot.seriesCode) continue;
    const existing = seriesGroups.get(slot.seriesCode) || 0;
    seriesGroups.set(slot.seriesCode, existing + slot.quantity);
  }

  const now = new Date().toISOString();
  const entries: ShippingEntry[] = [];

  for (const [seriesCode, totalUnits] of seriesGroups) {
    const mapping = findMapping(seriesCode, mappings);

    if (!mapping) {
      // No mapping found — placeholder entry
      const shortCode = seriesCode.replace(/0+$/, '') || seriesCode;
      entries.push({
        id: crypto.randomUUID(),
        description: `No mapping for series ${shortCode} - enter manually`,
        containerType: "40' standard",
        quantity: 1,
        costZAR: 0 as ZAR,
        source: 'suggested',
        seriesCodes: [seriesCode],
        suggestedAt: now,
      });
      continue;
    }

    const shortCode = mapping.seriesCode || seriesCode.replace(/0+$/, '');
    const containersNeeded = Math.ceil(totalUnits / mapping.qtyPerContainer);
    const costZAR = mapping.containerCostEUR * factoryROE;

    entries.push({
      id: crypto.randomUUID(),
      description: `Series ${shortCode} - ${mapping.category} (${totalUnits} units)`,
      containerType: mapping.containerType,
      quantity: containersNeeded,
      costZAR: costZAR as ZAR,
      source: 'suggested',
      seriesCodes: [seriesCode],
      suggestedAt: now,
    });
  }

  return entries;
}

/**
 * Find the container mapping for a series code using prefix matching.
 * Mirrors the logic in matchSeriesCode from usePriceList.ts.
 */
function findMapping(seriesCode: string, mappings: ContainerMapping[]): ContainerMapping | null {
  if (!seriesCode || mappings.length === 0) return null;
  return (
    mappings.find(
      (m) =>
        m.seriesCode === seriesCode ||
        seriesCode.startsWith(m.seriesCode) ||
        m.seriesCode === seriesCode.replace(/0+\d?$/, '')
    ) ?? null
  );
}

/**
 * Collect notes from container mappings that are relevant to the given series codes.
 * Returns deduplicated, non-empty notes strings.
 */
export function collectMappingNotes(
  mappings: ContainerMapping[],
  seriesCodes: string[]
): string[] {
  const notes = new Set<string>();

  for (const code of seriesCodes) {
    const mapping = findMapping(code, mappings);
    if (mapping && mapping.notes && mapping.notes.trim()) {
      notes.add(mapping.notes.trim());
    }
  }

  return [...notes];
}

/**
 * Compute a deterministic signature for suggestion staleness detection.
 * Changes when fleet composition (series + qty) or ROE changes.
 */
export interface SuggestionSignature {
  slotHash: string;
  factoryROE: number;
}

export function computeSuggestionSignature(
  activeSlots: SuggestionSlot[],
  factoryROE: number
): SuggestionSignature {
  // Sort by seriesCode for determinism, include quantity
  const sorted = activeSlots
    .filter((s) => s.seriesCode)
    .map((s) => ({ seriesCode: s.seriesCode, quantity: s.quantity }))
    .sort((a, b) => a.seriesCode.localeCompare(b.seriesCode));

  return {
    slotHash: JSON.stringify(sorted),
    factoryROE,
  };
}

export function signaturesMatch(a: SuggestionSignature, b: SuggestionSignature): boolean {
  return a.slotHash === b.slotHash && a.factoryROE === b.factoryROE;
}
