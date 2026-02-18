# PHASE 5: Pricing Management - Testing Guide

## Pre-Testing Setup

### 1. Start the Application
```bash
npm run dev
```

### 2. Login as Admin
```
Username: admin
Password: admin123
```

### 3. Navigate to Pricing Management
```
Admin Panel → Pricing Management
```

---

## Test Suite 1: Approval Tiers

### Test 1.1: View Existing Tiers
**Steps:**
1. Click "Approval Tiers" tab
2. Observe loaded data

**Expected:**
- 4 tiers displayed
- Tier names visible
- Min/Max values shown
- Approvers listed
- Impact counters visible

**Pass Criteria:** ✅ All data loads correctly

---

### Test 1.2: Edit Tier Name
**Steps:**
1. Click in "Tier Name" field for Tier 1
2. Change to "Budget Deals"
3. Click "Save Changes"

**Expected:**
- Save button becomes active
- No validation errors
- Success message appears
- Name persists after reload

**Pass Criteria:** ✅ Name change saved successfully

---

### Test 1.3: Validation - Min >= Max
**Steps:**
1. Edit Tier 1 Min Value to 1,000,000
2. Keep Max Value at 500,000
3. Attempt to save

**Expected:**
- Validation error: "Min value must be less than max value"
- Save button disabled
- Red error box at top
- No data saved

**Pass Criteria:** ✅ Validation prevents invalid configuration

---

### Test 1.4: Validation - Gap Between Tiers
**Steps:**
1. Edit Tier 1 Max Value to 400,000
2. Tier 2 Min Value is 500,000 (gap of 100k)
3. Attempt to save

**Expected:**
- Validation error: "Gap between Tier 1 and Tier 2"
- Save button disabled
- No data saved

**Pass Criteria:** ✅ Gap detection works

---

### Test 1.5: Validation - Overlap
**Steps:**
1. Edit Tier 1 Max Value to 600,000
2. Tier 2 Min Value is 500,000 (overlap of 100k)
3. Attempt to save

**Expected:**
- Validation error: "Tier X and Y overlap"
- Save button disabled

**Pass Criteria:** ✅ Overlap detection works

---

### Test 1.6: Valid Configuration
**Steps:**
1. Set Tier 1: Min=0, Max=500,000
2. Set Tier 2: Min=500,000, Max=2,000,000
3. Set Tier 3: Min=2,000,000, Max=5,000,000
4. Set Tier 4: Min=5,000,000, Max=999,999,999
5. Click "Save Changes"

**Expected:**
- No validation errors
- Success message appears
- Green checkmark shown
- Data persists

**Pass Criteria:** ✅ Valid config saves successfully

---

### Test 1.7: Impact Analysis
**Steps:**
1. Create a test quote worth R750,000 (in Tier 2 range)
2. Go to Approval Tiers
3. Check impact counter for Tier 2

**Expected:**
- Tier 2 impact shows "1 active quote"
- Other tiers show 0 or their actual count

**Pass Criteria:** ✅ Impact counter accurate

---

## Test Suite 2: Commission Tiers

### Test 2.1: View Commission Structure
**Steps:**
1. Click "Commission Tiers" tab
2. Observe loaded data

**Expected:**
- 4 tiers displayed in table
- Min/Max margins shown
- Commission rates shown
- Visual bar chart displayed

**Pass Criteria:** ✅ All commission data loads

---

### Test 2.2: Edit Commission Rate
**Steps:**
1. Edit Tier 1 commission from 2% to 2.5%
2. Observe visual chart update
3. Click "Save Changes"

**Expected:**
- Visual chart updates immediately
- No validation errors
- Success message appears
- Rate persists after reload

**Pass Criteria:** ✅ Commission rate change saved

---

### Test 2.3: Add New Tier
**Steps:**
1. Click "+ Add Tier" button
2. New row appears
3. Set values: Min=40%, Max=50%, Rate=10%
4. Click "Save Changes"

**Expected:**
- New tier added to table
- Validation passes
- 5 tiers now shown
- Visual chart includes new tier

**Pass Criteria:** ✅ New tier added successfully

---

### Test 2.4: Remove Tier
**Steps:**
1. Click trash icon on last tier
2. Tier removed from table
3. Click "Save Changes"

**Expected:**
- Tier removed
- Validation passes
- Success message shown
- Change persists

**Pass Criteria:** ✅ Tier removed successfully

---

### Test 2.5: Validation - Prevent Last Tier Removal
**Steps:**
1. Remove tiers until only 1 remains
2. Attempt to remove last tier

