# Quote Builder — Build Log

## What We Built

A step-by-step wizard at `/builder` as an alternative to the existing dashboard grid layout. It walks users through creating a complete quote in 8 steps. Purely frontend — reuses the same Zustand store, data hooks, and calculation engine. The existing dashboard remains untouched.

## Wizard Flow (8 Steps)

```
(1) ──── (2) ──── (3) ──── (4) ──── (5) ──── (6) ──── (7) ──── (8)
Client  Settings  Select   Configure   Costs  Commercial  Review  Export
 Info              Units    Options
```

1. **Client Info** — Client name, contact, email, phone, address. Validation: client name + contact name required.
2. **Quote Settings** — Factory ROE, Customer ROE, Discount %, Interest Rate, Default Lease Term, Quote Type. ROE warning if customer < factory.
3. **Select Units** — Three-phase picker: Roster → Series cards → Model cards. Max 6 units. Visual card UI with search filters.
4. **Configure Options** — Per-unit tabbed view. Options grouped by category (Pedals & Brakes, Wheels & Tires, etc.) in accordions. Standard options auto-selected. Skippable.
5. **Costs** — Per-unit: Local battery, telematics package dropdown, local attachment cost, clearing charges (7 fields, collapsible), local costs (5 fields, collapsible). All optional.
6. **Commercial** — Per-unit: Discount %, markup %, finance cost %, operating hours, lease term, residual values, maintenance rates, telematics subscription, operator price. Live pricing preview at bottom updates in real-time.
7. **Review & Summary** — Full quote summary with edit buttons that jump back to correct steps. Validation warnings/errors from `validateQuoteSync()`. Approval tier indicator.
8. **Export** — Save to database, generate PDF, submit for approval, navigate back to dashboard.

## Files Created (25 new files)

All in `src/components/builder/`:

### Core (6 files)
- `QuoteBuilder.tsx` — Page component, lazy-loaded route target. Wraps everything in BuilderProvider.
- `BuilderLayout.tsx` — Layout shell: progress bar + content area + bottom bar. `max-w-4xl` centered.
- `BuilderContext.tsx` — React context for wizard navigation state (currentStep, direction, unitPickerPhase, activeUnitTab, completedSteps). All quote data lives in useQuoteStore.
- `BuilderProgressBar.tsx` — 8-step stepper with animated fill bar, check marks for completed steps, clickable navigation to previous steps.
- `BuilderBottomBar.tsx` — Sticky bottom: Back/Next/Skip buttons + RunningTotal. Steps 3 & 4 are skippable.
- `AnimatedStep.tsx` — Framer Motion wrapper. Steps slide left/right based on direction. Spring: stiffness 300, damping 30.

### Steps (8 files in `steps/`)
- `ClientInfoStep.tsx` — Form with Input components. Updates store via `setCustomerField()`. Sets `canProceed` based on client+contact name.
- `QuoteSettingsStep.tsx` — ROE inputs, discount, interest rate. Lease term as button group. Quote type as card selector. Tooltips on fields.
- `SelectUnitsStep.tsx` — Most complex step. Three phases:
  - **Roster**: Grid of UnitCards + "Add Unit" dashed button
  - **Series**: Grid of SeriesCards with search filter. Uses `usePriceListSeries()`.
  - **Model**: Grid of ModelCards with quantity input. Uses `useSeriesData()`. Auto-selects standard options via `getStandardOptionsForModel()`.
- `ConfigureOptionsStep.tsx` — UnitTabs at top for multi-unit. Options grouped by `getSpecCategory()` in CategoryAccordions. OptionRows with checkbox, availability badge, ZAR price. Recalculates config cost via `calculateOptionsCost()`.
- `CostsStep.tsx` — UnitTabs. Battery description + cost input. Telematics SearchableSelect dropdown. CostFieldGroups for clearing charges and local costs (collapsible).
- `CommercialStep.tsx` — UnitTabs. All commercial fields in grouped sections. LivePricingPreview at bottom showing the full pricing chain updating live.
- `ReviewSummaryStep.tsx` — SummarySections with edit buttons → `goToStep(n)`. Runs `validateQuoteSync()` for warnings/errors. Shows full financial analysis (IRR, NPV, commission, approval tier).
- `ExportStep.tsx` — Four action cards: Save (useAutoSave), Export PDF (generateQuotePDF), Submit for Approval, Back to Dashboard.

