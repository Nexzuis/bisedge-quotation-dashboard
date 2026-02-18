# Bisedge Quotation Dashboard

A comprehensive web-based forklift quotation management system for Bisedge South Africa (Linde Material Handling dealer).

## Overview

This application replaces the complex 24-sheet Excel workflow with a real-time, interactive dashboard that:

- Configures up to 6 forklift units per quote (model, battery, attachments)
- Performs complex pricing calculations (EUR→ZAR conversion, dual ROE rates, lease rates)
- Enforces business rules automatically (battery mutual exclusivity, approval workflows, IRR gating)
- Generates professional PDF quotations matching Linde/Bisedge brand templates
- Manages customer data and quote history

## Tech Stack

- **React 18.3** + **TypeScript 5.6** + **Vite 5.4**
- **Tailwind CSS 3.4** with custom Bisedge theme
- **Zustand 5.x** - State management with derived selectors
- **Immer 10.x** - Immutable state updates
- **Dexie 4.x** - IndexedDB for persistence
- **@react-pdf/renderer 4.x** - PDF generation
- **lucide-react** - Icons
- **recharts** - Financial charts

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the application.

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
  types/           # TypeScript type definitions
  store/           # Zustand state management
  engine/          # Calculation engines (PMT, IRR, margin, etc.)
  data/            # Static data (models, batteries, tiers)
  components/
    ui/            # Reusable UI components
    shared/        # Shared components
    panels/        # Dashboard panels
    layout/        # Layout components
  pdf/             # PDF generation (coming soon)
  db/              # IndexedDB schema (coming soon)
```

## Key Features

### Dual ROE Handling
- **Factory ROE:** Internal cost calculation
- **Customer ROE:** Customer-facing pricing
- Automatic margin calculation based on spread

### Battery Mutual Exclusivity
- Quote can be locked to either lead-acid OR lithium-ion
- Prevents mixing battery chemistries in a single quote
- Automatic clearing of batteries when chemistry changes

### Approval Workflow
- 4-tier approval system based on deal value
- IRR gating with minimum thresholds per tier
- Override capability for exceptional deals

### Real-Time Calculations
- All pricing updates cascade automatically
- PMT-based lease rate calculations
- IRR and NPV analysis
- Commission calculations based on margin tiers

## Configuration

See `public/CONFIGURATION.md` for detailed configuration options including:
- Exchange rates (ROE)
- Approval tiers and thresholds
- Commission tiers
- Residual value curves
- Default lease terms
- Container specifications

## Business Rules

1. **Dual ROE:** Factory ROE for costs, Customer ROE for sales price
2. **Battery Mutual Exclusivity:** One chemistry per quote
3. **Cascading Updates:** ROE/discount changes update all calculations
4. **Approval Tier Auto-Detection:** Based on total deal value
5. **IRR Gating:** Minimum IRR per approval tier
6. **Empty Slot Detection:** Only configured units appear in totals
7. **Residual Value Impact:** Li-ion has higher residual → lower lease rates
8. **Container Optimization:** First-fit-decreasing heuristic (coming soon)
9. **Escalation Clauses:** CPI, fixed %, or none
10. **Commission Calculation:** Based on margin %, not revenue

## Development Roadmap

### Phase 1: Foundation ✅
- [x] Project setup
- [x] Type definitions
- [x] Calculation engine (PMT, IRR, pricing formulas)
- [x] Residual curves
- [x] Commission engine
- [x] Validators
- [x] Formatters

### Phase 2: State & UI ✅
- [x] Zustand store with derived selectors
- [x] Dashboard layout (3x3 grid)
- [x] TopBar with ROE input
- [x] Deal Overview Panel
- [x] Settings Panel
- [x] Fleet Builder Panel
- [x] Pricing & Margins Panel
- [x] Financial Analysis Panel
- [x] Approval Workflow Panel

### Phase 3: Advanced Features (In Progress)
- [ ] Specifications Viewer Panel
- [ ] Logistics Panel (container optimization)
- [ ] Quote Generator Panel (PDF preview)
- [ ] PDF generation engine
- [ ] Customer CRM (IndexedDB)
- [ ] Quote history tracking
- [ ] Auto-save functionality

### Phase 4: Polish
- [ ] Excel import for updated costing data
- [ ] Responsive mobile/tablet layouts
- [ ] Unit tests for calculation engine
- [ ] End-to-end testing

## Testing

To verify the calculation engine:

```bash
# Run unit tests (when implemented)
npm test
```

### Manual Test Cases

**Test Case 1: Recreate Crick Group Quote 2142**
- Model: Linde V 10 (5021), Qty 1
- Battery: Lead-acid 24V 620AH
- Operating Hours: 120/month
- ROE: 21.00
- Lease Term: 84 months
- Expected: Sales Price R719,608, Total R16,196/month

**Test Case 2: Battery Mutual Exclusivity**
1. Select Li-ion battery for unit 1
2. Try to select PB battery for unit 2
3. Should show warning and enforce chemistry lock

**Test Case 3: IRR Gating**
1. Create quote with 50% discount
2. IRR should drop below tier minimum
3. Submit button should be disabled unless override is checked

## License

Proprietary - Bisedge South Africa

## Support

For technical support or questions, contact the development team.
