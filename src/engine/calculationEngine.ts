import type { EUR, ZAR, BatteryChemistry, LeaseTermMonths, UnitSlot, ClearingCharges, LocalCosts } from '../types/quote';

/**
 * PMT Function - Excel-compatible payment calculation
 * Calculates the payment for a loan based on constant payments and a constant interest rate
 *
 * @param monthlyRate - Interest rate per period (annual rate / 12 / 100)
 * @param nPeriods - Total number of payment periods
 * @param presentValue - Present value (loan amount, typically negative)
 * @param futureValue - Future value (residual value)
 * @returns Monthly payment amount
 */
export function pmt(
  monthlyRate: number,
  nPeriods: number,
  presentValue: number,
  futureValue: number = 0
): number {
  if (!isFinite(nPeriods) || nPeriods <= 0) {
    return 0;
  }

  if (monthlyRate === 0) {
    return -(presentValue + futureValue) / nPeriods;
  }

  const pvif = Math.pow(1 + monthlyRate, nPeriods);
  return -(monthlyRate * (presentValue * pvif + futureValue) / (pvif - 1));
}

/**
 * IRR Function - Internal Rate of Return calculation
 * Uses Newton-Raphson method for finding the rate that makes NPV = 0
 *
 * @param cashFlows - Array of cash flows (negative = outflow, positive = inflow)
 * @param guess - Initial guess for the rate (default 0.1 = 10%)
 * @param maxIterations - Maximum iterations before giving up
 * @returns IRR as a decimal (e.g., 0.15 = 15%) or null if did not converge
 */
export function irr(
  cashFlows: number[],
  guess: number = 0.1,
  maxIterations: number = 1000
): number | null {
  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npvVal = 0;
    let dnpv = 0;

    for (let j = 0; j < cashFlows.length; j++) {
      const discount = Math.pow(1 + rate, j);
      npvVal += cashFlows[j] / discount;
      dnpv -= (j * cashFlows[j]) / Math.pow(1 + rate, j + 1);
    }

    // Protect against division by zero
    if (dnpv === 0 || !isFinite(dnpv)) return null;

    const newRate = rate - npvVal / dnpv;

    // Guard against NaN/Infinity propagation
    if (!isFinite(newRate) || isNaN(newRate)) return null;

    if (Math.abs(newRate - rate) < 1e-7) {
      return newRate;
    }

    rate = newRate;
  }

  return null; // Did not converge
}

/**
 * NPV Function - Net Present Value calculation
 *
 * @param rate - Discount rate (as decimal, e.g., 0.1 = 10%)
 * @param cashFlows - Array of cash flows (first element is typically initial investment)
 * @returns Net present value
 */
export function npv(rate: number, cashFlows: number[]): number {
  if (rate <= -1) return cashFlows[0] ?? 0;

  let presentValue = 0;

  for (let i = 0; i < cashFlows.length; i++) {
    presentValue += cashFlows[i] / Math.pow(1 + rate, i);
  }

  return presentValue;
}

/**
 * Sales Price Calculation (Legacy - kept for backward compat)
 * Converts EUR cost to ZAR sales price with ROE and discount
 *
 * @param eurCost - Cost in EUR
 * @param roe - Rate of Exchange (EUR → ZAR)
 * @param discountPct - Discount percentage (0-100)
 * @returns Sales price in ZAR
 */
export function calcSalesPrice(
  eurCost: EUR,
  roe: number,
  discountPct: number = 0
): ZAR {
  return eurCost * roe * (1 - discountPct / 100);
}

/**
 * Margin Calculation
 *
 * @param salesPrice - Sales price in ZAR
 * @param factoryCost - Factory cost in ZAR
 * @returns Margin as percentage (0-100)
 */
export function calcMargin(salesPrice: ZAR, factoryCost: ZAR): number {
  if (salesPrice === 0) return 0;
  return ((salesPrice - factoryCost) / salesPrice) * 100;
}

