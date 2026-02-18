# Phase 2 Quick Reference Card

## What Changed?

### Fleet Builder Panel - Before & After

#### BEFORE:
```
Unit 1
Model: [Dropdown]
Battery: [Dropdown]
Quantity: [Input]
```

#### AFTER:
```
Unit 1 [Collapsed by default]
Model: [Dropdown]
[Configure Button]

--- When Expanded ---
Model: [Dropdown]
Battery: [Dropdown]
Quantity: [Input]
Operating Hours/Month: [Input with validation]
Maintenance Cost/Month: [Input with validation]
Fleet Mgmt Cost/Month: [Input with validation]
Telematics Cost/Month: [Input with validation]
Lease Term: [Dropdown - overrides global]
Mast Type: [Dropdown - if multiple options]
Attachments: [Multi-select checkboxes]
[Collapse Button]
```

## New Features at a Glance

| Feature | Default | Range | Impact |
|---------|---------|-------|--------|
| Operating Hours/Month | 180 | 0-720 | Affects Cost Per Hour |
| Maintenance Cost/Month | 0 | ≥0 | Adds to Total Monthly |
| Fleet Mgmt Cost/Month | 0 | ≥0 | Adds to Total Monthly |
| Telematics Cost/Month | 250 | ≥0 | Adds to Total Monthly |
| Lease Term Override | 60 | 36,48,60,72,84 | Changes Residual Value |
| Mast Type | Model Default | Per Model | Display Only |
| Attachments | None | Compatible | Adds to EUR Cost |

## Key Formulas

### Cost Per Hour
```
costPerHour = totalMonthly / operatingHours
```

### Total Monthly Cost
```
totalMonthly = leaseRate + maintenance + fleetMgmt + telematics
```

### Total EUR Cost (for Sales Price)
```
totalEurCost = modelCost + batteryCost + attachmentsCost
```

### Sales Price (with attachments)
```
salesPrice = totalEurCost × customerROE × (1 - discount%)
```

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Operating Hours | 0 ≤ value ≤ 720 | "Operating hours cannot exceed 720 per month" |
| Operating Hours | value ≥ 0 | "Operating hours cannot be negative" |
| All Costs | value ≥ 0 | "Cost cannot be negative" |

## Default Attachments Seeded

1. **Fork Positioner** - €1,200 (Electric models)
2. **Side Shift** - €800 (Most models)
3. **Paper Roll Clamp** - €3,500 (High capacity)
4. **Bale Clamp** - €2,800 (High capacity)
5. **Rotating Fork Clamp** - €4,200 (Counterbalance)
6. **Load Stabilizer** - €950 (All models)
7. **Work Light Package** - €450 (All models)
8. **Blue Spot Warning Light** - €280 (All models)
9. **Fork Extensions** - €650 (Most models)
10. **Cabin Enclosure** - €1,850 (Counterbalance)

## File Locations

### Created:
- `src/hooks/useAttachments.ts` - Attachment data hooks
- `PHASE2_IMPLEMENTATION_SUMMARY.md` - Detailed documentation
- `TESTING_GUIDE.md` - Comprehensive test scenarios

### Modified:
- `src/components/panels/FleetBuilderPanel.tsx` - Complete overhaul
- `src/store/useQuoteStore.ts` - Attachment cost handling
- `src/types/quote.ts` - Added `attachmentsCost` field
- `src/db/seed.ts` - Added attachment seeding

## Common Tasks

### Add New Attachment
Edit `src/db/seed.ts`:
```typescript
{
  id: 'att-011',
  name: 'New Attachment Name',
  category: 'Category',
  eurCost: 1000,
  compatibleModels: ['1120', '1171']
}
```
Then reset database via console.

### Change Default Values
Edit `src/store/useQuoteStore.ts` in `createEmptySlot()`:
```typescript
operatingHoursPerMonth: 180,  // Change this
maintenanceCostPerMonth: 0,   // Change this
telematicsCostPerMonth: 250,  // Change this
```

