import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import type {
  PriceListSeries,
  PriceListModel,
  PriceListOption,
  TelematicsPackage,
  ContainerMapping,
} from '../types/quote';

/**
 * Hook to get all price list series for the series dropdown.
 * Returns { seriesCode, seriesName, modelCount } for each series.
 */
export function usePriceListSeries(): { seriesCode: string; seriesName: string; modelCount: number }[] {
  const series = useLiveQuery(
    async () => {
      const all = await db.priceListSeries.orderBy('seriesName').toArray();
      return all.map((s) => ({
        seriesCode: s.seriesCode,
        seriesName: s.seriesName,
        modelCount: JSON.parse(s.models).length,
      }));
    },
    [],
    []
  );

  return series || [];
}

/**
 * Hook to get full series data including models and options.
 */
export function useSeriesData(seriesCode: string): PriceListSeries | null {
  const series = useLiveQuery(
    async () => {
      if (!seriesCode) return null;
      const stored = await db.priceListSeries.get(seriesCode);
      if (!stored) return null;
      return {
        seriesCode: stored.seriesCode,
        seriesName: stored.seriesName,
        models: JSON.parse(stored.models) as PriceListModel[],
        options: JSON.parse(stored.options) as PriceListOption[],
      };
    },
    [seriesCode],
    null
  );

  return series ?? null;
}

/**
 * Hook to get models within a series.
 */
export function useSeriesModels(seriesCode: string): PriceListModel[] {
  const models = useLiveQuery(
    async () => {
      if (!seriesCode) return [];
      const stored = await db.priceListSeries.get(seriesCode);
      if (!stored) return [];
      return JSON.parse(stored.models) as PriceListModel[];
    },
    [seriesCode],
    []
  );

  return models || [];
}

/**
 * Hook to get available options filtered by INDX column availability.
 * Returns options where availability[indxIndex] > 0.
 */
export function useModelOptions(
  seriesCode: string,
  indxColumn: number
): PriceListOption[] {
  const options = useLiveQuery(
    async () => {
      if (!seriesCode || !indxColumn) return [];
      const stored = await db.priceListSeries.get(seriesCode);
      if (!stored) return [];

      const allOptions = JSON.parse(stored.options) as PriceListOption[];
      const models = JSON.parse(stored.models) as PriceListModel[];

      // Find the index of our INDX column within the sorted INDX columns
      const indxIndex = models.findIndex((m) => m.indxColumn === indxColumn);
      if (indxIndex === -1) return [];

      // Filter options that have availability > 0 at this INDX position
      return allOptions.filter((opt) => {
        const avail = opt.availability[indxIndex];
        return avail !== undefined && avail > 0;
      });
    },
    [seriesCode, indxColumn],
    []
  );

  return options || [];
}

/**
 * Hook to get all telematics packages.
 */
export function useTelematicsPackages(): TelematicsPackage[] {
  const packages = useLiveQuery(
    async () => {
      return await db.telematicsPackages.toArray();
    },
    [],
    []
  );

  return (packages as TelematicsPackage[]) || [];
}

/**
 * Hook to get container mapping for a series.
 */
export function useContainerMapping(seriesCode: string): ContainerMapping | null {
  const mapping = useLiveQuery(
    async () => {
      if (!seriesCode) return null;

      // Series codes in the container mappings are short (e.g. "1275")
      // while priceListSeries uses full codes (e.g. "12750000000")
      // Try both exact match and prefix match
      const all = await db.containerMappings.toArray();
      const match = all.find(
        (m) =>
          m.seriesCode === seriesCode ||
          seriesCode.startsWith(m.seriesCode) ||
          m.seriesCode === seriesCode.replace(/0+\d?$/, '')
      );

      if (!match) return null;
      return match as unknown as ContainerMapping;
    },
    [seriesCode],
    null
  );

  return mapping ?? null;
}

// --- Helper functions (non-hooks, for use in store/engine) ---

/**
 * Get the availability level for an option at a specific INDX column.
 */
export function getOptionAvailability(
  option: PriceListOption,
  indxColumn: number,
  models: PriceListModel[]
): 0 | 1 | 2 | 3 {
  const indxIndex = models.findIndex((m) => m.indxColumn === indxColumn);
  if (indxIndex === -1) return 0;
  const val = option.availability[indxIndex];
  if (val === 1 || val === 2 || val === 3) return val;
  return 0;
}

/**
 * Calculate total EUR cost of selected optional/non-standard options.
 */
export function calculateOptionsCost(
  selectedOptions: Record<string, string>,
  seriesOptions: PriceListOption[],
  indxColumn: number,
  models: PriceListModel[]
): number {
  let total = 0;

  Object.entries(selectedOptions).forEach(([_specCode, materialNumber]) => {
    const option = seriesOptions.find((o) => o.materialNumber === materialNumber);
    if (!option) return;

    const avail = getOptionAvailability(option, indxColumn, models);
    // Only charge for optional (2) and non-standard (3) options
    if (avail >= 2) {
      total += option.eurPrice;
    }
  });

  return total;
}

/**
 * Get all standard (level 1) options for a model — auto-select these.
 * Returns { specCode: materialNumber } for each standard option.
 */
export function getStandardOptionsForModel(
  seriesOptions: PriceListOption[],
  indxColumn: number,
  models: PriceListModel[]
): Record<string, string> {
  const result: Record<string, string> = {};
  const indxIndex = models.findIndex((m) => m.indxColumn === indxColumn);
  if (indxIndex === -1) return result;

  // Group by spec code, pick the first level-1 option
  const seen = new Set<string>();

  for (const option of seriesOptions) {
    const avail = option.availability[indxIndex];
    if (avail === 1 && !seen.has(option.specCode)) {
      result[option.specCode] = option.materialNumber;
      seen.add(option.specCode);
    }
  }

  return result;
}

/**
 * Get badge label and color for an availability level.
 */
export function getAvailabilityBadge(level: number): { label: string; color: string; textClass: string } {
  switch (level) {
    case 0:
      return { label: 'Unavailable', color: 'red', textClass: 'text-red-500' };
    case 1:
      return { label: 'Standard', color: 'green', textClass: 'text-green-400' };
    case 2:
      return { label: 'Optional', color: 'blue', textClass: 'text-blue-400' };
    case 3:
      return { label: 'Non-Standard', color: 'yellow', textClass: 'text-yellow-400' };
    default:
      return { label: 'Unknown', color: 'gray', textClass: 'text-surface-500' };
  }
}
