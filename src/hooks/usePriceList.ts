import { useState, useEffect, useRef } from 'react';
import { getDb } from '../db/DatabaseAdapter';
import { logger } from '../utils/logger';
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
  const [series, setSeries] = useState<{ seriesCode: string; seriesName: string; modelCount: number }[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchSeries() {
      const data = await getDb().listPriceListSeries();

      if (!cancelled) {
        const mapped = data.map((row) => {
          const models =
            typeof row.models === 'string'
              ? JSON.parse(row.models)
              : (row.models || []);
          return {
            seriesCode: row.seriesCode,
            seriesName: row.seriesName,
            modelCount: (models as unknown[]).length,
          };
        });
        setSeries(mapped);
      }
    }

    fetchSeries().catch((error) => {
      logger.error('usePriceListSeries: error fetching price_list_series', { error });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return series;
}

/**
 * Hook to get full series data including models and options.
 */
export function useSeriesData(seriesCode: string): PriceListSeries | null {
  const [series, setSeries] = useState<PriceListSeries | null>(null);
  // Bug #27 fix: use a request counter to discard stale responses from rapid changes
  const requestIdRef = useRef(0);

  useEffect(() => {
    const currentRequestId = ++requestIdRef.current;
    let cancelled = false;

    if (!seriesCode) {
      setSeries(null);
      return;
    }

    async function fetchSeriesData() {
      const data = await getDb().getPriceListSeries(seriesCode);

      // Bug #27 fix: only apply results if this is still the latest request
      if (currentRequestId === requestIdRef.current && !cancelled) {
        if (!data) {
          setSeries(null);
          return;
        }

        const models: PriceListModel[] =
          typeof data.models === 'string'
            ? JSON.parse(data.models)
            : (data.models || []);

        const options: PriceListOption[] =
          typeof data.options === 'string'
            ? JSON.parse(data.options)
            : (data.options || []);

        setSeries({
          seriesCode: data.seriesCode,
          seriesName: data.seriesName,
          models,
          options,
        });
      }
    }

    fetchSeriesData().catch((error) => {
      logger.error('useSeriesData: error fetching series data', { error });
    });

    return () => { cancelled = true; };
  }, [seriesCode]);

  return series;
}

/**
 * Hook to get models within a series.
 */
export function useSeriesModels(seriesCode: string): PriceListModel[] {
  const [models, setModels] = useState<PriceListModel[]>([]);
  // Bug #27 fix: use a request counter to discard stale responses from rapid changes
  const requestIdRef = useRef(0);

  useEffect(() => {
    const currentRequestId = ++requestIdRef.current;
    let cancelled = false;

    if (!seriesCode) {
      setModels([]);
      return;
    }

    async function fetchModels() {
      const data = await getDb().getPriceListSeries(seriesCode);

      // Bug #27 fix: only apply results if this is still the latest request
      if (currentRequestId === requestIdRef.current && !cancelled) {
        if (!data) {
          setModels([]);
          return;
        }

        const parsed: PriceListModel[] =
          typeof data.models === 'string'
            ? JSON.parse(data.models)
            : (data.models || []);

        setModels(parsed);
      }
    }

    fetchModels().catch((error) => {
      logger.error('useSeriesModels: error fetching series models', { error });
    });

    return () => { cancelled = true; };
  }, [seriesCode]);

  return models;
}

/**
 * Hook to get available options filtered by INDX column availability.
 * Returns options where availability[indxIndex] > 0.
 */
export function useModelOptions(
  seriesCode: string,
  indxColumn: number
): PriceListOption[] {
  const [options, setOptions] = useState<PriceListOption[]>([]);
  // Bug #27 fix: use a request counter to discard stale responses from rapid changes
  const requestIdRef = useRef(0);

  useEffect(() => {
    const currentRequestId = ++requestIdRef.current;
    let cancelled = false;

    if (!seriesCode || !indxColumn) {
      setOptions([]);
      return;
    }

    async function fetchOptions() {
      const data = await getDb().getPriceListSeries(seriesCode);

      // Bug #27 fix: only apply results if this is still the latest request
      if (currentRequestId === requestIdRef.current && !cancelled) {
        if (!data) {
          setOptions([]);
          return;
        }

        const allOptions: PriceListOption[] =
          typeof data.options === 'string'
            ? JSON.parse(data.options)
            : (data.options || []);

        const models: PriceListModel[] =
          typeof data.models === 'string'
            ? JSON.parse(data.models)
            : (data.models || []);

        // Find the index of our INDX column within the sorted INDX columns
        const indxIndex = models.findIndex((m) => m.indxColumn === indxColumn);
        if (indxIndex === -1) {
          setOptions([]);
          return;
        }

        // Filter options that have availability > 0 at this INDX position
        const filtered = allOptions.filter((opt) => {
          const avail = opt.availability[indxIndex];
          return avail !== undefined && avail > 0;
        });

        setOptions(filtered);
      }
    }

    fetchOptions().catch((error) => {
      logger.error('useModelOptions: error fetching series options', { error });
    });

    return () => { cancelled = true; };
  }, [seriesCode, indxColumn]);

  return options;
}

/**
 * Hook to get all telematics packages.
 */
export function useTelematicsPackages(): TelematicsPackage[] {
  const [packages, setPackages] = useState<TelematicsPackage[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchPackages() {
      const data = await getDb().listTelematicsPackages();

      if (!cancelled) {
        const mapped = data.map((row) => ({
          ...row,
          costZAR: row.costZAR,
        })) as TelematicsPackage[];
        setPackages(mapped);
      }
    }

    fetchPackages().catch((error) => {
      logger.error('useTelematicsPackages: error fetching telematics_packages', { error });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return packages;
}

/**
 * Pure prefix-matcher: find the container mapping row that matches a given series code.
 * Exported for direct use in engine functions and testing.
 */
export function matchSeriesCode(
  seriesCode: string,
  mappings: { series_code: string; [key: string]: any }[]
): typeof mappings[number] | null {
  if (!seriesCode || mappings.length === 0) return null;
  return (
    mappings.find(
      (m) =>
        m.series_code === seriesCode ||
        seriesCode.startsWith(m.series_code) ||
        m.series_code === seriesCode.replace(/0+\d?$/, '')
    ) ?? null
  );
}

/** Match against adapter-returned ContainerMapping rows using camelCase fields */
function matchSeriesCodeCamel(
  seriesCode: string,
  mappings: { seriesCode: string; [key: string]: any }[]
): typeof mappings[number] | null {
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

/** Map a StoredContainerMapping to camelCase ContainerMapping */
function storedToContainerMapping(row: {
  seriesCode: string;
  category: string;
  model: string;
  qtyPerContainer: number;
  containerType: string;
  containerCostEUR: number;
  notes: string;
}): ContainerMapping {
  return {
    seriesCode: row.seriesCode,
    category: row.category,
    model: row.model,
    qtyPerContainer: row.qtyPerContainer,
    containerType: row.containerType,
    containerCostEUR: row.containerCostEUR,
    notes: row.notes ?? '',
  };
}

/**
 * Hook to get container mapping for a single series (existing API preserved).
 */
export function useContainerMapping(seriesCode: string): ContainerMapping | null {
  const [mapping, setMapping] = useState<ContainerMapping | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!seriesCode) {
      setMapping(null);
      return;
    }

    async function fetchMapping() {
      const data = await getDb().listContainerMappings();

      if (!cancelled) {
        if (!data || data.length === 0) {
          setMapping(null);
          return;
        }

        const match = matchSeriesCodeCamel(seriesCode, data);
        if (!match) {
          setMapping(null);
          return;
        }

        setMapping(storedToContainerMapping(match));
      }
    }

    fetchMapping().catch((error) => {
      logger.error('useContainerMapping: error fetching container_mappings', { error });
    });

    return () => {
      cancelled = true;
    };
  }, [seriesCode]);

  return mapping;
}

/**
 * Hook to get container mappings for multiple series codes in a single fetch.
 * Returns one ContainerMapping per input series code (in order), or null for unmatched codes.
 */
export function useContainerMappings(seriesCodes: string[]): (ContainerMapping | null)[] {
  const [mappings, setMappings] = useState<(ContainerMapping | null)[]>([]);
  // Bug #27 fix: use a request counter to discard stale responses from rapid changes
  const requestIdRef = useRef(0);

  // Bug #28 fix: preserve order in the key so slot reordering triggers a refetch
  const key = JSON.stringify(seriesCodes);

  useEffect(() => {
    const currentRequestId = ++requestIdRef.current;

    if (seriesCodes.length === 0) {
      setMappings([]);
      return;
    }

    async function fetchMappings() {
      const data = await getDb().listContainerMappings();

      // Bug #27 fix: only apply results if this is still the latest request
      if (currentRequestId === requestIdRef.current && data) {
        const result = seriesCodes.map((code) => {
          const match = matchSeriesCodeCamel(code, data);
          return match ? storedToContainerMapping(match) : null;
        });
        setMappings(result);
      }
    }

    fetchMappings().catch((error) => {
      logger.error('useContainerMappings: error fetching container_mappings', { error });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return mappings;
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