### Modify Validation Rules
Edit `src/components/panels/FleetBuilderPanel.tsx`:
```typescript
function validateOperatingHours(value: number): string | undefined {
  if (value < 0) return 'Operating hours cannot be negative';
  if (value > 720) return 'Operating hours cannot exceed 720 per month';
  return undefined;
}
```

## Testing Checklist (Short)

- [ ] Select model → slot expands
- [ ] Set operating hours to 120 → cost/hr updates
- [ ] Add maintenance cost → monthly total increases
- [ ] Override lease term → rate changes
- [ ] Select attachments → EUR cost increases
- [ ] Input 800 hours → validation error
- [ ] Collapse/expand → data persists

## Build & Run

```bash
# Install dependencies (if needed)
npm install

# Development server
npm run dev

# Production build
npm run build

# Type check
npm run build  # Will fail on TypeScript errors
```

## Browser DevTools Tips

### Check Database
1. F12 → Application tab
2. IndexedDB → BisedgeQuotationDB
3. View `attachments` table

### Monitor Performance
1. F12 → Performance tab
2. Record → Interact with Fleet Builder
3. Check for layout thrashing or slow renders

### Debug State
1. Install React DevTools extension
2. Select `<FleetSlot>` component
3. View hooks → see `useState` values

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Attachments not showing | Hard refresh (Ctrl+F5) to reseed DB |
| Validation not working | Check console for JS errors |
| Pricing not updating | Ensure battery is selected |
| Slow performance | Check for large attachment lists |
| Chemistry lock issue | Clear all batteries first |

## Quick Win Scenarios

### Scenario 1: Different Operating Profiles
- Unit 1: 240 hrs/month (high usage) = lower cost/hr
- Unit 2: 120 hrs/month (low usage) = higher cost/hr

### Scenario 2: Maintenance Contracts
- Units with contracts: maintenance cost = 2000
- Self-maintained units: maintenance cost = 0

### Scenario 3: Fleet Management
- Managed fleet: fleet mgmt cost = 1500/unit
- Customer managed: fleet mgmt cost = 0

### Scenario 4: Lease Terms
- Short-term (36 months): higher monthly, lower residual
- Long-term (84 months): lower monthly, higher residual

### Scenario 5: Attachments
- Basic fork positioner: +€1,200
- Full clamp system: +€4,200
- Safety package: +€1,230

## Integration Points

### Pricing Engine
- Reads: All slot fields
- Calculates: Sales price, lease rate, cost/hr
- Updates: Automatically on field change

### Database
- Reads: Attachments table
- Filters: By model compatibility
- Caches: Attachment costs in slot state

### Quote Store
- Manages: All slot configurations
- Validates: Through component-level checks
- Persists: To IndexedDB on save

## Future Enhancements (Ideas)

1. **Attachment Images**: Visual selection
2. **Bulk Edit**: Set same value for all units
3. **Copy Configuration**: Duplicate slot setup
4. **Templates**: Save/load common configs
5. **Advanced Filtering**: Search attachments
6. **Cost Breakdown**: Pie chart of costs
7. **Comparison View**: Side-by-side unit comparison
8. **Smart Defaults**: Based on model category
9. **Conditional Attachments**: Some require others
10. **Import/Export**: Share configurations

## Keyboard Shortcuts (Suggested for Future)

- `Ctrl+E`: Expand/collapse current slot
- `Ctrl+D`: Duplicate slot configuration
- `Ctrl+C`: Clear current slot
- `Tab`: Navigate between inputs
- `Enter`: Save and collapse

## Accessibility Notes

- All inputs have proper labels
- Validation errors are announced
- Keyboard navigation works
- Color contrast meets WCAG AA
- Focus indicators visible

---

**Version**: 2.0.0
**Date**: 2026-02-16
**Status**: Production Ready ✅