**Expected:**
- Error: "At least one commission tier is required"
- Removal prevented

**Pass Criteria:** ✅ Cannot remove last tier

---

### Test 2.6: Reset to Defaults
**Steps:**
1. Make several changes to tiers
2. Click "Reset to Defaults" button
3. Confirm dialog

**Expected:**
- Confirmation dialog appears
- After confirm, 4 default tiers restored
- Values: 2%, 4%, 6%, 8%
- Save required to persist

**Pass Criteria:** ✅ Reset to defaults works

---

### Test 2.7: Visual Chart Updates
**Steps:**
1. Edit commission rates
2. Observe bar chart

**Expected:**
- Chart bars update in real-time
- Bar widths reflect commission rates
- Colors and labels correct

**Pass Criteria:** ✅ Chart updates live

---

### Test 2.8: Example Preview
**Steps:**
1. Observe example text at bottom
2. Note: "25% margin = X% commission"

**Expected:**
- Example shows correct commission for 25% margin
- Updates when tiers change

**Pass Criteria:** ✅ Example preview accurate

---

## Test Suite 3: Residual Curves

### Test 3.1: View Both Curves
**Steps:**
1. Click "Residual Curves" tab
2. Observe both curves displayed

**Expected:**
- Lead-Acid curve on left (orange)
- Lithium-Ion curve on right (green)
- All 5 terms editable
- Visual charts displayed

**Pass Criteria:** ✅ Both curves load correctly

---

### Test 3.2: Edit Lead-Acid Curve
**Steps:**
1. Edit Lead-Acid 60mo from 12% to 15%
2. Observe visual chart update
3. Click "Save All Changes"

**Expected:**
- Chart bar updates immediately
- No validation errors
- Success message shown
- Value persists

**Pass Criteria:** ✅ Lead-Acid curve edits saved

---

### Test 3.3: Edit Lithium-Ion Curve
**Steps:**
1. Edit Lithium-Ion 60mo from 22% to 25%
2. Observe visual chart update
3. Click "Save All Changes"

**Expected:**
- Chart bar updates immediately
- No validation errors
- Success message shown
- Value persists

**Pass Criteria:** ✅ Lithium-Ion curve edits saved

---

### Test 3.4: Validation - Decreasing Values
**Steps:**
1. Set Lithium-Ion 36mo = 30%
2. Set Lithium-Ion 48mo = 35% (higher than 36mo)
3. Attempt to save

**Expected:**
- Validation error: "36mo value must be >= 48mo value"
- Save button disabled
- Red error shown

**Pass Criteria:** ✅ Increasing values prevented

---

### Test 3.5: Validation - Range 0-100%
**Steps:**
1. Set Lead-Acid 60mo = 150%
2. Attempt to save

**Expected:**
- Validation error: "60mo value must be between 0-100%"
- Save button disabled

**Pass Criteria:** ✅ Out-of-range values prevented

---

### Test 3.6: Valid Decreasing Curve
**Steps:**
1. Set Lithium-Ion: 36mo=35%, 48mo=28%, 60mo=22%, 72mo=18%, 84mo=14%
2. Click "Save All Changes"

**Expected:**
- No validation errors
- Success message shown
- All values persist
- Charts update correctly

**Pass Criteria:** ✅ Valid curve saved successfully

---

### Test 3.7: Impact Analysis
**Steps:**
1. Create test quote with lithium-ion batteries
2. Go to Residual Curves tab
3. Check impact counter for Lithium-Ion

**Expected:**
- Impact shows "1 active quote" (or actual count)
- Lead-Acid shows 0 if no quotes

**Pass Criteria:** ✅ Impact counter accurate

---

### Test 3.8: Visual Chart Accuracy
**Steps:**
1. Set specific values: 40%, 30%, 20%, 10%, 5%
2. Observe bar chart heights

**Expected:**
- Bar heights proportional to percentages
- Tallest bar = 40% (36mo)
- Shortest bar = 5% (84mo)
- Bars decrease left to right

**Pass Criteria:** ✅ Chart visualizes data correctly

---

## Test Suite 4: Default Values

### Test 4.1: View Default Values
**Steps:**
1. Click "Default Values" tab
2. Observe loaded defaults

**Expected:**
- All 6 fields displayed
- Current values shown
- Proper labels and units
- Form is editable

**Pass Criteria:** ✅ All defaults load correctly

---

### Test 4.2: Edit Default ROE
**Steps:**
1. Change Default ROE from 20.60 to 21.00
2. Click "Save Changes"

