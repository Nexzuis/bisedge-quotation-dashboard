# PHASE 5: Pricing Management - Quick Reference

## Admin UI Access

### Navigate to Pricing Management
```
Admin Panel → Pricing Management
```

### Four Main Tabs
1. **Approval Tiers** - Configure approval workflows by deal value
2. **Commission Tiers** - Set commission rates based on margin
3. **Residual Curves** - Define residual values by chemistry/term
4. **Default Values** - Set default values for new quotes

---

## Approval Tiers

### What It Does
Controls who approves quotes based on total deal value.

### Fields
- **Tier Name** - Descriptive name (e.g., "Standard deals")
- **Min Value** - Minimum deal value in ZAR
- **Max Value** - Maximum deal value in ZAR
- **Approvers** - Comma-separated list of approvers

### Validation
- Min must be < Max
- No overlaps between tiers
- Tiers must be contiguous (no gaps)

### Example
| Tier | Name | Min | Max | Approvers |
|------|------|-----|-----|-----------|
| 1 | Standard | 0 | 500,000 | Sales Manager |
| 2 | Medium | 500,000 | 2,000,000 | Regional Director |
| 3 | Large | 2,000,000 | 5,000,000 | CFO |
| 4 | Enterprise | 5,000,000 | 999,999,999 | CEO |

---

## Commission Tiers

### What It Does
Determines sales commission based on margin percentage.

### Fields
- **Min Margin %** - Minimum margin percentage
- **Max Margin %** - Maximum margin percentage
- **Commission Rate %** - Commission rate for this bracket

### Validation
- Min must be < Max
- Margins must be 0-100%
- Commission must be 0-100%
- Brackets must be contiguous

### Example
| Min Margin | Max Margin | Commission |
|------------|------------|------------|
| 0% | 15% | 2% |
| 15% | 25% | 4% |
| 25% | 35% | 6% |
| 35% | 100% | 8% |

### How to Use
1. Click "+ Add Tier" to add more brackets
2. Edit percentages directly in table
3. Click trash icon to remove tier
4. View visual commission curve
5. Click "Save Changes"

### Reset to Defaults
Click "Reset to Defaults" to restore original 4-tier structure.

---

## Residual Curves

### What It Does
Sets residual value percentages for equipment at end of lease.

### Two Curves
1. **Lead-Acid (PB)** - Orange chart
2. **Lithium-Ion (Li-ion)** - Green chart

### Fields (Per Curve)
- **36 months** - Residual % at 3 years
- **48 months** - Residual % at 4 years
- **60 months** - Residual % at 5 years
- **72 months** - Residual % at 6 years
- **84 months** - Residual % at 7 years

### Validation
- All values must be 0-100%
- Values must decrease as term increases
- Example: 36mo ≥ 48mo ≥ 60mo ≥ 72mo ≥ 84mo

### Example (Lithium-Ion)
| Term | Residual % |
|------|-----------|
| 36mo | 35% |
| 48mo | 28% |
| 60mo | 22% |
| 72mo | 18% |
| 84mo | 14% |

### Impact
Shows "Will affect X active quotes" for each chemistry.

---

## Default Values

### What It Does
Sets initial values for new quotes.

### Fields
1. **Default ROE** - Customer exchange rate (ZAR/EUR)
2. **Interest Rate** - Annual interest rate (%)
3. **CPI Rate** - Consumer Price Index for escalations (%)
4. **Operating Hours** - Expected monthly hours per unit
5. **Lease Term** - Standard lease duration (months)
6. **Telematics Cost** - Monthly tracking cost (ZAR)

### Validation
- ROE: Must be > 0
- Interest Rate: 0-50%
- CPI Rate: 0-30%
- Operating Hours: 1-720/month
- Lease Term: Must be 36, 48, 60, 72, or 84
- Telematics Cost: ≥ 0

### Example
```
Default ROE: 20.60 ZAR/EUR
Interest Rate: 9.5%
CPI Rate: 5.5%
Operating Hours: 180 hours/month
Lease Term: 60 months
Telematics Cost: 250 ZAR/month
```

---

## Common Tasks

### Update Commission Structure
```
1. Go to Commission Tiers tab
2. Edit margin ranges and rates
3. Click "Save Changes"
```

