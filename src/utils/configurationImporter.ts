import * as XLSX from 'xlsx';
import type {
  StoredConfigurationMatrix,
  StoredConfigurationVariant,
  StoredSpecificationGroup,
  StoredConfigurationOption,
  AvailabilityLevel,
} from '../db/interfaces';

export interface ImportResult {
  success: boolean;
  matrix?: StoredConfigurationMatrix;
  errors: string[];
  warnings: string[];
  stats: {
    variantsFound: number;
    specGroupsFound: number;
    optionsImported: number;
  };
}

/**
 * Parse Excel file for Linde configuration matrix
 *
 * Expected Excel structure:
 * Column A: Material Number (base model)
 * Column B: Long code (option identifier)
 * Column C: Spec Code (1100, 1135, etc.)
 * Column D: Description
 * Columns E-I: INDX1, INDX2, INDX3, INDX4, INDX5 (availability levels 0-3)
 */
export async function importConfigurationFromExcel(file: File): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    if (workbook.SheetNames.length === 0) {
      errors.push('Excel file has no sheets');
      return {
        success: false,
        errors,
        warnings,
        stats: { variantsFound: 0, specGroupsFound: 0, optionsImported: 0 },
      };
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (data.length < 2) {
      errors.push('Excel file has no data rows');
      return {
        success: false,
        errors,
        warnings,
        stats: { variantsFound: 0, specGroupsFound: 0, optionsImported: 0 },
      };
    }

    // Parse header row to identify columns
    const colMaterialNumber = 0; // Column A
    const colLongCode = 1; // Column B
    const colSpecCode = 2; // Column C
    const colDescription = 3; // Column D
    const colINDX1 = 4; // Column E

    // Group rows by Material Number to identify base model family
    const baseModelFamily = data[1][colMaterialNumber]?.toString() || 'UNKNOWN';

    // Parse variants from 1100 spec code rows
    const variants: StoredConfigurationVariant[] = [];
    const variantCodes: string[] = [];

    // First pass: identify variants from 1100 rows
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const specCode = row[colSpecCode]?.toString();

      if (specCode === '1100') {
        // This is a MODEL row - defines a variant
        const description = row[colDescription]?.toString() || '';

        // Extract variant codes from INDX columns (columns E-I = indexes 4-8)
        for (let indxCol = colINDX1; indxCol <= colINDX1 + 4; indxCol++) {
          const availability = parseAvailability(row[indxCol]);
          if (availability > 0) {
            // This INDX column represents a variant
            const variantIndex = indxCol - colINDX1;
            const variantCode = extractVariantCode(description, variantIndex);

            if (variantCode && !variantCodes.includes(variantCode)) {
              variantCodes.push(variantCode);
              variants.push({
                variantCode,
                variantName: description || `Variant ${variantIndex + 1}`,
                modelCode: baseModelFamily,
                baseEurCost: 0, // Will be set later
                specifications: [],
              });
            }
          }
        }
      }
    }

    if (variants.length === 0) {
      errors.push('No variants found in Excel file (no 1100 spec code rows)');
      return {
        success: false,
        errors,
        warnings,
        stats: { variantsFound: 0, specGroupsFound: 0, optionsImported: 0 },
      };
    }

    // Second pass: parse all options and assign to variants
    const specGroupsMap = new Map<string, Map<string, StoredConfigurationOption[]>>();
    let optionsImported = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const specCode = row[colSpecCode]?.toString();
      const longCode = row[colLongCode]?.toString() || '';
      const description = row[colDescription]?.toString() || '';

      if (!specCode || !longCode) {
        warnings.push(`Row ${i + 1}: Missing spec code or long code`);
        continue;
      }

      // Parse availability for each variant
      for (let variantIndex = 0; variantIndex < variants.length && variantIndex < 5; variantIndex++) {
        const indxCol = colINDX1 + variantIndex;
        const availability = parseAvailability(row[indxCol]);

        const option: StoredConfigurationOption = {
          optionCode: longCode,
          specCode,
          description,
          availability,
          eurCostDelta: 0, // Default to 0, can be updated later
          isDefault: availability === 1, // Standard options are default
        };

        // Store in map grouped by variant and spec code
        const variantCode = variants[variantIndex].variantCode;
        if (!specGroupsMap.has(variantCode)) {
          specGroupsMap.set(variantCode, new Map());
        }

        const variantMap = specGroupsMap.get(variantCode)!;
        if (!variantMap.has(specCode)) {
          variantMap.set(specCode, []);
        }

        variantMap.get(specCode)!.push(option);
        optionsImported++;
      }
    }

    // Third pass: organize options into specification groups
    const specGroupsSet = new Set<string>();

    variants.forEach((variant) => {
      const variantMap = specGroupsMap.get(variant.variantCode);
      if (!variantMap) return;

      const specifications: StoredSpecificationGroup[] = [];

      variantMap.forEach((options, specCode) => {
        specGroupsSet.add(specCode);

        specifications.push({
          groupCode: specCode,
          groupName: getSpecGroupName(specCode),
          category: getSpecCategory(specCode),
          options,
        });
      });

      variant.specifications = specifications;
    });

    // Create final matrix
    const matrix: StoredConfigurationMatrix = {
      id: crypto.randomUUID(),
      baseModelFamily,
      variants,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      matrix,
      errors,
      warnings,
      stats: {
        variantsFound: variants.length,
        specGroupsFound: specGroupsSet.size,
        optionsImported,
      },
    };
  } catch (error) {
    errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      errors,
      warnings,
      stats: { variantsFound: 0, specGroupsFound: 0, optionsImported: 0 },
    };
  }
}

