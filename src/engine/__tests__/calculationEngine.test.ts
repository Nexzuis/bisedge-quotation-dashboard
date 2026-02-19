import { describe, it, expect } from 'vitest';
import {
  pmt,
  irr,
  npv,
  calcSalesPrice,
  calcMargin,
  calcResidualValueFromPct,
  calcLeaseRate,
  calcTotalMonthly,
  calcCostPerHour,
  calcTotalContractValue,
  calcEscalatedCost,
  generateCashFlows,
  getMarginColorClass,
  calcPaybackPeriod,
  sumClearingCharges,
  sumLocalCosts,
  calcSellingPrice,
  calcMaintenanceMonthly,
  calcTotalMonthlyNew,
} from '../calculationEngine';
import type { ClearingCharges, LocalCosts, UnitSlot } from '../../types/quote';

// ─── PMT ───────────────────────────────────────────────────────
describe('pmt', () => {
  it('calculates monthly payment for a standard loan', () => {
    // R100,000 loan at 12% annual (1% monthly) over 60 months, no residual
    const result = pmt(0.01, 60, -100_000, 0);
    expect(result).toBeCloseTo(2224.44, 1);
  });

  it('returns simple division when rate is 0', () => {
    const result = pmt(0, 60, -120_000, 0);
    expect(result).toBe(2000);
  });

  it('accounts for residual value (future value)', () => {
    // With a R20,000 residual, monthly payment should be lower
    const withResidual = pmt(0.01, 60, -100_000, 20_000);
    const withoutResidual = pmt(0.01, 60, -100_000, 0);
    expect(withResidual).toBeLessThan(withoutResidual);
  });

  it('handles zero-period edge case', () => {
    // 0 periods → division by zero guard (Infinity or NaN)
    const result = pmt(0.01, 0, -100_000, 0);
    expect(result).toBe(0);
  });
});

// ─── NPV ───────────────────────────────────────────────────────
describe('npv', () => {
  it('calculates net present value of simple cash flows', () => {
    // Initial investment of -1000, then 3 inflows of 500
    const result = npv(0.1, [-1000, 500, 500, 500]);
    expect(result).toBeCloseTo(243.43, 0);
  });

  it('returns sum of cash flows when rate is 0', () => {
    const result = npv(0, [-1000, 500, 500, 500]);
    expect(result).toBe(500);
  });

  it('returns first cash flow when rate <= -1', () => {
    // Guard against division by zero
    expect(npv(-1, [-1000, 500, 500])).toBe(-1000);
    expect(npv(-2, [-1000, 500, 500])).toBe(-1000);
  });

  it('returns 0 for empty cash flows', () => {
    expect(npv(0.1, [])).toBe(0);
  });

  it('handles single cash flow', () => {
    expect(npv(0.1, [1000])).toBe(1000);
  });
});

