# Bisedge Quotation Dashboard - Configuration Reference

This file documents all configurable values used throughout the system.

## 1. Exchange Rates (ROE)

**Files:** `src/store/useQuoteStore.ts` (initial state, lines ~135-136)

- **Factory ROE (default):** 19.20 EUR→ZAR
- **Customer ROE (default):** 20.60 EUR→ZAR

**How to update:** Edit initial state in `createInitialState()` function:
```typescript
factoryROE: 19.20,
customerROE: 20.60,
```

## 2. Approval Tiers

**File:** `src/data/approvalTiers.json`

```json
[
  { "tier": 1, "maxValue": 500000, "minIRR": 15, "approver": "Sales Manager" },
  { "tier": 2, "maxValue": 2000000, "minIRR": 12, "approver": "Regional Director" },
  { "tier": 3, "maxValue": 5000000, "minIRR": 10, "approver": "CFO" },
  { "tier": 4, "maxValue": 999999999, "minIRR": 8, "approver": "CEO" }
]
```

**To update:**
1. Edit the JSON file
2. Restart the application for changes to take effect

## 3. Commission Tiers

**File:** `src/data/commissionTiers.json`

```json
[
  { "minMargin": 0, "maxMargin": 15, "commissionPct": 2 },
  { "minMargin": 15, "maxMargin": 25, "commissionPct": 4 },
  { "minMargin": 25, "maxMargin": 35, "commissionPct": 6 },
  { "minMargin": 35, "maxMargin": 100, "commissionPct": 8 }
]
```

## 4. Residual Value Curves

**File:** `src/data/residualTables.json`

Lead-acid and lithium-ion residual percentages by lease term:

```json
{
  "lead-acid": {
    "36": 25,
    "48": 18,
    "60": 12,
    "72": 8,
    "84": 5
  },
  "lithium-ion": {
    "36": 35,
    "48": 28,
    "60": 22,
    "72": 18,
    "84": 14
  }
}
```

**To update:** Extract latest curves from Master Costing Sheet → Residual tab.

## 5. Default Lease Terms

**File:** `src/store/useQuoteStore.ts` (createInitialState function)

- **Default term:** 60 months
- **Available options:** 36, 48, 60, 72, 84 months
- **Default interest rate:** 9.5% annually

```typescript
defaultLeaseTermMonths: 60,
annualInterestRate: 9.5,
```

## 6. Escalation Settings

**File:** `src/engine/calculationEngine.ts` (calcEscalatedCost function, line ~176)

- **Default CPI rate:** 5.5% (South African CPI assumption)

```typescript
const rate = escalationType === 'CPI' ? cpiRate : escalationPct;
```

## 7. Default Costs

**File:** `src/store/useQuoteStore.ts` (createEmptySlot function)

- **Default telematics cost:** R250/month
- **Default operating hours:** 180 hours/month
- **Default quantity:** 1

```typescript
telematicsCostPerMonth: 250,
operatingHoursPerMonth: 180,
quantity: 1,
```

## 8. Container Specifications

**File:** `src/data/containers.json`

20ft, 40ft, 40ft HC dimensions (in cm), weight limits (kg), and costs (ZAR):

```json
[
  {
    "id": "20ft",
    "name": "20ft Standard",
    "dimensions": { "length": 589, "width": 234, "height": 238 },
    "maxWeight": 28000,
    "costZAR": 45000
  },
  {
    "id": "40ft",
    "name": "40ft Standard",
    "dimensions": { "length": 1203, "width": 234, "height": 238 },
    "maxWeight": 26500,
    "costZAR": 75000
  },
  {
    "id": "40ft-hc",
    "name": "40ft High Cube",
    "dimensions": { "length": 1203, "width": 234, "height": 269 },
    "maxWeight": 26330,
    "costZAR": 82000
  }
]
```

## 9. Forklift Models

**File:** `src/data/models.json`

Contains the full forklift model catalog with EUR costs, dimensions, specifications, etc.

**To update from Excel:**
1. Export model data from Master Costing Sheet
2. Convert to JSON format matching the structure
3. Replace the models.json file
4. Ensure all required fields are present:
   - modelCode, modelName, description, category
   - capacity, eurCost, defaultMast, availableMasts
   - dimensions (length, width, height, weight in cm/kg)
   - compatibleBatteries (array of battery IDs)
   - specifications (object with spec codes)

## 10. Battery Models

**Files:**
- `src/data/batteries-pb.json` (Lead-acid batteries)
- `src/data/batteries-li-ion.json` (Lithium-ion batteries)

**To update from Excel:**
1. Export battery data from PB Battery and Li-ion sheets
2. Convert to JSON format
3. Replace the respective JSON files
4. Ensure all required fields are present:
   - id, name, chemistry, voltage, capacity
   - eurCost, weight
   - dimensions (length, width, height in cm/kg)
   - compatibleModels (array of model codes)
   - warrantyYears

## 11. Margin Color Thresholds

**File:** `src/engine/calculationEngine.ts` (getMarginColorClass function, line ~207)

```typescript
if (margin >= 35) return 'margin-excellent';  // Green
if (margin >= 25) return 'margin-good';       // Teal
if (margin >= 15) return 'margin-acceptable'; // Yellow
return 'margin-poor';                         // Red
```

**CSS Classes:** Defined in `src/index.css` (lines 203-218)

## 12. Validation Rules

**File:** `src/engine/validators.ts`

Key validation thresholds:
- High discount warning: > 50%
- Operating hours warning: > 720 hours/month
- ROE spread warning: < 2%

## How to Apply Configuration Changes

1. **JSON files:** Changes take effect immediately on page refresh
2. **TypeScript files:** Requires rebuild (`npm run dev` will hot-reload)
3. **CSS files:** Hot-reload automatically in dev mode

## Backup and Version Control

**IMPORTANT:** Before making any configuration changes:
1. Create a backup of the file you're editing
2. Document the change with date and reason
3. Test thoroughly in a non-production environment
4. Consider using git to track configuration changes

## Support

For questions about configuration or to request new configurable parameters, contact the development team.

---

**Last Updated:** 2026-02-15
**Version:** 1.0.0