/**
 * Residual Value Calculation (Legacy - uses chemistry curves)
 * Uses battery chemistry-specific depreciation curves
 *
 * @param salesPrice - Initial sales price
 * @param batteryChemistry - Battery type (affects residual curve)
 * @param leaseTermMonths - Lease term in months
 * @param residualCurves - Residual percentage lookup table
 * @returns Residual value at end of lease
 */
export function calcResidualValue(
  salesPrice: ZAR,
  batteryChemistry: BatteryChemistry,
  leaseTermMonths: LeaseTermMonths,
  residualCurves: Record<BatteryChemistry, Record<string, number>>
): ZAR {
  const curve = residualCurves[batteryChemistry];
  const residualPct = curve?.[leaseTermMonths.toString()] ?? 0;
  return salesPrice * (residualPct / 100);
}

/**
 * Async version using database data
 */
export async function calcResidualValueFromDB(
  salesPrice: ZAR,
  batteryChemistry: BatteryChemistry,
  leaseTermMonths: LeaseTermMonths
): Promise<ZAR> {
  try {
    const { db } = await import('../db/schema');
    const curve = await db.residualCurves
      .where('chemistry')
      .equals(batteryChemistry)
      .first();

    if (!curve) return 0;

    const field = `term${leaseTermMonths}` as keyof typeof curve;
    const residualPct = (curve[field] as number) || 0;
    return salesPrice * (residualPct / 100);
  } catch (error) {
    console.error('Error calculating residual value from DB:', error);
    return 0;
  }
}

/**
 * Residual Value using per-slot percentage (new flow)
 *
 * @param sellingPrice - Selling price in ZAR
 * @param residualPct - Residual percentage (0-100)
 * @returns Residual value at end of lease
 */
export function calcResidualValueFromPct(sellingPrice: ZAR, residualPct: number): ZAR {
  return sellingPrice * (residualPct / 100);
}

/**
 * Lease Rate Calculation (Critical Formula #2)
 * Uses PMT function with residual value as future value
 *
 * @param salesPrice - Initial equipment value
 * @param annualInterestRate - Annual interest rate (percentage)
 * @param termMonths - Lease term in months
 * @param residualValue - Expected residual value at end
 * @returns Monthly lease payment
 */
export function calcLeaseRate(
  salesPrice: ZAR,
  annualInterestRate: number,
  termMonths: number,
  residualValue: ZAR
): ZAR {
  const monthlyRate = annualInterestRate / 12 / 100;
  return pmt(monthlyRate, termMonths, -salesPrice, residualValue);
}

/**
 * Total Monthly Cost Calculation (Legacy)
 * Aggregates all monthly costs
 */
export function calcTotalMonthly(
  leaseRate: ZAR,
  maintenanceCost: ZAR,
  fleetMgmtCost: ZAR,
  telematicsCost: ZAR
): ZAR {
  return leaseRate + maintenanceCost + fleetMgmtCost + telematicsCost;
}

/**
 * Cost Per Hour Calculation
 *
 * @param totalMonthly - Total monthly cost
 * @param operatingHoursPerMonth - Expected monthly operating hours
 * @returns Cost per operating hour
 */
export function calcCostPerHour(
  totalMonthly: ZAR,
  operatingHoursPerMonth: number
): ZAR {
  if (operatingHoursPerMonth === 0) return 0;
  return totalMonthly / operatingHoursPerMonth;
}

/**
 * Total Contract Value Calculation
 *
 * @param totalMonthly - Total monthly cost
 * @param termMonths - Lease term in months
 * @param quantity - Number of units
 * @returns Total contract value over full term
 */
export function calcTotalContractValue(
  totalMonthly: ZAR,
  termMonths: number,
  quantity: number = 1
): ZAR {
  return totalMonthly * termMonths * quantity;
}

/**
 * Escalated Cost Calculation
 * Applies annual escalation to costs (maintenance, fleet mgmt)
 */
