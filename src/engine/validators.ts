import type { QuoteState, ValidationError, UnitSlot } from '../types/quote';
import type { ZAR } from '../types/quote';

/**
 * Validate that a quote can be submitted for approval via the chain
 */
export function validateApprovalSubmission(
  quote: QuoteState,
  submitter: { id: string; role: string },
  targetUser: { id: string; role: string }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!quote.id) {
    errors.push('Quote must be saved before submitting for approval');
  }

  if (quote.status !== 'draft' && quote.status !== 'changes-requested') {
    errors.push(`Quote cannot be submitted in "${quote.status}" status`);
  }

  const activeSlots = quote.slots.filter((s) => !s.isEmpty && s.modelCode !== '0');
  if (activeSlots.length === 0) {
    errors.push('Quote must have at least one configured unit');
  }

  if (!quote.clientName.trim()) {
    errors.push('Client name is required before submission');
  }

  if (submitter.id === targetUser.id) {
    errors.push('Cannot submit to yourself');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate quote state and return all errors/warnings
 */
export async function validateQuote(
  quote: QuoteState,
  _calculatedIRR: number | null,
  _totalDealValue: ZAR
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  const activeSlots = quote.slots.filter((s) => !s.isEmpty && s.modelCode !== '0');

  if (activeSlots.length === 0) {
    errors.push({
      field: 'slots',
      message: 'At least one unit must be configured',
      severity: 'error',
    });
  }

  if (quote.batteryChemistryLock) {
    const inconsistentBatteries = activeSlots.filter(
      (s) => s.batteryChemistry && s.batteryChemistry !== quote.batteryChemistryLock
    );

    if (inconsistentBatteries.length > 0) {
      errors.push({
        field: 'batteryChemistryLock',
        message: `Battery chemistry lock is set to ${quote.batteryChemistryLock}, but ${inconsistentBatteries.length} unit(s) have different chemistry`,
        severity: 'error',
      });
    }
  }

  if (!quote.clientName.trim()) {
    errors.push({
      field: 'clientName',
      message: 'Client name is required',
      severity: 'error',
    });
  }

  if (!quote.contactName.trim()) {
    errors.push({
      field: 'contactName',
      message: 'Contact name is required',
      severity: 'error',
    });
  }

  if (quote.customerROE < quote.factoryROE) {
    errors.push({
      field: 'customerROE',
      message: `Customer ROE (${quote.customerROE}) is lower than factory ROE (${quote.factoryROE}). This will result in negative margins.`,
      severity: 'warning',
    });
  }

  if (quote.customerROE <= 0 || quote.factoryROE <= 0) {
    errors.push({
      field: 'roe',
      message: 'ROE values must be greater than 0',
      severity: 'error',
    });
  }

  if (quote.discountPct < 0 || quote.discountPct > 100) {
    errors.push({
      field: 'discountPct',
      message: 'Discount must be between 0% and 100%',
      severity: 'error',
    });
  }

  if (quote.discountPct > 50) {
    errors.push({
      field: 'discountPct',
      message: `High discount of ${quote.discountPct}% may require special approval`,
      severity: 'warning',
    });
  }

  activeSlots.forEach((slot) => {
    if (slot.quantity <= 0) {
      errors.push({
        field: `slot${slot.slotIndex}`,
        message: `Unit ${slot.slotIndex + 1}: Quantity must be greater than 0`,
        severity: 'error',
      });
    }

    if (slot.operatingHoursPerMonth <= 0) {
      errors.push({
        field: `slot${slot.slotIndex}`,
        message: `Unit ${slot.slotIndex + 1}: Operating hours must be greater than 0`,
        severity: 'warning',
      });
    }

    if (slot.operatingHoursPerMonth > 720) {
      errors.push({
        field: `slot${slot.slotIndex}`,
        message: `Unit ${slot.slotIndex + 1}: Operating hours (${slot.operatingHoursPerMonth}) exceeds maximum hours in a month (720)`,
        severity: 'warning',
      });
    }
  });

  return errors;
}

/**
 * Synchronous validation using cached config
 */
export function validateQuoteSync(
  quote: QuoteState,
  _calculatedIRR: number | null,
  _totalDealValue: ZAR,
): ValidationError[] {
  const errors: ValidationError[] = [];

  const activeSlots = quote.slots.filter((s) => !s.isEmpty && s.modelCode !== '0');

  if (activeSlots.length === 0) {
    errors.push({
      field: 'slots',
      message: 'At least one unit must be configured',
      severity: 'error',
    });
  }

  if (quote.batteryChemistryLock) {
    const inconsistentBatteries = activeSlots.filter(
      (s) => s.batteryChemistry && s.batteryChemistry !== quote.batteryChemistryLock
    );

    if (inconsistentBatteries.length > 0) {
      errors.push({
        field: 'batteryChemistryLock',
        message: `Battery chemistry lock is set to ${quote.batteryChemistryLock}, but ${inconsistentBatteries.length} unit(s) have different chemistry`,
        severity: 'error',
      });
    }
  }

  if (!quote.clientName.trim()) {
    errors.push({
      field: 'clientName',
      message: 'Client name is required',
      severity: 'error',
    });
  }

  if (!quote.contactName.trim()) {
    errors.push({
      field: 'contactName',
      message: 'Contact name is required',
      severity: 'error',
    });
  }

  if (quote.customerROE < quote.factoryROE) {
    errors.push({
      field: 'customerROE',
      message: `Customer ROE (${quote.customerROE}) is lower than factory ROE (${quote.factoryROE}). This will result in negative margins.`,
      severity: 'warning',
    });
  }

  if (quote.customerROE <= 0 || quote.factoryROE <= 0) {
    errors.push({
      field: 'roe',
      message: 'ROE values must be greater than 0',
      severity: 'error',
    });
  }

  if (quote.discountPct < 0 || quote.discountPct > 100) {
    errors.push({
      field: 'discountPct',
      message: 'Discount must be between 0% and 100%',
      severity: 'error',
    });
  }

  if (quote.discountPct > 50) {
    errors.push({
      field: 'discountPct',
      message: `High discount of ${quote.discountPct}% may require special approval`,
      severity: 'warning',
    });
  }

  activeSlots.forEach((slot) => {
    if (slot.quantity <= 0) {
      errors.push({
        field: `slot${slot.slotIndex}`,
        message: `Unit ${slot.slotIndex + 1}: Quantity must be greater than 0`,
        severity: 'error',
      });
    }

    if (slot.operatingHoursPerMonth <= 0) {
      errors.push({
        field: `slot${slot.slotIndex}`,
        message: `Unit ${slot.slotIndex + 1}: Operating hours must be greater than 0`,
        severity: 'warning',
      });
    }

    if (slot.operatingHoursPerMonth > 720) {
      errors.push({
        field: `slot${slot.slotIndex}`,
        message: `Unit ${slot.slotIndex + 1}: Operating hours (${slot.operatingHoursPerMonth}) exceeds maximum hours in a month (720)`,
        severity: 'warning',
      });
    }
  });

  return errors;
}

/**
 * Check if quote can be submitted (no critical errors)
 */
export function canSubmitQuote(errors: ValidationError[]): boolean {
  return !errors.some((e) => e.severity === 'error');
}

/**
 * Validate ROE pair
 */
export function validateROEPair(
  factoryROE: number,
  customerROE: number
): string | null {
  if (factoryROE <= 0 || customerROE <= 0) {
    return 'ROE values must be greater than 0';
  }

  if (customerROE < factoryROE) {
    return `Customer ROE (${customerROE}) should not be lower than factory ROE (${factoryROE})`;
  }

  const spreadPct = ((customerROE - factoryROE) / factoryROE) * 100;

  if (spreadPct < 2) {
    return `Very low ROE spread (${spreadPct.toFixed(2)}%). Consider increasing customer ROE for better margins.`;
  }

  return null;
}

/**
 * Validate battery chemistry compatibility
 */
export function validateBatteryChemistry(
  slots: UnitSlot[],
  newChemistry: 'lead-acid' | 'lithium-ion' | null
): { valid: boolean; message?: string } {
  if (!newChemistry) {
    return { valid: true };
  }

  const activeSlots = slots.filter((s) => !s.isEmpty && s.batteryChemistry);

  if (activeSlots.length === 0) {
    return { valid: true };
  }

  const hasConflict = activeSlots.some((s) => s.batteryChemistry !== newChemistry);

  if (hasConflict) {
    const conflictCount = activeSlots.filter((s) => s.batteryChemistry !== newChemistry).length;
    return {
      valid: false,
      message: `Switching to ${newChemistry} will affect ${conflictCount} unit(s) with different battery chemistry. All batteries will be cleared.`,
    };
  }

  return { valid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string | null {
  if (!email?.trim()) return null;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) ? null : 'Invalid email format';
}

/**
 * Validate phone number
 */
export function validatePhone(phone: string): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 12) {
    return 'Phone must be 10-12 digits';
  }
  return null;
}
