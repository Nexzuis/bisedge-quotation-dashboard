import { db } from './schema';
import type {
  StoredConfigurationMatrix,
  StoredConfigurationVariant,
  StoredConfigurationOption,
  IConfigurationMatrixRepository,
} from './interfaces';

export class ConfigurationMatrixRepository implements IConfigurationMatrixRepository {
  /**
   * Get configuration matrix by base model family (e.g., "EG16", "E20")
   */
  async getMatrixByModelFamily(family: string): Promise<StoredConfigurationMatrix | null> {
    try {
      const matrix = await db.configurationMatrices
        .where('baseModelFamily')
        .equals(family)
        .first();

      return matrix || null;
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
      const matrices = await db.configurationMatrices.toArray();

      for (const matrix of matrices) {
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
      const existing = await db.configurationMatrices.get(matrix.id);

      const toSave: StoredConfigurationMatrix = {
        ...matrix,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      await db.configurationMatrices.put(toSave);

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
      const matrix = await db.configurationMatrices.get(matrixId);

      if (!matrix) {
        throw new Error(`Matrix ${matrixId} not found`);
      }

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
      await db.configurationMatrices.put({
        ...matrix,
        updatedAt: new Date().toISOString(),
      });
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
      return await db.configurationMatrices.toArray();
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
      await db.configurationMatrices.delete(id);
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
   * FIXED: Only counts non-standard options (availability > 1)
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
        // FIXED: Only count non-standard options (availability > 1)
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

    // Add variant name
    summary.push(`${variant.variantName} (${variant.variantCode})`);

    // Add selected options (only non-standard ones with cost)
    Object.entries(selections).forEach(([specCode, optionCode]) => {
      const specGroup = variant.specifications.find((s) => s.groupCode === specCode);
      if (specGroup) {
        const option = specGroup.options.find((o) => o.optionCode === optionCode);
        if (option && option.availability > 1) {
          // Only show optional (2) and non-standard (3) items
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