export function calcEscalatedCost(
  baseCost: ZAR,
  year: number,
  escalationType: 'CPI' | 'fixed' | 'none',
  escalationPct: number = 0,
  cpiRate: number = 5.5
): ZAR {
  if (escalationType === 'none' || year <= 1) {
    return baseCost;
  }

  const rate = escalationType === 'CPI' ? cpiRate : escalationPct;
  return baseCost * Math.pow(1 + rate / 100, year - 1);
}

/**
 * Generate Cash Flow Array for IRR/NPV Calculation
 */
export function generateCashFlows(
  initialOutlay: ZAR,
  monthlyInflow: ZAR,
  monthlyCosts: ZAR,
  termMonths: number,
  residualValue: ZAR
): number[] {
  const cashFlows: number[] = [-initialOutlay];

  for (let month = 1; month <= termMonths; month++) {
    const net = monthlyInflow - monthlyCosts;

    // Add residual value in the final month
    if (month === termMonths) {
      cashFlows.push(net + residualValue);
    } else {
      cashFlows.push(net);
    }
  }

  return cashFlows;
}

/**
 * Calculate Margin Color Class
 */
export function getMarginColorClass(margin: number): string {
  if (margin >= 35) return 'margin-excellent';
  if (margin >= 25) return 'margin-good';
  if (margin >= 15) return 'margin-acceptable';
  return 'margin-poor';
}

/**
 * Payback Period Calculation
 */
export function calcPaybackPeriod(cashFlows: number[]): number | null {
  let cumulative = 0;

  for (let i = 0; i < cashFlows.length; i++) {
    cumulative += cashFlows[i];
    if (cumulative >= 0) {
      return i;
    }
  }

  return null; // Never breaks even
}

// --- New Fleet Builder Calculation Functions ---

/**
 * Sum all clearing charges
 */
export function sumClearingCharges(cc: ClearingCharges): ZAR {
  return cc.inlandFreight + cc.seaFreight + cc.portCharges + cc.transport + cc.destuffing + cc.duties + cc.warranty;
}

/**
 * Sum all local costs
 */
export function sumLocalCosts(lc: LocalCosts): ZAR {
  return lc.assembly + lc.loadTest + lc.delivery + lc.pdi + lc.extras;
}

/**
 * Calculate landed cost for a slot
 *
 * Formula: factoryZAR + clearing charges + local costs + battery + local attachments + local telematics
 *
 * @param slot - The unit slot with all cost fields
 * @param factoryROE - Factory rate of exchange (EUR → ZAR)
 * @returns Landed cost in ZAR
 */
export function calcLandedCost(slot: UnitSlot, factoryROE: number): ZAR {
  const grossEUR = slot.eurCost + (slot.configurationCost || 0) + (slot.attachmentsCost || 0);
  const discountMultiplier = (100 - (slot.discountPct || 0)) / 100;
  const factoryCostEUR = grossEUR * discountMultiplier;
  const factoryCostZAR = factoryCostEUR * factoryROE;
  const clearingTotal = sumClearingCharges(slot.clearingCharges);
  const localCostsTotal = sumLocalCosts(slot.localCosts);

  return (
    factoryCostZAR +
    clearingTotal +
    localCostsTotal +
    slot.localBatteryCostZAR +
    slot.localAttachmentCostZAR +
    slot.localTelematicsCostZAR
  );
}

/**
 * Calculate selling price from landed cost + markup
 *
 * @param landedCost - Landed cost in ZAR
 * @param markupPct - Markup percentage (0-100)
 * @returns Selling price in ZAR
 */
export function calcSellingPrice(landedCost: ZAR, markupPct: number): ZAR {
  return landedCost * (1 + markupPct / 100);
}

/**
 * Calculate monthly maintenance cost from per-hour rates
 *
 * @param slot - The unit slot with maintenance rate fields
 * @returns Monthly maintenance cost in ZAR
 */
