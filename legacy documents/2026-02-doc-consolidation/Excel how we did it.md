# Excel Sheet Structure & Data Extraction Guide

## Source File
`BIS Edge Master Costing Sheet 2025.xlsx` — the master quotation workbook used by sales reps.

---

## Sheet Overview

| Sheet | Purpose |
|-------|---------|
| **Price List EU** | Master product catalog: all series, models, options with EUR prices and INDX availability columns |
| **EU1** (through EU6) | Per-unit costing sheets — one per slot. Contains the full pricing chain from EUR cost to landed cost |
| **Summary** | Aggregates all EU slots with commercial fields (markup, residual values, maintenance rates, lease calculations) |
| **Cont QTY** | Container quantity mappings per series + Telematics packages with ZAR prices |
| **Approval sheet** | Approval tier configuration and workflow |
| **Li-ion** | Lithium-ion battery residual curves |
| **PB Battery** | Lead-acid battery residual curves |
| **LX1** | Additional costing variant |
| **Export** | Export/print-ready version |
| **Summary of specs** | Spec summary for documentation |
| **IRR calc** / **IRR sheets** | Internal Rate of Return calculations |
| **Sheet1** | Scratch/working sheet |

---

## Price List EU — Product Catalog

### Column Layout

| Column | Header | Content |
|--------|--------|---------|
| A | Material Number | Full material number (e.g., `12750000001100001`) |
| B-J | Truck 1-9 | Truck variant columns (not used in extraction) |
| K | Series | Series code (e.g., `12750000000`) |
| L | Material Number | Duplicate of column A |
| M | Heading | Spec code (e.g., `1135`, `2200`, `3100`) |
| N | Description | Human-readable option description |
| O | Model Description | Full model description text |
| P | Price | EUR price for the option/model |
| Q | CUR | Currency code (EUR) |
| R-AK | INDX1-INDX20 | Availability per model variant (0/1/2/3) |
| AL-AN | TEXT1-TEXT3 | Text description fields |
| AO-BJ | INDX21-INDX42 | Additional availability columns |
| BK | KTEXT | Additional text |

### INDX Availability Levels

| Value | Meaning | UI Treatment |
|-------|---------|-------------|
| 0 | Unavailable | Greyed out, not selectable |
| 1 | Standard (included) | Auto-selected, shown as "Standard" |
| 2 | Optional | Checkbox, shows "+EUR price" |
| 3 | Non-Standard | Checkbox, warning color, shows "+EUR price" |

### How Models & Options Are Organized

- Each **Series** (identified by column K) contains multiple rows
- The **first row** of a series (where spec code in column M is empty or "0000") is the **base model** with its base EUR price
- Subsequent rows are **configuration options** grouped by spec code
- Each model within a series maps to a specific **INDX column** (1-42) that determines which options are available/standard/optional for that model

### Key Spec Codes

| Spec Code | Category | Notes |
|-----------|----------|-------|
| 1135 | Battery type | Lead acid vs lithium-ion battery compartment config |
| 2200 | Battery compartment | Physical compartment option — NOT an actual battery. The real battery cost is a separate manual ZAR entry |
| 3100 | Mast type | Various mast heights and types |
| Various | Hydraulics, wheels, seats, etc. | Other configuration options |

---

## EU1 Sheet — Per-Unit Costing

### Header Area
- **Cell J6**: ROE (Rate of Exchange EUR → ZAR), e.g., `19.73`

### Column Layout (D through J)

| Column | Header | Content |
|--------|--------|---------|
| D | Label | Row category label |
| E | Heading/Detail | Sub-category or detail text |
| F | Description | Full description |
| G | QTY | Quantity or currency indicator |
| H | UNIT COST | Unit cost in EUR |
| I | DISCOUNT % | Discount percentage (0-100) |
| J | NETT COST | Net cost after discount |

### Discount Formula (Column J)
```excel
=IFERROR(ROUND(G13*H13*(100-I13)/100, 0), "")
```
**In code**: `NETT_EUR = QTY × UNIT_COST × (100 - DISCOUNT%) / 100`

The discount is applied **uniformly to all EUR line items before ROE conversion**.

### Row Structure

| Rows | Content | Description |
|------|---------|-------------|
| 11-85 | Truck + Options | Base truck cost + all configuration options (EUR) |
| 86 | EUR Total | Sum of truck + options in EUR |
| 87 | ZAR Total | EUR total × ROE |
| 88-96 | Factory Attachments | Attachment items (EUR) |
| 98 | Grand Total EUR | Truck + attachments EUR |
| 99 | Grand Total ZAR | Grand total × ROE |
| 100-109 | Clearing Charges | All in ZAR |
| 111-121 | Local Costs | All in ZAR |
| 123-127 | Local Battery Cost | Manual ZAR entry |
| 129-133 | Local Attachment Cost | Manual ZAR entry |
| 135-140 | Local Telematics Cost | Manual ZAR entry |
| 142 | **Landed Cost** | Sum of everything above |

