# Phase 6: Financial and Commercial Correctness Validation

**Tester**: Claude (Opus 4.6)
**Date**: 2026-02-19
**Environment**: Codebase analysis (test suite review)
**Commit**: `df1e273` (working tree)

---

## Methodology

Financial correctness is partially validated by the existing test suite (50 calculation engine tests). Full benchmark scenarios require live browser testing with specific quote configurations.

---

## Automated Test Coverage

### calculationEngine.test.ts (50 tests - ALL PASS)

The calculation engine test suite covers:
- Margin calculation (`calcMargin`)
- Lease rate calculation (`calcLeaseRate`)
- Cost per hour (`calcCostPerHour`)
- Total contract value (`calcTotalContractValue`)
- IRR calculation
- NPV calculation
- Cash flow generation
- Clearing charge summation
- Local cost summation

**Confidence**: High for formula correctness at the engine level.

### commissionEngine
- Commission tier selection and calculation
- Margin-based tier band matching

---

## Required Benchmark Scenarios (Live Testing)

| # | Scenario | Key Characteristics | Status |
|---|----------|-------------------|--------|
| 1 | Simple single-unit rental | 1 unit, standard ROE, no attachments | **PENDING** |
| 2 | Multi-unit dual-type | 3 units, mixed rental/rent-to-own, attachments | **PENDING** |
| 3 | High local cost | Heavy clearing charges, manual battery override | **PENDING** |
| 4 | Revision scenario | Quote with revision, verify calculations carry over | **PENDING** |
| 5 | Edge case | 0% discount, max lease term (84 months), lithium battery | **PENDING** |

### Validation Points Per Scenario
- [ ] Margin basis uses landed cost
- [ ] Lease rate correct
- [ ] IRR/NPV outputs match engine
- [ ] Commission tier correct
- [ ] ROE conversion correct
- [ ] Discount applied correctly
- [ ] Shipping entries impact totals
- [ ] Monthly line items sum correctly
- [ ] PDF values match UI values

---

## Phase 6 Verdict: **PARTIAL PASS** — 50/50 engine tests pass. Live benchmark scenarios pending.