**Expected:**
- No validation errors
- Success message shown
- Value persists after reload

**Pass Criteria:** ✅ ROE change saved

---

### Test 4.3: Edit Interest Rate
**Steps:**
1. Change Interest Rate from 9.5% to 10.0%
2. Click "Save Changes"

**Expected:**
- No validation errors
- Success message shown
- Value persists

**Pass Criteria:** ✅ Interest rate change saved

---

### Test 4.4: Validation - ROE Range
**Steps:**
1. Set Default ROE to 0
2. Attempt to save

**Expected:**
- Validation error: "Default ROE must be between 0 and 100"
- Save button disabled

**Pass Criteria:** ✅ Invalid ROE prevented

---

### Test 4.5: Validation - Interest Rate Range
**Steps:**
1. Set Interest Rate to 75%
2. Attempt to save

**Expected:**
- Validation error: "Default interest rate must be between 0% and 50%"
- Save button disabled

**Pass Criteria:** ✅ Invalid interest rate prevented

---

### Test 4.6: Validation - Operating Hours
**Steps:**
1. Set Operating Hours to 800 (exceeds 720)
2. Attempt to save

**Expected:**
- Validation error: "Operating hours must be between 1 and 720 per month"
- Save button disabled

**Pass Criteria:** ✅ Invalid hours prevented

---

### Test 4.7: Lease Term Dropdown
**Steps:**
1. Click Lease Term dropdown
2. Observe options

**Expected:**
- 5 options: 36, 48, 60, 72, 84 months
- Current selection highlighted
- Select any option

**Pass Criteria:** ✅ Dropdown shows valid terms only

---

### Test 4.8: All Valid Defaults
**Steps:**
1. Set ROE=20.60, Interest=9.5%, CPI=5.5%
2. Set Hours=180, Term=60, Telematics=250
3. Click "Save Changes"

**Expected:**
- No validation errors
- Success message shown
- All values persist

**Pass Criteria:** ✅ All defaults saved successfully

---

## Test Suite 5: Integration Tests

### Test 5.1: Config Store Loading
**Steps:**
1. Open browser console (F12)
2. Type: `useConfigStore.getState()`
3. Observe output

**Expected:**
- `isLoaded: true`
- `approvalTiers: [4 items]`
- `commissionTiers: [4 items]`
- `residualCurves: [2 items]`
- `defaultValues: {6 keys}`

**Pass Criteria:** ✅ Config store populated

---

### Test 5.2: Live Updates in Dashboard
**Steps:**
1. In Pricing Management, change commission tier 1 to 3%
2. Save changes
3. Go to main Dashboard
4. Create quote with 12% margin (falls in tier 1)
5. Check commission calculation

**Expected:**
- Commission uses new 3% rate
- No page refresh needed
- Calculation immediate

**Pass Criteria:** ✅ Live updates work

---

### Test 5.3: Approval Tier Auto-Detection
**Steps:**
1. In Pricing Management, set Tier 2: R500k-R2M
2. Save changes
3. Go to Dashboard
4. Create quote worth R750,000
5. Check approval tier

**Expected:**
- Quote automatically assigned to Tier 2
- Correct approver shown
- Updates if deal value changes

**Pass Criteria:** ✅ Tier detection works

---

### Test 5.4: Residual Value in Quote
**Steps:**
1. In Pricing Management, set Li-ion 60mo to 25%
2. Save changes
3. Go to Dashboard
4. Create quote: Li-ion battery, 60-month term, R100k sales price
5. Check residual value

**Expected:**
- Residual value = R25,000 (25% of R100k)
- Lease rate adjusts accordingly

**Pass Criteria:** ✅ Residual value correct

---

### Test 5.5: Default Values Applied
**Steps:**
1. In Pricing Management, set Default ROE to 21.00
2. Save changes
3. Go to Dashboard
4. Start new quote
5. Check pricing panel

**Expected:**
- Customer ROE starts at 21.00
- Other defaults applied
- User can override

**Pass Criteria:** ✅ Defaults applied to new quotes

---

### Test 5.6: Audit Trail
**Steps:**
1. Make any pricing change
2. Open browser console (F12)
3. Type: `db.auditLog.toArray()`
4. Observe entries

**Expected:**
- New audit entry created
- Contains: timestamp, userId, action, changes
- EntityType matches what was changed

**Pass Criteria:** ✅ Audit logging works

---

## Test Suite 6: Edge Cases

### Test 6.1: Empty Approvers
**Steps:**
1. Clear approvers field for Tier 1
2. Attempt to save