### Clearing Charges Breakdown (Rows 100-109)

| Field | Description |
|-------|-------------|
| Inland Freight | Transport from factory to port |
| Sea Freight | Shipping cost |
| Port Charges | Port handling fees |
| Transport | Local transport from port |
| Destuffing | Container unloading |
| Duties | Import duties |
| Warranty | Warranty provision |

### Local Costs Breakdown (Rows 111-121)

| Field | Description |
|-------|-------------|
| Assembly | Local assembly cost |
| Load Test | Load testing fee |
| Delivery | Final delivery to customer |
| PDI | Pre-delivery inspection |
| Extras | Additional local costs |

---

## Summary Sheet — Commercial Fields

### Column Layout

| Column | Field | Description |
|--------|-------|-------------|
| B | S/N | Serial/slot number |
| C | Model | Model code |
| D | Truck Cost EUR | Factory cost in EUR |
| E | Truck Cost ZAR | Factory cost in ZAR (D × ROE) |
| F | Battery factory | Factory battery cost |
| G | Battery local | Local battery cost (ZAR) |
| H | Attachment factory | Factory attachment cost |
| I | Attachment local | Local attachment cost (ZAR) |
| J | Telematics factory | Factory telematics cost |
| K | Telematics local | Local telematics cost (ZAR) |
| L | Freight | Freight/clearing charges total |
| M | Other local | Other local costs total |
| N | **Landed cost** | Sum of all above |
| O | **Markup %** | Markup percentage (editable) |
| P | **Selling price** | Landed cost × (1 + markup%) |
| Q-R | Commission | Commission calculation fields |
| S | Sales price | Final sales price |
| U | Operating hours | Monthly operating hours |
| V | Lease term | Lease term in months (36/48/60/72/84) |
| W | Contract hours | Total contract hours (U × V) |
| X | **Residual % (truck)** | Truck residual value percentage |
| Y | **Residual % (battery)** | Battery residual value percentage |
| Z | **Residual % (attachment)** | Attachment residual value percentage |
| AA-AC | Residual base values | Base values for residual calculation |
| AD | Residual ZAR | Total residual value in ZAR |
| AE | **Finance cost %** | Annual finance/interest rate |
| AF | Lease price | Monthly lease payment (PMT calculation) |
| AH | **Maintenance rate truck/hr** | Per-hour truck maintenance rate |
| AI | **Maintenance rate tires/hr** | Per-hour tire maintenance rate |
| AJ | **Maintenance rate attachment/hr** | Per-hour attachment maintenance rate |
| AK-AL | Maintenance total | Monthly maintenance cost |
| AN | **Telematics subscription cost/month** | Monthly telematics cost to company |
| AO | **Telematics subscription selling/month** | Monthly telematics charge to customer |
| AQ | **Operator price/month** | Monthly operator cost |

### Pricing Chain (how Summary builds the total)

```
1. Factory EUR (from EU1) × ROE → Factory ZAR
2. + Clearing charges + Local costs + Local battery + Local attachments + Local telematics → Landed Cost
3. Landed Cost × (1 + Markup%) → Selling Price
4. PMT(Finance%, Term, -SellingPrice, ResidualValue) → Monthly Lease Rate
5. (Truck/hr + Tires/hr + Attachment/hr) × Operating Hours → Monthly Maintenance
6. Lease Rate + Maintenance + Telematics Selling + Operator Price → Total Monthly
7. Total Monthly × Term × Quantity → Total Contract Value
```

---

## Cont QTY Sheet — Containers & Telematics

### Container Mappings
Maps each series to container specifications:

| Field | Description |
|-------|-------------|
| Series Code | Which product series |
| Category | Product category |
| Model | Model identifier |
| Qty Per Container | How many units fit in one container |
| Container Type | 20ft / 40ft / 40ft HC |
| Container Cost EUR | Cost per container in EUR |
| Notes | Special packing notes |

### Telematics Packages (separate section on same sheet)

| Column | Field |
|--------|-------|
| L | Package name |
| M | Description |
| N | Tags |
| O | Price (ZAR) |

---

## How We Extracted the Data

### Extraction Script
We created `scripts/extract-spreadsheet-data.cjs` (now deleted after extraction) that used the `xlsx` Node.js library to:

1. Read `Price List EU` sheet → parsed all series, models, options with INDX columns and EUR prices
2. Read `Cont QTY` sheet → parsed container mappings and telematics packages
3. Output to JSON seed files in `src/data/`

### Generated JSON Files

| File | Content | Source Sheet |
|------|---------|-------------|
| `src/data/priceListSeries.json` | ~80 series with models, options, INDX availability, EUR prices | Price List EU |
| `src/data/containerMappings.json` | Container type/qty/cost per series | Cont QTY |
| `src/data/telematicsPackages.json` | Telematics package options with ZAR prices | Cont QTY |
| `src/data/clearingChargeDefaults.json` | Default clearing charge structure | EU1 |

### Data Structure — priceListSeries.json

