import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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
      const { data, error } = await supabase
        .from('price_list_series')
        .select('*')
        .order('series_name');

      if (error) {
        console.error('usePriceListSeries: error fetching price_list_series', error);
        return;
      }

      if (!cancelled && data) {
        const mapped = data.map((row) => {
          const models =
            typeof row.models === 'string'
              ? JSON.parse(row.models)
              : (row.models || []);
          return {
            seriesCode: row.series_code as string,
            seriesName: row.series_name as string,
            modelCount: (models as unknown[]).length,
          };
        });
        setSeries(mapped);
      }
    }

    fetchSeries();

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

  useEffect(() => {
    let cancelled = false;

    if (!seriesCode) {
      setSeries(null);
      return;
    }

    async function fetchSeriesData() {
      const { data, error } = await supabase
        .from('price_list_series')
        .select('*')
        .eq('series_code', seriesCode)
        .maybeSingle();

      if (error) {
        console.error('useSeriesData: error fetching series data', error);
        return;
      }

      if (!cancelled) {
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
          seriesCode: data.series_code as string,
          seriesName: data.series_name as string,
          models,
          options,
        });
      }
    }

    fetchSeriesData();

    return () => {
      cancelled = true;
    };
  }, [seriesCode]);

  return series;
}

/**
 * Hook to get models within a series.
 */
export function useSeriesModels(seriesCode: string): PriceListModel[] {
  const [models, setModels] = useState<PriceListModel[]>([]);

  useEffect(() => {
    let cancelled = false;

    if (!seriesCode) {
      setModels([]);
      return;
    }

    async function fetchModels() {
      const { data, error } = await supabase
        .from('price_list_series')
        .select('*')
        .eq('series_code', seriesCode)
        .maybeSingle();

      if (error) {
        console.error('useSeriesModels: error fetching series models', error);
        return;
      }

      if (!cancelled) {
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

    fetchModels();

    return () => {
      cancelled = true;
    };
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

  useEffect(() => {
    let cancelled = false;

    if (!seriesCode || !indxColumn) {
      setOptions([]);
      return;
    }

    async function fetchOptions() {
      const { data, error } = await supabase
        .from('price_list_series')
        .select('*')
        .eq('series_code', seriesCode)
        .maybeSingle();

      if (error) {
        console.error('useModelOptions: error fetching series options', error);
        return;
      }

      if (!cancelled) {
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

    fetchOptions();

    return () => {
      cancelled = true;
    };
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
      const { data, error } = await supabase
        .from('telematics_packages')
        .select('*');

      if (error) {
        console.error('useTelematicsPackages: error fetching telematics_packages', error);
        return;
      }

      if (!cancelled && data) {
        const mapped = data.map((row) => ({
          ...row,
          costZAR: row.cost_zar,
        })) as TelematicsPackage[];
        setPackages(mapped);
      }
    }

    fetchPackages();

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

/** Map a raw Supabase container_mappings row to camelCase ContainerMapping */
function rowToContainerMapping(row: any): ContainerMapping {
  return {
    seriesCode: row.series_code,
    category: row.category,
    model: row.model,
    qtyPerContainer: row.qty_per_container,
    containerType: row.container_type,
    containerCostEUR: row.container_cost_eur,
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
      const { data, error } = await supabase
        .from('container_mappings')
        .select('*');

      if (error) {
        console.error('useContainerMapping: error fetching container_mappings', error);
        return;
      }

      if (!cancelled) {
        if (!data) {
          setMapping(null);
          return;
        }

        const match = matchSeriesCode(seriesCode, data);
        if (!match) {
          setMapping(null);
          return;
        }

        setMapping(rowToContainerMapping(match));
      }
    }

    fetchMapping();

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

  // Stable key for the dependency — sorted and deduped
  const key = JSON.stringify([...new Set(seriesCodes)].sort());

  useEffect(() => {
    let cancelled = false;

    if (seriesCodes.length === 0) {
      setMappings([]);
      return;
    }

    async function fetchMappings() {
      const { data, error } = await supabase
        .from('container_mappings')
        .select('*');

      if (error) {
        console.error('useContainerMappings: error fetching container_mappings', error);
        return;
      }

      if (!cancelled && data) {
        const result = seriesCodes.map((code) => {
          const match = matchSeriesCode(code, data);
          return match ? rowToContainerMapping(match) : null;
        });
        setMappings(result);
      }
    }

    fetchMappings();

    return () => {
      cancelled = true;
    };
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
