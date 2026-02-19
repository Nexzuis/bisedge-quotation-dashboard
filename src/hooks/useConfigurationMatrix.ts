import { useState, useEffect } from 'react';
import { configurationMatrixRepository } from '../db/ConfigurationMatrixRepository';
import type {
  StoredConfigurationMatrix,
  StoredConfigurationVariant,
  StoredConfigurationOption,
} from '../db/interfaces';

/**
 * Hook to get configuration matrix by base model family
 */
export function useConfigurationMatrix(baseModelFamily: string) {
  const [matrix, setMatrix] = useState<StoredConfigurationMatrix | null | undefined>(undefined);

  useEffect(() => {
    if (!baseModelFamily) {
      setMatrix(null);
      return;
    }
    configurationMatrixRepository.getMatrixByModelFamily(baseModelFamily)
      .then(setMatrix)
      .catch(() => setMatrix(null));
  }, [baseModelFamily]);

  return matrix;
}

/**
 * Hook to get all configuration matrices
 */
export function useAllConfigurationMatrices() {
  const [matrices, setMatrices] = useState<StoredConfigurationMatrix[] | undefined>(undefined);

  useEffect(() => {
    configurationMatrixRepository.list()
      .then(setMatrices)
      .catch(() => setMatrices([]));
  }, []);

  return matrices;
}

/**
 * Hook to get a specific variant configuration
 * Searches all matrices for the variant code
 */
export function useVariantConfiguration(variantCode: string) {
  const [result, setResult] = useState<{ matrix: StoredConfigurationMatrix; variant: StoredConfigurationVariant } | null | undefined>(undefined);

  useEffect(() => {
    if (!variantCode) {
      setResult(null);
      return;
    }
    configurationMatrixRepository.list().then((matrices) => {
      for (const matrix of matrices) {
        const variant = matrix.variants.find((v) => v.variantCode === variantCode);
        if (variant) {
          setResult({ matrix, variant });
          return;
        }
      }
      setResult(null);
    }).catch(() => setResult(null));
  }, [variantCode]);

  return result;
}

/**
 * Get available options for a specific spec code in a variant
 * Filters out unavailable options (availability === 0)
 */
export function getAvailableOptions(
  variant: StoredConfigurationVariant | undefined,
  specCode: string
): StoredConfigurationOption[] {
  if (!variant) return [];

  return configurationMatrixRepository.getAvailableOptions(variant, specCode);
}

/**
 * Get all standard options for a variant (availability === 1)
 * These should be auto-selected by default
 */
export function getStandardOptions(
  variant: StoredConfigurationVariant | undefined
): Record<string, StoredConfigurationOption> {
  if (!variant) return {};

  return configurationMatrixRepository.getStandardOptions(variant);
}

/**
 * Get all specification groups for a variant, organized by category
 */
export function getSpecificationsByCategory(
  variant: StoredConfigurationVariant | undefined
): Record<string, StoredConfigurationVariant['specifications']> {
  if (!variant) return {};

  const categorized: Record<string, StoredConfigurationVariant['specifications']> = {};

  variant.specifications.forEach((spec) => {
    const category = spec.category;
    if (!categorized[category]) {
      categorized[category] = [];
    }
    categorized[category].push(spec);
  });

  return categorized;
}

/**
 * Calculate total configuration cost from selections
 */
export function calculateConfigurationCost(
  variant: StoredConfigurationVariant | undefined,
  selections: Record<string, string>
): number {
  if (!variant) return 0;

  return configurationMatrixRepository.calculateConfigurationCost(variant, selections);
}

/**
 * Generate human-readable summary from selections
 */
export function generateConfigurationSummary(
  variant: StoredConfigurationVariant | undefined,
  selections: Record<string, string>
): string[] {
  if (!variant) return [];

  return configurationMatrixRepository.generateConfigurationSummary(variant, selections);
}

/**
 * Validate that all required spec codes have selections
 */
export function validateConfiguration(
  variant: StoredConfigurationVariant | undefined,
  selections: Record<string, string>
): { valid: boolean; missingSpecs: string[] } {
  if (!variant) {
    return { valid: false, missingSpecs: [] };
  }

  const missingSpecs: string[] = [];

  // Check that each spec group has a selection
  variant.specifications.forEach((spec) => {
    const hasAvailableOptions = spec.options.some((opt) => opt.availability > 0);

    if (hasAvailableOptions && !selections[spec.groupCode]) {
      missingSpecs.push(spec.groupName);
    }
  });

  return {
    valid: missingSpecs.length === 0,
    missingSpecs,
  };
}

/**
 * Initialize configuration selections with standard options
 */
export function initializeConfigurationSelections(
  variant: StoredConfigurationVariant | undefined
): Record<string, string> {
  if (!variant) return {};

  const selections: Record<string, string> = {};
  const standardOptions = getStandardOptions(variant);

  // Auto-select all standard options
  Object.entries(standardOptions).forEach(([specCode, option]) => {
    selections[specCode] = option.optionCode;
  });

  return selections;
}

/**
 * Get availability badge label and color
 */
export function getAvailabilityBadge(availability: 0 | 1 | 2 | 3): {
  label: string;
  color: string;
} {
  switch (availability) {
    case 0:
      return { label: 'Not Available', color: 'red' };
    case 1:
      return { label: 'Standard', color: 'green' };
    case 2:
      return { label: 'Optional', color: 'blue' };
    case 3:
      return { label: 'Special Order', color: 'yellow' };
    default:
      return { label: 'Unknown', color: 'gray' };
  }
}