```typescript
{
  seriesCode: string;          // "12750000000"
  seriesName: string;          // "1275"
  models: [{
    materialNumber: string;    // "12750000001100001"
    modelName: string;         // "E16C"
    baseEurCost: number;       // 29745
    indxColumn: number;        // 1-42, which INDX column this model uses
  }];
  options: [{
    materialNumber: string;    // "12750000001135005"
    specCode: string;          // "1135"
    description: string;       // "Lead acid batteries"
    eurPrice: number;          // 0 (standard) or actual EUR price
    availability: number[];    // [1, 1, 1, 1, 1] per INDX column
  }];
}
```

---

## How the App Maps to the Excel

### UnitSlot (app) ↔ EU1 Sheet (Excel)

| App Field | Excel Location | Notes |
|-----------|---------------|-------|
| `seriesCode` | Price List EU col K | Series identifier |
| `modelCode` | Price List EU col A | Material number |
| `eurCost` | Price List EU col P | Base EUR cost |
| `discountPct` | EU1 col I | Applied before ROE conversion |
| `configuration` | EU1 rows 11-85 | Spec code → option selections |
| `configurationCost` | EU1 col J (sum of optional/non-standard) | EUR cost of selected options |
| `clearingCharges.*` | EU1 rows 100-109 | 7 ZAR fields |
| `localCosts.*` | EU1 rows 111-121 | 5 ZAR fields |
| `localBatteryCostZAR` | EU1 rows 123-127 | Manual ZAR entry |
| `localAttachmentCostZAR` | EU1 rows 129-133 | Manual ZAR entry |
| `localTelematicsCostZAR` | EU1 rows 135-140 | Manual ZAR entry |
| `markupPct` | Summary col O | Editable |
| `residualValueTruckPct` | Summary col X | Editable |
| `residualValueBatteryPct` | Summary col Y | Editable |
| `residualValueAttachmentPct` | Summary col Z | Editable |
| `financeCostPct` | Summary col AE | Annual rate |
| `maintenanceRateTruckPerHr` | Summary col AH | ZAR per hour |
| `maintenanceRateTiresPerHr` | Summary col AI | ZAR per hour |
| `maintenanceRateAttachmentPerHr` | Summary col AJ | ZAR per hour |
| `telematicsSubscriptionCostPerMonth` | Summary col AN | ZAR per month |
| `telematicsSubscriptionSellingPerMonth` | Summary col AO | ZAR per month |
| `operatorPricePerMonth` | Summary col AQ | ZAR per month |

### Key Formulas Replicated in Code

| Formula | Excel | Code Function |
|---------|-------|---------------|
| Discount | `=QTY*UNIT_COST*(100-DISC%)/100` | Applied in `calcLandedCost()` and `calcSlotPricingFull()` |
| Landed Cost | Sum of factory ZAR + clearing + local + battery + attachments + telematics | `calcLandedCost()` |
| Selling Price | `=LandedCost*(1+Markup%/100)` | `calcSellingPrice()` |
| Residual Value | `=SellingPrice*ResidualPct/100` | `calcResidualValueFromPct()` |
| Lease Rate | `=PMT(FinanceCost%/12, Term, -SellingPrice, ResidualValue)` | `calcLeaseRate()` → `pmt()` |
| Maintenance | `=(TruckRate+TiresRate+AttachmentRate)*OperatingHours` | `calcMaintenanceMonthly()` |
| Total Monthly | `=LeaseRate+Maintenance+TelematicsSelling+OperatorPrice` | `calcTotalMonthlyNew()` |
| Cost Per Hour | `=TotalMonthly/OperatingHours` | `calcCostPerHour()` |
| Total Contract | `=TotalMonthly*Term*Quantity` | `calcTotalContractValue()` |

---

## Important Notes for Future Work

1. **Spec 2200 is NOT a battery** — it's the battery compartment configuration option. The actual battery cost is a separate manual ZAR field (`localBatteryCostZAR`).

2. **Container costs are manual** — the rep enters a cost from a shipping quote. The `containerMappings` data is reference only (how many units fit per container).

3. **Dual ROE system** — `factoryROE` is the internal rate used for cost conversion, `customerROE` is for customer-facing pricing. Currently only `factoryROE` is used in the new pricing chain.

4. **EU1 through EU6** — the Excel has 6 unit sheets (EU1-EU6), matching our 6 slot system. Each sheet is identical in structure.

5. **The extraction script was deleted** after generating JSON files. If you need to re-extract data from a new version of the Excel file, create a new script following the same pattern (use `xlsx` library, read specific sheets/columns, output to `src/data/*.json`).

6. **INDX columns 1-42** — each model maps to exactly one INDX column. The availability array for each option has one entry per INDX column. To check if option X is available for model Y, look up `option.availability[model.indxColumn - 1]`.

7. **Discount % applies before ROE** — the discount reduces the EUR cost, then the discounted EUR is multiplied by ROE to get ZAR. This matches the Excel formula exactly.