### Shared Components (11 files in `shared/`)
- `StepHeader.tsx` — Animated step badge + title + subtitle. Slides up on mount.
- `UnitCard.tsx` — Shows model name, series, qty, base price, monthly. Edit/Remove buttons. Animated with layout + scale.
- `UnitTabs.tsx` — Horizontal tab bar listing active units (e.g. "Unit 1: E16C"). Uses `layoutId` for smooth active indicator.
- `SeriesCard.tsx` — Visual card with Package icon, series name, model count. Hover scale(1.02), tap scale(0.98).
- `ModelCard.tsx` — Visual card with Truck icon, model name, ZAR base price. Same hover/tap animations.
- `CategoryAccordion.tsx` — Expandable section with animated height + fade. Shows option count.
- `OptionRow.tsx` — Checkbox + description + availability Badge (Standard/Optional/Non-Standard) + ZAR price. AlertTriangle for non-standard. Stagger animation on mount.
- `CostFieldGroup.tsx` — Labeled cost input fields with R prefix. Optional collapsible wrapper with animated expand/collapse.
- `LivePricingPreview.tsx` — Shows landed cost → selling price → margin → lease rate → maintenance → total monthly → cost/hr. Values animate with crossfade on change.
- `RunningTotal.tsx` — Compact display in bottom bar: unit count, total monthly, total contract value. AnimatePresence crossfade on value changes.
- `SummarySection.tsx` — Glass card with title + edit button (Pencil icon). Used in ReviewSummaryStep.

## Files Modified (2 existing files)

### `src/App.tsx`
- Added `lazy()` import for QuoteBuilder
- Added `/builder` route with `<RequireAuth>` wrapper and `<Suspense>` fallback (loading spinner)

### `src/components/layout/TopBar.tsx`
- Added `Wand2` icon import from lucide-react
- Added "Builder" button with `variant="feature"` before the Admin button

## Dependencies Added

- `framer-motion` — Animation library for step transitions, layout animations, stagger effects, AnimatePresence

## Architecture Decisions

### No duplication — everything reused from existing codebase:
- `useQuoteStore` — All store actions (setCustomerField, selectSeries, selectModel, toggleOption, setClearingCharge, setLocalCost, setCommercialField, getSlotPricing, getQuoteTotals, etc.)
- `usePriceList.ts` hooks — usePriceListSeries, useSeriesData, useModelOptions, useTelematicsPackages
- `usePriceList.ts` helpers — getOptionAvailability, getAvailabilityBadge, calculateOptionsCost, getStandardOptionsForModel
- `calculationEngine.ts` — All calc functions (called via store's getSlotPricing/getQuoteTotals)
- `validators.ts` — validateQuoteSync for review step
- `formatters.ts` — formatZAR, formatPercentage, formatDate
- `commissionEngine.ts` — calcCommissionSync (called inside getQuoteTotals)
- UI components: Panel, Badge, Card, Tooltip, Button, Input, Checkbox, SearchableSelect
- `generateQuotePDF` — PDF export in ExportStep
- `useAutoSave`, `useQuoteDB` — Save/load operations
- `useAuth` — User context for approval submission
- `useConfigStore` — Approval tiers for validation

### BuilderContext is purely UI navigation state:
```typescript
interface BuilderState {
  currentStep: number;           // 0-7
  activeSlotIndex: number | null; // Which unit slot is being configured
  unitPickerPhase: 'roster' | 'series' | 'model';
  direction: 'forward' | 'back'; // For animation direction
  completedSteps: Set<number>;
  activeUnitTab: number;         // Which unit tab is active in steps 4/5/6
  canProceed: boolean;           // Whether Next button is enabled
}
```

### Lazy loading:
QuoteBuilder is code-split via `React.lazy()` so it doesn't affect dashboard bundle size.

### Same store, shared data:
Dashboard and Builder read/write the same `useQuoteStore`. If you configure a quote in the builder, navigate to `/` and it's all there. Vice versa.

### Default values:
ROE defaults (factoryROE: 19.20, customerROE: 20.60) come from the store's `createInitialState()` in `useQuoteStore.ts`. They're hardcoded defaults, not from the spreadsheet. Every pricing calculation depends on ROE to convert EUR → ZAR.

## getSpecCategory (duplicated inline)

This function maps spec codes to display categories. It's defined locally in `FleetBuilderPanel.tsx` (not exported), so it was duplicated inline in `ConfigureOptionsStep.tsx`:

```typescript
function getSpecCategory(specCode: string): string {
  const code = parseInt(specCode, 10);
  if (code >= 1100 && code < 1200) return 'Basic';
  if (code >= 1200 && code < 1400) return 'Pedals & Brakes';
  // ... etc
  return 'Other';
}
```

Could be extracted to a shared util in the future.

## Verification

- `npx tsc --noEmit` — Zero TypeScript errors
- Route: `/#/builder` (HashRouter)
- Dev server: port 5173