**Expected:**
- Validation error: "At least one approver is required"
- Save button disabled

**Pass Criteria:** ✅ Empty approvers prevented

---

### Test 6.2: Very Large Deal Value
**Steps:**
1. Create quote worth R100,000,000
2. Check approval tier

**Expected:**
- Assigned to Tier 4 (highest)
- No errors or crashes

**Pass Criteria:** ✅ Handles large values

---

### Test 6.3: Zero Margin Commission
**Steps:**
1. Set commission tier: 0-5% margin = 0% commission
2. Create quote with 3% margin
3. Check commission

**Expected:**
- Commission = R0
- No errors

**Pass Criteria:** ✅ Zero commission handled

---

### Test 6.4: 100% Residual Value
**Steps:**
1. Set residual to 100% (equipment retains full value)
2. Create quote
3. Check lease calculation

**Expected:**
- Lease rate very low
- No errors or negative values

**Pass Criteria:** ✅ 100% residual handled

---

### Test 6.5: Rapid Changes
**Steps:**
1. Change commission tiers rapidly (10+ times)
2. Save between each change
3. Check for errors

**Expected:**
- All saves successful
- No race conditions
- Final value correct

**Pass Criteria:** ✅ Rapid changes handled

---

### Test 6.6: Concurrent Editing
**Steps:**
1. Open two browser tabs
2. Edit same tier in both tabs
3. Save Tab 1, then Tab 2

**Expected:**
- Last save wins
- No data corruption
- May need refresh in Tab 1 to see Tab 2 changes

**Pass Criteria:** ✅ Concurrent edits don't corrupt data

---

## Test Suite 7: Performance Tests

### Test 7.1: Load Time
**Steps:**
1. Hard refresh page (Ctrl+Shift+R)
2. Time from login to Pricing Management visible

**Expected:**
- < 2 seconds total load time
- Config loaded before UI renders

**Pass Criteria:** ✅ Fast load time

---

### Test 7.2: Save Performance
**Steps:**
1. Make change to approval tiers
2. Click "Save Changes"
3. Time until success message

**Expected:**
- < 500ms save time
- Smooth user experience

**Pass Criteria:** ✅ Fast save

---

### Test 7.3: Memory Usage
**Steps:**
1. Open browser task manager (Shift+Esc in Chrome)
2. Navigate to Pricing Management
3. Make multiple changes
4. Observe memory usage

**Expected:**
- Memory usage stable
- No significant memory leaks
- < 200MB for tab

**Pass Criteria:** ✅ Memory efficient

---

## Test Suite 8: Accessibility

### Test 8.1: Keyboard Navigation
**Steps:**
1. Use Tab key to navigate fields
2. Use Enter to save
3. Use Escape to cancel (if modal)

**Expected:**
- All fields keyboard accessible
- Tab order logical
- Enter triggers save

**Pass Criteria:** ✅ Keyboard navigation works

---

### Test 8.2: Screen Reader Compatibility
**Steps:**
1. Enable screen reader (NVDA, JAWS, etc.)
2. Navigate through pricing management
3. Listen to announcements

**Expected:**
- Field labels read correctly
- Error messages announced
- Success messages announced

**Pass Criteria:** ✅ Screen reader compatible

---

## Regression Testing

After any code changes, re-run:
- Test Suite 1: Approval Tiers (all tests)
- Test Suite 2: Commission Tiers (all tests)
- Test Suite 5: Integration Tests (all tests)

---

## Bug Reporting Template

```markdown
**Bug Title:** [Short description]

**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshots:**
[Attach if applicable]

**Console Errors:**
[Copy from F12 console]

**Environment:**
- Browser:
- OS:
- App Version: Phase 5
```

---

## Test Sign-Off

### Approval Tiers ✅
- [ ] All validation tests passed
- [ ] Impact analysis works
- [ ] Changes persist
- [ ] Audit logging works

### Commission Tiers ✅
- [ ] Add/remove tiers works
- [ ] Visual chart accurate
- [ ] Reset to defaults works
- [ ] Changes apply to quotes

### Residual Curves ✅
- [ ] Both curves editable
- [ ] Validation prevents errors
- [ ] Charts visualize correctly
- [ ] Values used in calculations

### Default Values ✅
- [ ] All fields editable
- [ ] Validation works
- [ ] Applied to new quotes
- [ ] Changes persist

### Integration ✅
- [ ] Config store loads
- [ ] Live updates work
- [ ] Audit trail complete
- [ ] Performance acceptable

**Tested By:** _________________
**Date:** _________________
**Result:** PASS / FAIL