### Change Approval Threshold
```
1. Go to Approval Tiers tab
2. Edit Max Value for tier
3. Ensure no gaps/overlaps
4. Click "Save Changes"
```

### Adjust Residual Values
```
1. Go to Residual Curves tab
2. Select chemistry (PB or Li-ion)
3. Edit percentages for each term
4. Ensure decreasing trend
5. Click "Save All Changes"
```

### Set New Defaults
```
1. Go to Default Values tab
2. Edit any field
3. Click "Save Changes"
```

---

## Validation Messages

### Common Errors

#### "Min value must be less than max value"
- Fix: Ensure Min < Max for each tier

#### "Gap between Tier X and Y"
- Fix: Make Tier X Max = Tier Y Min

#### "36mo value must be >= 48mo value"
- Fix: Residuals must decrease with term

#### "At least one commission tier is required"
- Fix: Don't delete all tiers

---

## Impact Analysis

### Approval Tiers
Shows number of active quotes in each tier:
```
Tier 1: 12 active quotes
Tier 2: 5 active quotes
Tier 3: 2 active quotes
Tier 4: 1 active quote
```

### Residual Curves
Shows number of quotes using each chemistry:
```
Lead-Acid: 8 active quotes
Lithium-Ion: 12 active quotes
```

---

## Save Behavior

### What Happens on Save
1. Validates all data
2. Saves to database
3. Logs to audit trail
4. Updates config store cache
5. Shows success message
6. Changes take effect immediately

### When Save Fails
- Validation errors shown at top
- No data saved
- Fix errors and try again

---

## Audit Trail

### What Gets Logged
- User ID who made change
- Timestamp
- Entity type (e.g., "approvalTiers")
- Old values
- New values

### Where to View
```
Database → auditLog table
```

---

## Best Practices

### Approval Tiers
✅ Use descriptive tier names
✅ Set realistic value ranges
✅ Include multiple approvers for high tiers
❌ Don't create overlapping ranges
❌ Don't leave gaps between tiers

### Commission Tiers
✅ Reward higher margins
✅ Keep brackets contiguous
✅ Use round percentages
❌ Don't exceed 100% commission
❌ Don't create commission cliffs

### Residual Curves
✅ Research market values
✅ Account for technology depreciation
✅ Li-ion typically retains more value
❌ Don't set unrealistic high residuals
❌ Don't make values increase over time

### Default Values
✅ Use current market rates
✅ Update ROE monthly
✅ Set conservative operating hours
❌ Don't set extreme values
❌ Don't forget to update seasonally

---

## Troubleshooting

### Changes Not Showing in Dashboard
1. Check save was successful (green checkmark)
2. Refresh browser (Ctrl+F5)
3. Check config store loaded: `console.log(useConfigStore.getState())`

### Validation Won't Let Me Save
1. Read error messages carefully
2. Fix all highlighted issues
3. Check for gaps/overlaps
4. Ensure values in valid ranges

### Impact Counter Shows 0
- Normal if no quotes exist yet
- Create test quote to verify
- Check database has quotes: `db.quotes.count()`

---

## Keyboard Shortcuts

- **Tab** - Move to next field
- **Shift+Tab** - Move to previous field
- **Enter** - Save (when focused on input)
- **Escape** - Cancel edit (if modal)

---

## Database Tables Reference

### approvalTiers
```sql
id, tierName, minValue, maxValue, approvers[]
```

### commissionTiers
```sql
id, minMargin, maxMargin, commissionRate
```

### residualCurves
```sql
id, chemistry, term36, term48, term60, term72, term84
```

### settings
```sql
key, value
```

---

## Quick Formulas

### Commission Calculation
```
Commission = Sales Price × Commission Rate
where Commission Rate is based on Margin %
```

### Approval Tier Detection
```
IF Deal Value BETWEEN Min AND Max
  THEN assign Tier
```

### Residual Value
```
Residual = Sales Price × Residual %
where Residual % is based on Chemistry + Term
```

---

## Support

### Need Help?
- Check validation messages
- Review this guide
- Check console for errors (F12)
- Contact system administrator

### Report Issues
Include:
- What you were trying to do
- What happened instead
- Error messages
- Screenshots if possible
