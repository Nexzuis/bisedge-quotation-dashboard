import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import type {
  StoredConfigurationMatrix,
  StoredConfigurationVariant,
  StoredConfigurationOption,
  IConfigurationMatrixRepository,
} from './interfaces';

type ConfigMatrixInsert = Database['public']['Tables']['configuration_matrices']['Insert'];

// Snake_case <-> camelCase mapping helpers
function dbToMatrix(row: any): StoredConfigurationMatrix {
  return {
    id: row.id,
    baseModelFamily: row.base_model_family,
    variants: typeof row.variants === 'string' ? JSON.parse(row.variants) : (row.variants || []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function matrixToDb(matrix: StoredConfigurationMatrix): ConfigMatrixInsert {
  return {
    id: matrix.id,
    base_model_family: matrix.baseModelFamily,
    variants: JSON.stringify(matrix.variants),
    created_at: matrix.createdAt,
    updated_at: matrix.updatedAt,
  };
}

export class ConfigurationMatrixRepository implements IConfigurationMatrixRepository {
  /**
   * Get configuration matrix by base model family (e.g., "EG16", "E20")
   */
  async getMatrixByModelFamily(family: string): Promise<StoredConfigurationMatrix | null> {
    try {
      const { data, error } = await supabase
        .from('configuration_matrices')
        .select('*')
        .eq('base_model_family', family)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching matrix for family ${family}:`, error);
        return null;
      }

      return data ? dbToMatrix(data) : null;
    } catch (error) {
      console.error(`Error fetching matrix for family ${family}:`, error);
      return null;
    }
  }

  /**
   * Get a specific variant by its code (searches all matrices)
   */
  async getVariantByCode(variantCode: string): Promise<StoredConfigurationVariant | null> {
    try {
      const { data, error } = await supabase
        .from('configuration_matrices')
        .select('*');

      if (error || !data) return null;

      for (const row of data) {
        const matrix = dbToMatrix(row);
        const variant = matrix.variants.find((v) => v.variantCode === variantCode);
        if (variant) {
          return variant;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error fetching variant ${variantCode}:`, error);
      return null;
    }
  }

  /**
   * Save or update a configuration matrix
   */
  async saveMatrix(
    matrix: Omit<StoredConfigurationMatrix, 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const now = new Date().toISOString();

      // Check if matrix exists
      const { data: existing } = await supabase
        .from('configuration_matrices')
        .select('created_at')
        .eq('id', matrix.id)
        .maybeSingle();

      const toSave: StoredConfigurationMatrix = {
        ...matrix,
        createdAt: existing?.created_at || now,
        updatedAt: now,
      };

      const { error } = await supabase
        .from('configuration_matrices')
        .upsert(matrixToDb(toSave), { onConflict: 'id' });

      if (error) throw new Error(error.message);
      return toSave.id;
    } catch (error) {
      console.error('Error saving configuration matrix:', error);
      throw new Error('Failed to save configuration matrix');
    }
  }

  /**
   * Update a specific option within a matrix
   */
  async updateOption(
    matrixId: string,
    variantCode: string,
    specCode: string,
    optionCode: string,
    updates: Partial<StoredConfigurationOption>
  ): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('configuration_matrices')
        .select('*')
        .eq('id', matrixId)
        .single();

      if (error || !data) {
        throw new Error(`Matrix ${matrixId} not found`);
      }

      const matrix = dbToMatrix(data);

      // Find the variant
      const variant = matrix.variants.find((v) => v.variantCode === variantCode);
      if (!variant) {
        throw new Error(`Variant ${variantCode} not found in matrix ${matrixId}`);
      }

      // Find the specification group
      const specGroup = variant.specifications.find((s) => s.groupCode === specCode);
      if (!specGroup) {
        throw new Error(`Spec group ${specCode} not found in variant ${variantCode}`);
      }

      // Find and update the option
      const option = specGroup.options.find((o) => o.optionCode === optionCode);
      if (!option) {
        throw new Error(`Option ${optionCode} not found in spec group ${specCode}`);
      }

      Object.assign(option, updates);

      // Save the updated matrix
      matrix.updatedAt = new Date().toISOString();
      const { error: saveError } = await supabase
        .from('configuration_matrices')
        .upsert(matrixToDb(matrix), { onConflict: 'id' });

      if (saveError) throw new Error(saveError.message);
    } catch (error) {
      console.error('Error updating option:', error);
      throw error;
    }
  }

  /**
   * List all configuration matrices
   */
  async list(): Promise<StoredConfigurationMatrix[]> {
    try {
      const { data, error } = await supabase
        .from('configuration_matrices')
        .select('*');

      if (error) {
        console.error('Error listing configuration matrices:', error);
        return [];
      }

      return (data || []).map(dbToMatrix);
    } catch (error) {
      console.error('Error listing configuration matrices:', error);
      return [];
    }
  }

  /**
   * Delete a configuration matrix
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('configuration_matrices')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    } catch (error) {
      console.error(`Error deleting matrix ${id}:`, error);
      throw new Error('Failed to delete configuration matrix');
    }
  }

  /**
   * Get all available options for a variant and spec code (filters out unavailable)
   */
  getAvailableOptions(
    variant: StoredConfigurationVariant,
    specCode: string
  ): StoredConfigurationOption[] {
    const specGroup = variant.specifications.find((s) => s.groupCode === specCode);
    if (!specGroup) {
      return [];
    }

    // Filter out options with availability === 0 (not available)
    return specGroup.options.filter((option) => option.availability > 0);
  }

  /**
   * Get all standard options for a variant (availability === 1)
   */
  getStandardOptions(variant: StoredConfigurationVariant): Record<string, StoredConfigurationOption> {
    const standardOptions: Record<string, StoredConfigurationOption> = {};

    variant.specifications.forEach((specGroup) => {
      const standardOption = specGroup.options.find((option) => option.availability === 1);
      if (standardOption) {
        standardOptions[specGroup.groupCode] = standardOption;
      }
    });

    return standardOptions;
  }

  /**
   * Calculate total configuration cost from selected options
   * Only counts non-standard options (availability > 1)
   */
  calculateConfigurationCost(
    variant: StoredConfigurationVariant,
    selections: Record<string, string>
  ): number {
    let totalCost = 0;

    Object.entries(selections).forEach(([specCode, optionCode]) => {
      const specGroup = variant.specifications.find((s) => s.groupCode === specCode);
      if (specGroup) {
        const option = specGroup.options.find((o) => o.optionCode === optionCode);
        if (option && option.availability > 1) {
          totalCost += option.eurCostDelta;
        }
      }
    });

    return totalCost;
  }

  /**
   * Generate human-readable summary from selections
   */
  generateConfigurationSummary(
    variant: StoredConfigurationVariant,
    selections: Record<string, string>
  ): string[] {
    const summary: string[] = [];

    summary.push(`${variant.variantName} (${variant.variantCode})`);

    Object.entries(selections).forEach(([specCode, optionCode]) => {
      const specGroup = variant.specifications.find((s) => s.groupCode === specCode);
      if (specGroup) {
        const option = specGroup.options.find((o) => o.optionCode === optionCode);
        if (option && option.availability > 1) {
          const costStr = option.eurCostDelta > 0 ? ` (+€${option.eurCostDelta.toLocaleString()})` : '';
          summary.push(`${option.description}${costStr}`);
        }
      }
    });

    return summary;
  }
}

// Singleton instance
export const configurationMatrixRepository = new ConfigurationMatrixRepository();