/**
 * Parse availability level from Excel cell value
 */
function parseAvailability(value: any): AvailabilityLevel {
  const parsed = parseInt(value?.toString() || '0', 10);

  if (parsed === 0) return 0;
  if (parsed === 1) return 1;
  if (parsed === 2) return 2;
  if (parsed === 3) return 3;

  return 0; // Default to not available
}

/**
 * Extract variant code from description (heuristic)
 * Examples: "EG16P", "EG16H", "E20P"
 */
function extractVariantCode(description: string, variantIndex: number): string {
  // Try to extract variant code from description
  const match = description.match(/([A-Z]+\d+[A-Z]?)/);
  if (match) {
    return match[1];
  }

  // Fallback: use index-based naming
  return `VARIANT_${variantIndex + 1}`;
}

/**
 * Map spec code to human-readable group name
 */
function getSpecGroupName(specCode: string): string {
  const specNames: Record<string, string> = {
    '1100': 'MODEL',
    '1135': 'BATTERY TECHNOLOGY',
    '1200': 'PEDAL SYSTEM',
    '1300': 'WHEELS & TIRES',
    '2200': 'DRIVE AXLE',
    '2300': 'LOAD AXLE',
    '3200': 'MAST',
    '3300': 'HYDRAULICS',
    '4100': 'OPERATOR CONTROLS',
    '4200': 'LIGHTING',
    '4300': 'SAFETY FEATURES',
    '5100': 'CABIN',
    '5200': 'SEATING',
  };

  return specNames[specCode] || `SPEC ${specCode}`;
}

/**
 * Map spec code to category for UI grouping
 */
function getSpecCategory(specCode: string): string {
  const code = parseInt(specCode, 10);

  if (code >= 1100 && code < 1200) return 'Basic';
  if (code >= 1200 && code < 2000) return 'Battery';
  if (code >= 2000 && code < 3000) return 'Wheels & Tires';
  if (code >= 3000 && code < 4000) return 'Mast & Hydraulics';
  if (code >= 4000 && code < 5000) return 'Controls & Safety';
  if (code >= 5000 && code < 6000) return 'Cabin & Comfort';

  return 'Other';
}

/**
 * Export configuration matrix to Excel format
 */
export function exportConfigurationToExcel(matrix: StoredConfigurationMatrix): Blob {
  const data: any[][] = [];

  // Header row
  const variantHeaders = matrix.variants.map((v) => v.variantCode);
  data.push([
    'Material Number',
    'Long Code',
    'Spec Code',
    'Description',
    ...variantHeaders,
  ]);

  // Collect all unique spec codes across all variants
  const specCodesSet = new Set<string>();
  matrix.variants.forEach((variant) => {
    variant.specifications.forEach((spec) => {
      specCodesSet.add(spec.groupCode);
    });
  });

  const specCodes = Array.from(specCodesSet).sort();

  // For each spec code, collect all options
  specCodes.forEach((specCode) => {
    const optionsMap = new Map<string, StoredConfigurationOption[]>();

    // Collect options from all variants for this spec code
    matrix.variants.forEach((variant) => {
      const spec = variant.specifications.find((s) => s.groupCode === specCode);
      if (spec) {
        spec.options.forEach((option) => {
          if (!optionsMap.has(option.optionCode)) {
            optionsMap.set(option.optionCode, []);
          }
          optionsMap.get(option.optionCode)!.push(option);
        });
      }
    });

    // Write rows for each option
    optionsMap.forEach((options, optionCode) => {
      const firstOption = options[0];
      const row: any[] = [
        matrix.baseModelFamily,
        optionCode,
        specCode,
        firstOption.description,
      ];

      // Add availability for each variant
      matrix.variants.forEach(() => {
        const option = options.find(() => {
          return true; // Simplified for now - full logic would check spec
        });

        row.push(option?.availability ?? 0);
      });

      data.push(row);
    });
  });

  // Create worksheet and workbook
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Configuration Matrix');

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