export function calcMaintenanceMonthly(slot: UnitSlot): ZAR {
  return (
    (slot.maintenanceRateTruckPerHr + slot.maintenanceRateTiresPerHr + slot.maintenanceRateAttachmentPerHr) *
    slot.operatingHoursPerMonth
  );
}

/**
 * Calculate total monthly cost for a slot (new flow)
 *
 * Total = lease rate + maintenance + telematics selling + operator price
 *
 * @param leaseRate - Monthly lease payment
 * @param maintenanceMonthly - Monthly maintenance cost
 * @param telematicsSellingPerMonth - Telematics subscription selling price per month
 * @param operatorPricePerMonth - Operator price per month
 * @returns Total monthly cost in ZAR
 */
export function calcTotalMonthlyNew(
  leaseRate: ZAR,
  maintenanceMonthly: ZAR,
  telematicsSellingPerMonth: ZAR,
  operatorPricePerMonth: ZAR
): ZAR {
  return leaseRate + maintenanceMonthly + telematicsSellingPerMonth + operatorPricePerMonth;
}

/**
 * Full slot pricing calculation (new flow)
 * Computes the complete pricing chain for a unit slot.
 *
 * @param slot - The unit slot
 * @param factoryROE - Factory rate of exchange
 * @returns Object with all pricing components, or null if slot is empty
 */
export function calcSlotPricingFull(
  slot: UnitSlot,
  factoryROE: number
): {
  factoryCostEUR: EUR;
  factoryCostZAR: ZAR;
  landedCostZAR: ZAR;
  sellingPriceZAR: ZAR;
  margin: number;
  residualValue: ZAR;
  leaseRate: ZAR;
  maintenanceMonthly: ZAR;
  totalMonthly: ZAR;
  costPerHour: ZAR;
  totalContractValue: ZAR;
} | null {
  if (slot.isEmpty || slot.modelCode === '0') return null;

  // 1. Gross factory cost in EUR
  const grossEUR = slot.eurCost + (slot.configurationCost || 0) + (slot.attachmentsCost || 0);

  // 2. Apply discount (EU1 Column I) to get nett EUR
  const discountMultiplier = (100 - (slot.discountPct || 0)) / 100;
  const factoryCostEUR = grossEUR * discountMultiplier;

  // 3. Factory cost in ZAR
  const factoryCostZAR = factoryCostEUR * factoryROE;

  // 4. Landed cost
  const landedCostZAR = calcLandedCost(slot, factoryROE);

  // 4. Selling price
  const sellingPriceZAR = calcSellingPrice(landedCostZAR, slot.markupPct);

  // 5. Margin
  const margin = calcMargin(sellingPriceZAR, landedCostZAR);

  // 6. Residual value
  const residualValue = calcResidualValueFromPct(sellingPriceZAR, slot.residualValueTruckPct);

  // 7. Lease rate
  const leaseRate = calcLeaseRate(sellingPriceZAR, slot.financeCostPct, slot.leaseTermMonths, residualValue);

  // 8. Maintenance
  const maintenanceMonthly = calcMaintenanceMonthly(slot);

  // 9. Total monthly
  const totalMonthly = calcTotalMonthlyNew(
    leaseRate,
    maintenanceMonthly,
    slot.telematicsSubscriptionSellingPerMonth,
    slot.operatorPricePerMonth
  );

  // 10. Cost per hour
  const costPerHour = calcCostPerHour(totalMonthly, slot.operatingHoursPerMonth);

  // 11. Total contract value
  const totalContractValue = calcTotalContractValue(totalMonthly, slot.leaseTermMonths, slot.quantity);

  return {
    factoryCostEUR,
    factoryCostZAR,
    landedCostZAR,
    sellingPriceZAR,
    margin,
    residualValue,
    leaseRate,
    maintenanceMonthly,
    totalMonthly,
    costPerHour,
    totalContractValue,
  };
}
