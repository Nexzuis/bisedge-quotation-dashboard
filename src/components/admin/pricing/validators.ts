import type { StoredCommissionTier, StoredResidualCurve } from '../../../db/interfaces';

export interface ValidationError {
  message: string;
  field?: string;
}

/**
 * Validate commission tiers configuration
 */
export const validateCommissionTiers = (tiers: StoredCommissionTier[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (tiers.length === 0) {
    errors.push({ message: 'At least one commission tier is required' });
    return errors;
  }

  // Check each tier
  tiers.forEach((tier, i) => {
    if (tier.minMargin >= tier.maxMargin) {
      errors.push({
        message: `Tier ${i + 1}: Min margin must be less than max margin`,
        field: `tier${i}`,
      });
    }

    if (tier.minMargin < 0 || tier.maxMargin > 100) {
      errors.push({
        message: `Tier ${i + 1}: Margin must be between 0% and 100%`,
        field: `tier${i}`,
      });
    }

    if (tier.commissionRate < 0 || tier.commissionRate > 100) {
      errors.push({
        message: `Tier ${i + 1}: Commission rate must be between 0% and 100%`,
        field: `tier${i}`,
      });
    }
  });

  // Sort by minMargin for contiguity check
  const sorted = [...tiers].sort((a, b) => a.minMargin - b.minMargin);

  // Check contiguous brackets (no gaps)
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].maxMargin !== sorted[i + 1].minMargin) {
      const gap = sorted[i + 1].minMargin - sorted[i].maxMargin;
      if (gap > 0) {
        errors.push({
          message: `Gap of ${gap}% between tier ${i + 1} and tier ${i + 2}`,
          field: 'gap',
        });
      }
    }
  }

  return errors;
};

/**
 * Validate residual curve configuration
 */
export const validateResidualCurve = (curve: StoredResidualCurve): ValidationError[] => {
  const errors: ValidationError[] = [];
  const terms = [36, 48, 60, 72, 84] as const;

  // Check range (0-100%)
  terms.forEach((term) => {
    const field = `term${term}` as keyof StoredResidualCurve;
    const val = curve[field] as number;

    if (val < 0 || val > 100) {
      errors.push({
        message: `${term}mo value must be between 0-100%`,
        field: field as string,
      });
    }
  });

  // Check decreasing values (longer term = lower residual)
  for (let i = 0; i < terms.length - 1; i++) {
    const currentField = `term${terms[i]}` as keyof StoredResidualCurve;
    const nextField = `term${terms[i + 1]}` as keyof StoredResidualCurve;
    const current = curve[currentField] as number;
    const next = curve[nextField] as number;

    if (current < next) {
      errors.push({
        message: `${terms[i]}mo value (${current}%) must be >= ${terms[i + 1]}mo value (${next}%)`,
        field: currentField as string,
      });
    }
  }

  return errors;
};

/**
 * Validate default values
 * Note: values may be strings from the settings table, so we convert to numbers for comparison
 */
export const validateDefaultValues = (values: Record<string, any>): ValidationError[] => {
  const errors: ValidationError[] = [];

  const factoryROE = Number(values.defaultFactoryROE);
  const roe = Number(values.defaultROE);
  const discountPct = Number(values.defaultDiscountPct);
  const interestRate = Number(values.defaultInterestRate);
  const cpiRate = Number(values.defaultCPIRate);
  const operatingHours = Number(values.defaultOperatingHours);
  const leaseTerm = Number(values.defaultLeaseTerm);
  const telematicsCost = Number(values.defaultTelematicsCost);
  const residualTruckPct = Number(values.defaultResidualTruckPct);

  if (values.defaultFactoryROE && (isNaN(factoryROE) || factoryROE <= 0 || factoryROE > 100)) {
    errors.push({ message: 'Factory ROE must be between 0 and 100', field: 'defaultFactoryROE' });
  }

  if (values.defaultROE && (isNaN(roe) || roe <= 0 || roe > 100)) {
    errors.push({ message: 'Default ROE must be between 0 and 100', field: 'defaultROE' });
  }

  if (values.defaultDiscountPct && (isNaN(discountPct) || discountPct < 0 || discountPct > 100)) {
    errors.push({ message: 'Discount must be between 0% and 100%', field: 'defaultDiscountPct' });
  }

  if (values.defaultInterestRate && (isNaN(interestRate) || interestRate < 0 || interestRate > 50)) {
    errors.push({ message: 'Default interest rate must be between 0% and 50%', field: 'defaultInterestRate' });
  }

  if (values.defaultCPIRate && (isNaN(cpiRate) || cpiRate < 0 || cpiRate > 30)) {
    errors.push({ message: 'Default CPI rate must be between 0% and 30%', field: 'defaultCPIRate' });
  }

  if (values.defaultOperatingHours && (isNaN(operatingHours) || operatingHours <= 0 || operatingHours > 720)) {
    errors.push({ message: 'Operating hours must be between 1 and 720 per month', field: 'defaultOperatingHours' });
  }

  if (values.defaultLeaseTerm && ![36, 48, 60, 72, 84].includes(leaseTerm)) {
    errors.push({ message: 'Lease term must be 36, 48, 60, 72, or 84 months', field: 'defaultLeaseTerm' });
  }

  if (values.defaultTelematicsCost && (isNaN(telematicsCost) || telematicsCost < 0)) {
    errors.push({ message: 'Telematics cost cannot be negative', field: 'defaultTelematicsCost' });
  }

  if (values.defaultResidualTruckPct && (isNaN(residualTruckPct) || residualTruckPct < 0 || residualTruckPct > 100)) {
    errors.push({ message: 'Residual truck value must be between 0% and 100%', field: 'defaultResidualTruckPct' });
  }

  return errors;
};