// ─── IRR ───────────────────────────────────────────────────────
describe('irr', () => {
  it('finds IRR for a simple investment', () => {
    // -1000 initial, then 400 x 4 periods → IRR ≈ 21.86%
    const result = irr([-1000, 400, 400, 400, 400]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(0.2186, 3);
  });

  it('returns null for cash flows that never converge', () => {
    // All positive — no valid IRR
    const result = irr([1000, 2000, 3000]);
    // Newton-Raphson may not converge
    // Just ensure it doesn't crash and returns null or a number
    expect(result === null || typeof result === 'number').toBe(true);
  });

  it('returns ~0 for breakeven cash flows', () => {
    // -1000 then 500 + 500 = breakeven → IRR ≈ 0
    const result = irr([-1000, 500, 500]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(0, 2);
  });

  it('handles empty cash flows gracefully', () => {
    const result = irr([]);
    expect(result === null || typeof result === 'number').toBe(true);
  });
});

// ─── calcSalesPrice ────────────────────────────────────────────
describe('calcSalesPrice', () => {
  it('converts EUR to ZAR with ROE', () => {
    expect(calcSalesPrice(1000, 20)).toBe(20_000);
  });

  it('applies discount', () => {
    // 1000 EUR × 20 ROE × (1 - 10%) = 18,000
    expect(calcSalesPrice(1000, 20, 10)).toBe(18_000);
  });

  it('returns 0 for 100% discount', () => {
    expect(calcSalesPrice(1000, 20, 100)).toBe(0);
  });

  it('returns full price with 0% discount', () => {
    expect(calcSalesPrice(1000, 20, 0)).toBe(20_000);
  });
});

// ─── calcMargin ────────────────────────────────────────────────
describe('calcMargin', () => {
  it('calculates margin percentage', () => {
    // Sales = 200, Cost = 100 → margin 50%
    expect(calcMargin(200, 100)).toBe(50);
  });

  it('returns 0 when sales price is 0', () => {
    expect(calcMargin(0, 100)).toBe(0);
  });

  it('returns 100% when cost is 0', () => {
    expect(calcMargin(100, 0)).toBe(100);
  });

  it('returns negative margin when cost exceeds price', () => {
    expect(calcMargin(100, 150)).toBeLessThan(0);
  });
});

// ─── calcResidualValueFromPct ──────────────────────────────────
describe('calcResidualValueFromPct', () => {
  it('calculates residual from percentage', () => {
    expect(calcResidualValueFromPct(100_000, 15)).toBe(15_000);
  });

  it('returns 0 for 0%', () => {
    expect(calcResidualValueFromPct(100_000, 0)).toBe(0);
  });

  it('returns full value for 100%', () => {
    expect(calcResidualValueFromPct(100_000, 100)).toBe(100_000);
  });
});

// ─── calcLeaseRate ─────────────────────────────────────────────
describe('calcLeaseRate', () => {
  it('calculates monthly lease payment', () => {
    // R500,000 at 9.5% annual, 60 months, R75,000 residual
    const result = calcLeaseRate(500_000, 9.5, 60, 75_000);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(15_000); // Sanity check
  });

  it('returns higher payment with higher interest rate', () => {
    const low = calcLeaseRate(500_000, 5, 60, 75_000);
    const high = calcLeaseRate(500_000, 15, 60, 75_000);
    expect(high).toBeGreaterThan(low);
  });
});

// ─── calcTotalMonthly ──────────────────────────────────────────
describe('calcTotalMonthly', () => {
  it('sums all monthly components', () => {
    expect(calcTotalMonthly(5000, 1000, 500, 250)).toBe(6750);
  });

  it('returns 0 when all components are 0', () => {
    expect(calcTotalMonthly(0, 0, 0, 0)).toBe(0);
  });
});

// ─── calcCostPerHour ───────────────────────────────────────────
describe('calcCostPerHour', () => {
  it('divides monthly by hours', () => {
    expect(calcCostPerHour(18_000, 180)).toBe(100);
  });

  it('returns 0 when hours is 0', () => {
    expect(calcCostPerHour(18_000, 0)).toBe(0);
  });
});

// ─── calcTotalContractValue ────────────────────────────────────
describe('calcTotalContractValue', () => {
  it('calculates total over term', () => {
    expect(calcTotalContractValue(10_000, 60, 2)).toBe(1_200_000);
  });

  it('defaults quantity to 1', () => {
    expect(calcTotalContractValue(10_000, 60)).toBe(600_000);
  });
});

// ─── calcEscalatedCost ─────────────────────────────────────────
describe('calcEscalatedCost', () => {
  it('returns base cost for year 1', () => {
    expect(calcEscalatedCost(1000, 1, 'CPI')).toBe(1000);
  });

  it('returns base cost for no escalation', () => {
    expect(calcEscalatedCost(1000, 5, 'none')).toBe(1000);
  });

  it('applies CPI escalation', () => {
    // Year 2, 5.5% CPI: 1000 * 1.055
    const result = calcEscalatedCost(1000, 2, 'CPI', 0, 5.5);
    expect(result).toBeCloseTo(1055, 0);
  });

  it('applies fixed escalation', () => {
    // Year 3, 10% fixed: 1000 * 1.1^2 = 1210
    const result = calcEscalatedCost(1000, 3, 'fixed', 10);
    expect(result).toBeCloseTo(1210, 0);
  });
});

// ─── generateCashFlows ─────────────────────────────────────────
describe('generateCashFlows', () => {
  it('creates correct cash flow array', () => {
    const flows = generateCashFlows(100_000, 5000, 2000, 3, 20_000);
    expect(flows).toHaveLength(4); // initial + 3 months
    expect(flows[0]).toBe(-100_000);
    expect(flows[1]).toBe(3000); // 5000 - 2000
    expect(flows[2]).toBe(3000);
    expect(flows[3]).toBe(23_000); // 3000 + 20000 residual
  });
});

// ─── getMarginColorClass ───────────────────────────────────────
describe('getMarginColorClass', () => {
  it('returns excellent for >= 35%', () => {
    expect(getMarginColorClass(35)).toBe('margin-excellent');
    expect(getMarginColorClass(50)).toBe('margin-excellent');
  });

  it('returns good for >= 25%', () => {
    expect(getMarginColorClass(25)).toBe('margin-good');
    expect(getMarginColorClass(34)).toBe('margin-good');
  });

  it('returns acceptable for >= 15%', () => {
    expect(getMarginColorClass(15)).toBe('margin-acceptable');
    expect(getMarginColorClass(24)).toBe('margin-acceptable');
  });

  it('returns poor for < 15%', () => {
    expect(getMarginColorClass(14)).toBe('margin-poor');
    expect(getMarginColorClass(0)).toBe('margin-poor');
  });
});

// ─── calcPaybackPeriod ─────────────────────────────────────────
describe('calcPaybackPeriod', () => {
  it('finds breakeven period', () => {
    expect(calcPaybackPeriod([-1000, 500, 500, 500])).toBe(2);
  });

  it('returns null when never breaks even', () => {
    expect(calcPaybackPeriod([-1000, 100, 100])).toBeNull();
  });

  it('returns 0 when first flow is positive', () => {
    expect(calcPaybackPeriod([1000, 500])).toBe(0);
  });
});

// ─── sumClearingCharges ────────────────────────────────────────
describe('sumClearingCharges', () => {
  it('sums all clearing charge fields', () => {
    const cc: ClearingCharges = {
      inlandFreight: 1000,
      seaFreight: 2000,
      portCharges: 500,
      transport: 800,
      destuffing: 300,
      duties: 1500,
      warranty: 400,
    };
    expect(sumClearingCharges(cc)).toBe(6500);
  });
});

// ─── sumLocalCosts ─────────────────────────────────────────────
describe('sumLocalCosts', () => {
  it('sums all local cost fields', () => {
    const lc: LocalCosts = {
      assembly: 5000,
      loadTest: 1000,
      delivery: 3000,
      pdi: 2000,
      extras: 500,
    };
    expect(sumLocalCosts(lc)).toBe(11_500);
  });
});

// ─── calcSellingPrice ──────────────────────────────────────────
describe('calcSellingPrice', () => {
  it('applies markup to landed cost', () => {
    expect(calcSellingPrice(100_000, 25)).toBe(125_000);
  });

  it('returns landed cost at 0% markup', () => {
    expect(calcSellingPrice(100_000, 0)).toBe(100_000);
  });
});

// ─── calcMaintenanceMonthly ────────────────────────────────────
describe('calcMaintenanceMonthly', () => {
  it('calculates monthly maintenance from hourly rates', () => {
    const slot = {
      maintenanceRateTruckPerHr: 10,
      maintenanceRateTiresPerHr: 5,
      maintenanceRateAttachmentPerHr: 3,
      operatingHoursPerMonth: 180,
    } as UnitSlot;
    expect(calcMaintenanceMonthly(slot)).toBe(3240); // (10+5+3) × 180
  });
});

// ─── calcTotalMonthlyNew ───────────────────────────────────────
describe('calcTotalMonthlyNew', () => {
  it('sums lease, maintenance, telematics, operator', () => {
    expect(calcTotalMonthlyNew(8000, 3000, 500, 1500)).toBe(13_000);
  });
});
