# Comprehensive Testing Guide - Bisedge Quotation Dashboard

## Overview

This guide provides detailed test cases for verifying all features of the Bisedge Quotation Dashboard. Follow the tests in order to ensure complete system validation.

---

## Pre-Testing Setup

### 1. Environment Setup
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Access application
Open browser to http://localhost:5173 (or displayed URL)
```

### 2. Default Login Credentials
- **Username:** admin
- **Password:** admin123

**IMPORTANT:** Change this password immediately after first login!

### 3. Test Data Preparation
The system will auto-seed with:
- 6 forklift models
- 4 battery types
- Multiple attachments
- Default pricing tiers
- Residual curves
- Sample templates
- Admin user

---

## PHASE 1: Authentication & User Management

### Test 1.1: Login Functionality
- [ ] Login with valid credentials (admin/admin123) → Success
- [ ] Login with invalid username → Error message
- [ ] Login with invalid password → Error message
- [ ] Login with inactive user → Error message
- [ ] Session persists after browser refresh → Success
- [ ] Logout clears session → Redirects to login

### Test 1.2: User Management (Admin → Users)
**Create User:**
- [ ] Click "Add User" button
- [ ] Fill all required fields (username, name, email, password, role)
- [ ] Set role to "Sales"
- [ ] Click "Save Changes"
- [ ] Verify user appears in table
- [ ] Verify audit log entry created

**Edit User:**
- [ ] Click edit icon on user
- [ ] Change full name
- [ ] Leave password blank (should keep existing)
- [ ] Click "Save Changes"
- [ ] Verify changes reflected in table
- [ ] Verify audit log updated

**Password Reset:**
- [ ] Edit user
- [ ] Enter new password in password field
- [ ] Click "Save Changes"
- [ ] Logout and login with new password → Success

**Delete User:**
- [ ] Click delete icon on non-admin user
- [ ] Confirm deletion
- [ ] Verify user removed from table
- [ ] Try to delete last admin → Error message
- [ ] Verify "Cannot delete last admin" validation works

**Validation Tests:**
- [ ] Try to save user without username → Error
- [ ] Try to save user with invalid email → Error
- [ ] Try to save user with duplicate username → Error
- [ ] Try to save user with duplicate email → Error
- [ ] Try to save new user without password → Error
- [ ] Try to save user with password < 6 chars → Error

---

## PHASE 2: Template Management

### Test 2.1: Terms & Conditions Templates (Admin → Templates)
**Create T&C Template:**
- [ ] Click "Terms & Conditions" tab
- [ ] Click "Add Template" button
- [ ] Enter template name: "Standard T&C"
- [ ] Enter JSON content (or use default structure)
- [ ] Check "Set as default"
- [ ] Click "Save Changes"
- [ ] Verify template appears in table with "Default: Yes"

**Preview Template:**
- [ ] Click preview icon (eye) on template
- [ ] Verify preview modal displays content correctly
- [ ] Verify JSON formatting if applicable
- [ ] Close preview

**Duplicate Template:**
- [ ] Click duplicate icon on template
- [ ] Verify form pre-filled with "(Copy)" suffix
- [ ] Verify "Is Default" unchecked
- [ ] Modify content
- [ ] Save successfully

**Set Different Default:**
- [ ] Create second T&C template
- [ ] Check "Set as default"
- [ ] Save
- [ ] Verify first template no longer default
- [ ] Verify only one default per type

### Test 2.2: Cover Letter Templates
- [ ] Click "Cover Letters" tab
- [ ] Create cover letter with placeholders: {customerName}, {quoteRef}, {date}
- [ ] Preview shows placeholders correctly
- [ ] Set as default
- [ ] Verify saved successfully

### Test 2.3: Email & Quote Header Templates
- [ ] Test email template tab (same operations)
- [ ] Test quote header tab (same operations)
- [ ] Verify each type maintains separate defaults

---

## PHASE 3: Audit Log

### Test 3.1: Audit Log Viewing (Admin → Audit Log)
**Basic Viewing:**
- [ ] Open Audit Log page
- [ ] Verify logs displayed in table (newest first)
- [ ] Verify columns: Timestamp, User, Action, Entity Type, Entity ID, Actions
- [ ] Verify pagination shows (if > 20 entries)

**Filtering:**
- [ ] Filter by User dropdown → Shows only that user's actions
- [ ] Filter by Action (create/update/delete) → Shows only that action type
- [ ] Filter by Entity Type (user/template/quote) → Shows only that entity
- [ ] Filter by Date Range (from/to) → Shows only dates in range
- [ ] Search box → Filters across all fields
- [ ] Clear all filters → Shows all logs

**View Details:**
- [ ] Click eye icon on update action
- [ ] Verify details modal shows:
  - Full timestamp
  - User ID
  - Action badge with correct color
  - Entity Type and ID
  - Changes summary (JSON)
  - Before/After diff (if available)
- [ ] Verify changed fields highlighted (red for old, green for new)
- [ ] Close modal

**Export:**
- [ ] Click "Export to Excel" button
- [ ] Verify Excel file downloads
- [ ] Open file and verify columns: Timestamp, User, Action, EntityType, EntityID, Changes
- [ ] Verify data matches what's shown in table

---

## PHASE 4: Backup & Restore

### Test 4.1: Export Backup (Admin → Backup & Restore)
**Export:**
- [ ] Click "Export Backup" button
- [ ] Verify JSON file downloads
- [ ] Verify filename format: `bisedge_backup_YYYYMMDD_HHMMSS.json`
- [ ] Open file in text editor
- [ ] Verify JSON structure:
  - `version` field present
  - `timestamp` field present
  - `tables` object with all tables (quotes, customers, templates, etc.)
- [ ] Verify user passwords marked as "[EXCLUDED]"

### Test 4.2: Import Backup - Merge Mode
**Preparation:**
- [ ] Create a test user "testuser1"
- [ ] Create a test template "Test Template 1"
- [ ] Export backup (Backup A)
- [ ] Create another test user "testuser2"
- [ ] Create another template "Test Template 2"

**Import Merge:**
- [ ] Select "Merge" mode
- [ ] Click "Select Backup File"
- [ ] Choose Backup A (without testuser2 and Test Template 2)
- [ ] Verify preview shows counts for each table
- [ ] Click "Confirm Import"
- [ ] Wait for success message
- [ ] Verify testuser2 still exists (merge keeps existing)
- [ ] Verify Test Template 2 still exists

### Test 4.3: Import Backup - Replace Mode
**WARNING Test (Destructive):**
- [ ] Select "Replace" mode
- [ ] Select backup file
- [ ] Verify warning message about deleting data
- [ ] Verify preview shows red warning
- [ ] Click "Confirm Import"
- [ ] Verify data replaced (testuser2 should be gone if not in backup)
- [ ] Verify other data restored correctly

**Validation Tests:**
- [ ] Try to upload invalid JSON file → Error
- [ ] Try to upload JSON without required tables → Error
- [ ] Try to upload malformed JSON → Error

---

## PHASE 5: Top Bar Enhancements

### Test 5.1: User Display & Menu
**User Info:**
- [ ] Verify user avatar circle displays in top right
- [ ] Verify full name shows next to avatar
- [ ] Verify role badge shows with correct color:
  - Admin: Red (Danger)
  - Manager: Yellow (Warning)
  - Sales: Blue (Info)
  - Viewer: Teal (Brand)

**User Menu:**
- [ ] Click on user button
- [ ] Verify dropdown menu appears
- [ ] Verify shows user info (name + email)
- [ ] Click outside menu → Menu closes
- [ ] Click Logout → Confirmation dialog appears
- [ ] Confirm logout → Redirects to login page

### Test 5.2: Responsive User Display
- [ ] Desktop (>1024px): Shows avatar + name + role badge
- [ ] Tablet (768-1024px): Shows avatar + abbreviated info
- [ ] Mobile (<768px): Shows avatar + role badge only

---

## PHASE 6: Unsaved Changes Warning

### Test 6.1: Auto-Save Integration
**Normal Flow:**
- [ ] Create/edit a quote
- [ ] Make a change (e.g., change customer name)
- [ ] Wait 2 seconds for auto-save
- [ ] Verify "Saved at HH:MM:SS" appears in top bar
- [ ] Try to close browser tab → No warning (already saved)

**Unsaved Changes:**
- [ ] Make a change to quote
- [ ] Immediately try to close tab (before auto-save)
- [ ] Verify browser warning: "Leave site? Changes you made may not be saved"
- [ ] Cancel → Stay on page
- [ ] Wait for auto-save
- [ ] Try again → No warning

**Other Scenarios:**
- [ ] Refresh page before auto-save → Warning appears
- [ ] Navigate away before auto-save → Warning appears (if possible in hash router)

---

## PHASE 7: Dashboard Panels (Comprehensive)

### Test 7.1: Customer Details Panel
**Basic Input:**
- [ ] Enter customer name → Auto-saves
- [ ] Enter contact name → Auto-saves
- [ ] Enter contact title → Auto-saves
- [ ] Enter email (invalid format) → Validation error
- [ ] Enter valid email → Accepts
- [ ] Enter phone number → Accepts
- [ ] Enter multi-line address → Accepts

**Auto-Complete (if implemented):**
- [ ] Start typing existing customer name
- [ ] Verify dropdown appears with suggestions
- [ ] Select suggestion → Fills all customer fields

### Test 7.2: Fleet Builder Panel
**Add Vehicle:**
- [ ] Select category from dropdown
- [ ] Select model from second dropdown
- [ ] Verify model code and name displayed
- [ ] Select battery type (PB or Li-ion)
- [ ] Verify battery capacity shown
- [ ] Select attachments (if any)
- [ ] Enter quantity (1-10)
- [ ] Enter operating hours
- [ ] Verify slot filled

**Battery Compatibility:**
- [ ] Select PB battery for first unit
- [ ] Try to select Li-ion for second unit
- [ ] Verify warning about chemistry lock
- [ ] Chemistry lock prevents mixing

**Attachments:**
- [ ] Select multiple attachments
- [ ] Verify each adds to list
- [ ] Deselect attachment → Removes from list
- [ ] Verify attachment pricing included in totals

**Remove Vehicle:**
- [ ] Click "Remove" on a filled slot
- [ ] Verify slot cleared
- [ ] Verify totals recalculate

### Test 7.3: Lease Options Panel
**ROE Configuration:**
- [ ] Change Factory ROE (e.g., 19.50)
- [ ] Verify Customer ROE must be different
- [ ] Try to set same ROE → Validation error
- [ ] Set Customer ROE higher (e.g., 21.00)
- [ ] Verify all pricing recalculates

**Lease Terms:**
- [ ] Change default lease term (36/48/60/72/84 months)
- [ ] Verify residual value recalculates
- [ ] Verify monthly lease rate recalculates
- [ ] Per-unit term override (if implemented)

**Escalation:**
- [ ] Select escalation type (Fixed/CPI)
- [ ] Enter escalation percentage
- [ ] Verify affects lease calculations

**Maintenance & Telematics:**
- [ ] Enable maintenance charges
- [ ] Enter monthly rate
- [ ] Enable telematics
- [ ] Enter monthly rate
- [ ] Verify added to total monthly cost

### Test 7.4: Pricing & Margins Panel
**View Pricing:**
- [ ] Verify each vehicle shows:
  - EUR cost
  - ZAR cost (EUR × Factory ROE)
  - Markup amount
  - Sales price (ZAR cost × (1 + markup%))
  - Margin %
  - Margin ZAR
- [ ] Verify color coding:
  - Green: High margin (>25%)
  - Yellow: Medium margin (15-25%)
  - Red: Low margin (<15%)

**Adjust Markup:**
- [ ] Change markup % for a unit
- [ ] Verify sales price recalculates
- [ ] Verify margin recalculates
- [ ] Verify color updates

**Deal Summary:**
- [ ] Verify total EUR cost (sum of all units)
- [ ] Verify total ZAR cost
- [ ] Verify total sales price
- [ ] Verify weighted average margin %

### Test 7.5: Financial Analysis Panel
**IRR Calculation:**
- [ ] Verify IRR percentage shown
- [ ] Verify IRR based on:
  - Initial cost (sales price)
  - Monthly lease payments
  - Residual value at end
- [ ] Verify minimum IRR threshold indicated
- [ ] If IRR < minimum → Red warning

**NPV Calculation:**
- [ ] Verify NPV shown in ZAR
- [ ] Verify discount rate used
- [ ] Verify positive NPV = profitable

**Payback Period:**
- [ ] Verify months to recover initial investment
- [ ] Verify breakeven month indicated

**Charts:**
- [ ] Verify cash flow chart displays
- [ ] Verify cumulative cash flow line
- [ ] Verify breakeven point marked

### Test 7.6: Specifications Panel
**View Specs:**
- [ ] Select a vehicle from fleet
- [ ] Verify specifications displayed:
  - Technical specs (capacity, lift height, etc.)
  - Dimensions
  - Battery info
  - Features list
- [ ] Switch to different vehicle → Specs update

**Spec Images (if available):**
- [ ] Verify product images display
- [ ] Verify multiple images can be viewed
- [ ] Verify zoom/fullscreen functionality

### Test 7.7: Approval Workflow Panel
**Tier Detection:**
- [ ] Create quote with total value < R500k → Tier 1
- [ ] Create quote with total value R500k-R2m → Tier 2
- [ ] Create quote with total value > R2m → Tier 3
- [ ] Verify correct tier displayed
- [ ] Verify approvers list shown

**Submit for Approval:**
- [ ] Add approval notes
- [ ] Click "Submit for Approval"
- [ ] Verify status changes to "Pending Approval"
- [ ] Verify submitted by/at fields populated
- [ ] Verify audit log entry created

**IRR Gating:**
- [ ] Create quote with IRR < minimum
- [ ] Try to submit → Blocked with error
- [ ] Enable "Override IRR" checkbox
- [ ] Submit again → Success

**Approval Actions (Manager/Admin):**
- [ ] Approve quote → Status "Approved"
- [ ] Reject quote → Status "Rejected"
- [ ] Verify approval notes captured
- [ ] Verify audit trail complete

### Test 7.8: Quote Generator Panel
**PDF Options:**
- [ ] Select inclusion options:
  - [ ] Include cover page
  - [ ] Include cover letter
  - [ ] Include table of contents
  - [ ] Include specifications
  - [ ] Include T&Cs
  - [ ] Include signature page
- [ ] Verify preview updates as options change

**Template Selection:**
- [ ] Select T&C template from dropdown
- [ ] Verify default template pre-selected
- [ ] Change to different template
- [ ] Verify content updates

**Dual Table Option:**
- [ ] Enable "Dual Table" (Option A vs Option B)
- [ ] Configure second table with different terms
- [ ] Verify both tables shown in PDF

**Generate PDF:**
- [ ] Click "Export PDF" button in top bar
- [ ] Wait for generation (< 5 seconds)
- [ ] Verify PDF downloads
- [ ] Open PDF and verify:
  - [ ] All selected sections present
  - [ ] Correct template used
  - [ ] All pricing accurate
  - [ ] Formatting professional
  - [ ] QR codes scannable
  - [ ] Page count ~9-14 pages (depends on options)

### Test 7.9: Container Optimization Panel
**Optimization:**
- [ ] Add multiple vehicles to fleet
- [ ] Open Container Optimization panel
- [ ] Verify algorithm calculates:
  - Number of containers needed
  - Container types (20ft/40ft/40ft HC)
  - Packing efficiency
  - Loading instructions
- [ ] Verify cost optimization (minimize container count)

**Manual Override:**
- [ ] Manually adjust container selection
- [ ] Verify cost recalculates
- [ ] Verify total shipping cost updates

---

## PHASE 8: Admin Panels (Pricing & Catalog)

### Test 8.1: Pricing Management (Admin → Pricing)
**Approval Tiers:**
- [ ] Edit tier values (min/max)
- [ ] Edit approvers list
- [ ] Save changes
- [ ] Create quote in new value range
- [ ] Verify tier auto-detects correctly
- [ ] Verify changes logged to audit

**Commission Tiers:**
- [ ] Edit margin ranges
- [ ] Edit commission rates
- [ ] Save changes
- [ ] Verify commission recalculates in dashboard
- [ ] Verify audit log updated

**Residual Curves:**
- [ ] Edit PB residual curve values (36/48/60/72/84 months)
- [ ] Save changes
- [ ] Create quote with PB battery
- [ ] Verify new residual values used
- [ ] Edit Li-ion curve
- [ ] Verify affects Li-ion calculations

**Default Values:**
- [ ] Edit default ROE values
- [ ] Edit default margin %
- [ ] Edit default lease term
- [ ] Save changes
- [ ] Create new quote
- [ ] Verify defaults pre-filled

### Test 8.2: Catalog Management (Admin → Catalog)
**Models Tab:**
- [ ] Add new forklift model
- [ ] Fill all required fields:
  - Model code
  - Model name
  - Category
  - EUR cost
  - Specifications
  - Compatible batteries
- [ ] Upload image (if supported)
- [ ] Save model
- [ ] Verify appears in Fleet Builder dropdown
- [ ] Edit model → Change price
- [ ] Delete model → Removed from dropdowns

**Batteries Tab:**
- [ ] Add new battery model
- [ ] Set chemistry (PB or Li-ion)
- [ ] Set capacity (Ah)
- [ ] Set EUR cost
- [ ] Save battery
- [ ] Verify appears in Fleet Builder
- [ ] Edit battery → Change cost
- [ ] Delete battery

**Attachments Tab:**
- [ ] Add new attachment
- [ ] Set category
- [ ] Set EUR cost
- [ ] Set compatible models (multi-select)
- [ ] Save attachment
- [ ] Verify appears in Fleet Builder only for compatible models
- [ ] Edit attachment
- [ ] Delete attachment

**Categories (if separate tab):**
- [ ] Add new category
- [ ] Verify appears in model dropdown
- [ ] Rename category
- [ ] Delete category (only if no models)

**Excel Import/Export:**
- [ ] Export models to Excel
- [ ] Open Excel, verify data
- [ ] Modify Excel (add/edit rows)
- [ ] Import Excel back
- [ ] Verify changes reflected in catalog
- [ ] Verify validation on import (required fields)

---

## PHASE 9: Calculation Accuracy

### Test 9.1: Reference Quote Verification
**Recreate Quote 2142 (Crick Group):**
```
Customer: Crick Group
Contact: Rowan Sauders
Model: 5021 (Linde V 10)
Quantity: 1
Battery: PB 24V 620Ah
Operating Hours: 120/month
Maintenance: R2,868/month
Telematics: R602/month
Factory ROE: 19.50
Customer ROE: 21.00
Lease Term: 84 months
```

**Expected Results:**
- [ ] Sales Price: R719,608
- [ ] Monthly Lease Rate: R12,726
- [ ] Total Monthly (Lease + Maint + Telem): R16,196

**Verify Calculations:**
- [ ] EUR cost × Factory ROE = ZAR cost
- [ ] ZAR cost + markup = Sales price
- [ ] Sales price - residual = Amount to finance
- [ ] PMT function (amount, rate, term) = Monthly lease rate
- [ ] Lease + Maint + Telem = Total monthly
- [ ] Margin % = (Sales - Cost) / Sales × 100
- [ ] All numbers match reference within ±R1 (rounding)

### Test 9.2: Edge Cases
**Zero Quantity:**
- [ ] Set unit quantity to 0
- [ ] Verify excluded from totals
- [ ] Verify no errors

**Large Fleet:**
- [ ] Add 10 units (max capacity)
- [ ] Verify all calculate correctly
- [ ] Verify totals sum correctly
- [ ] No performance issues

**High Margin:**
- [ ] Set very high markup (>50%)
- [ ] Verify green color coding
- [ ] Verify IRR recalculates
- [ ] Verify warning if unrealistic

**Low Margin:**
- [ ] Set very low markup (<5%)
- [ ] Verify red color coding
- [ ] Verify IRR warning
- [ ] May block submission

**Mixed Lease Terms:**
- [ ] Set different lease terms per unit (if supported)
- [ ] Verify term column shown in tables
- [ ] Verify residual calculated per unit's term
- [ ] Verify total monthly aggregates correctly

---

## PHASE 10: Business Rules Enforcement

### Rule 1: Dual ROE Enforcement
- [ ] Set Factory ROE = 20.00
- [ ] Try to set Customer ROE = 20.00
- [ ] Verify validation error
- [ ] Change to 21.00 → Accepted

### Rule 2: Battery Chemistry Mutual Exclusivity
- [ ] Add unit with PB battery
- [ ] Add second unit
- [ ] Try to select Li-ion battery
- [ ] Verify warning and lock enforced
- [ ] Remove first unit
- [ ] Can now select Li-ion

### Rule 3: Cascading Updates
- [ ] Change Customer ROE from 20.00 to 22.00
- [ ] Verify all ZAR prices recalculate
- [ ] Verify all margins recalculate
- [ ] Verify all lease rates recalculate
- [ ] Verify IRR recalculates

### Rule 4: Approval Tier Auto-Detection
- [ ] Create quote with R400k total → Tier 1
- [ ] Add more units to reach R1.5m → Tier 2
- [ ] Add more to reach R3m → Tier 3
- [ ] Verify tier updates automatically

### Rule 5: IRR Gating
- [ ] Configure minimum IRR (e.g., 12%)
- [ ] Create quote with IRR < 12%
- [ ] Try to submit without override → Blocked
- [ ] Enable override checkbox → Can submit
- [ ] Manager can approve override

### Rule 6: Empty Slots Excluded
- [ ] Create quote with 5 filled slots, 5 empty
- [ ] Verify totals only include 5 units
- [ ] Verify PDF only shows 5 units
- [ ] No empty rows in table

### Rule 7: Residual Impact
- [ ] Create quote with PB battery (84 months)
- [ ] Note residual value and lease rate
- [ ] Change to Li-ion battery (same model, same term)
- [ ] Verify residual value changes (Li-ion has different curve)
- [ ] Verify lease rate recalculates (lower residual = higher payment)

### Rule 8: Container Optimization
- [ ] Add 3 small forklifts
- [ ] Verify optimizer selects smallest container
- [ ] Add 8 more units
- [ ] Verify optimizer uses multiple containers efficiently
- [ ] Verify total container cost minimized

### Rule 9: Escalation Clauses
- [ ] Enable 5% annual escalation
- [ ] Set 84-month term (7 years)
- [ ] Verify year 1 payment = base rate
- [ ] Verify year 2 payment = base × 1.05
- [ ] Verify year 3 payment = base × 1.05²
- [ ] Continue through year 7

### Rule 10: Commission Based on Margin
- [ ] Create quote with 20% margin → Commission tier 2 (15%)
- [ ] Note commission amount
- [ ] Increase margin to 30% → Commission tier 3 (20%)
- [ ] Verify commission recalculates
- [ ] Lower margin to 10% → Tier 1 (10%)
- [ ] Verify commission updates

---

## PHASE 11: Role-Based Access Control

### Test 11.1: Admin Role
**Login as Admin:**
- [ ] Verify "Admin" button visible in top bar
- [ ] Click Admin → Navigates to admin panel
- [ ] Verify access to all admin pages:
  - [ ] Pricing Management
  - [ ] Catalog Management
  - [ ] User Management
  - [ ] Template Management
  - [ ] Audit Log
  - [ ] Backup & Restore
- [ ] All CRUD operations work

### Test 11.2: Manager Role
**Create Manager user, login:**
- [ ] Verify "Admin" button visible
- [ ] Has access to all admin pages
- [ ] Can approve/reject quotes in any tier
- [ ] Can manage users (including creating admins)

### Test 11.3: Sales Role
**Create Sales user, login:**
- [ ] Verify "Admin" button NOT visible
- [ ] Can create/edit quotes
- [ ] Can submit quotes for approval
- [ ] Cannot access admin panel (redirect if URL typed)
- [ ] Can view own quotes only (or all quotes if business allows)

### Test 11.4: Viewer Role
**Create Viewer user, login:**
- [ ] Can view quotes (read-only)
- [ ] Cannot edit quotes
- [ ] Cannot submit quotes
- [ ] Cannot access admin
- [ ] All edit buttons disabled or hidden

---

## PHASE 12: Performance Testing

### Test 12.1: Large Dataset
**Preparation:**
- [ ] Create 100+ quotes using script or manual entry
- [ ] Create 50+ customers
- [ ] Generate 1000+ audit log entries

**Performance Checks:**
- [ ] Quote list loads in < 2 seconds
- [ ] Search/filter responds in < 500ms
- [ ] Pagination smooth (no lag)
- [ ] Audit log loads in < 2 seconds
- [ ] Filtering audit log responds quickly

### Test 12.2: PDF Generation
**Timing:**
- [ ] 1-unit quote → < 3 seconds
- [ ] 6-unit quote → < 5 seconds
- [ ] 10-unit quote with all options → < 8 seconds

**Quality:**
- [ ] No rendering errors
- [ ] All images load
- [ ] QR codes generated
- [ ] Formatting consistent

### Test 12.3: Auto-Save Performance
**Latency:**
- [ ] Change field → Auto-save triggers within 2 seconds
- [ ] Multiple rapid changes → Debounces correctly
- [ ] No UI lag during save
- [ ] Save status indicator accurate

---

## PHASE 13: Cross-Browser Testing

### Test 13.1: Chrome/Edge
- [ ] All features work
- [ ] UI renders correctly
- [ ] IndexedDB works
- [ ] PDF generation works
- [ ] File upload/download works

### Test 13.2: Firefox
- [ ] All features work
- [ ] IndexedDB works (may have different behavior)
- [ ] PDF generation works
- [ ] Modals display correctly

### Test 13.3: Safari (if available)
- [ ] Test on macOS/iOS
- [ ] IndexedDB may have quirks
- [ ] Verify auto-save works
- [ ] Verify PDF generation works

---

## PHASE 14: Mobile/Responsive Testing

### Test 14.1: Tablet (768-1024px)
- [ ] Dashboard panels stack appropriately
- [ ] Admin sidebar collapses or becomes hamburger menu
- [ ] Tables scroll horizontally
- [ ] Modals fit screen
- [ ] Forms usable

### Test 14.2: Mobile (< 768px)
- [ ] All panels accessible
- [ ] Navigation works (hamburger menu)
- [ ] Forms usable (inputs not too small)
- [ ] Buttons tappable (>44px touch target)
- [ ] Modals scroll correctly
- [ ] PDF generation still works

---

## PHASE 15: Data Integrity Testing

### Test 15.1: Data Persistence
- [ ] Create quote, enter all data
- [ ] Close browser completely
- [ ] Reopen application
- [ ] Verify quote data intact
- [ ] Verify no data loss

### Test 15.2: Concurrent Edits (Single User)
- [ ] Open quote in tab 1
- [ ] Open same quote in tab 2
- [ ] Edit in tab 1 → Auto-saves
- [ ] Switch to tab 2 → May need manual refresh
- [ ] Verify data consistent

### Test 15.3: Backup Integrity
- [ ] Export backup
- [ ] Make changes (add users, quotes, etc.)
- [ ] Import backup in replace mode
- [ ] Verify data restored exactly
- [ ] Re-export and compare JSON files

### Test 15.4: Audit Trail Completeness
- [ ] Perform series of actions:
  - Create user
  - Edit template
  - Create quote
  - Approve quote
  - Delete template
- [ ] Check audit log
- [ ] Verify all actions logged
- [ ] Verify timestamps sequential
- [ ] Verify user IDs correct
- [ ] Verify before/after values captured

---

## PHASE 16: Error Handling

### Test 16.1: Network Errors (Not applicable for offline app)
Skip unless future backend integration.

### Test 16.2: Invalid Data
- [ ] Enter text in number field → Validation error
- [ ] Enter invalid email → Error
- [ ] Enter negative quantity → Should prevent or error
- [ ] Select incompatible options → Warning/error

### Test 16.3: Database Errors
**Simulate:**
- [ ] Fill IndexedDB to quota (difficult to test)
- [ ] Corrupt backup JSON → Import fails gracefully
- [ ] Missing required table in backup → Error message

### Test 16.4: UI Edge Cases
- [ ] Very long customer name → Truncates or scrolls
- [ ] Very large number (>1 million) → Formats correctly
- [ ] Special characters in inputs → Handles without breaking
- [ ] Empty quote (no units) → Handles gracefully, shows message

---

## PHASE 17: Accessibility Testing

### Test 17.1: Keyboard Navigation
- [ ] Tab through all inputs → Focus visible
- [ ] Enter key submits forms
- [ ] Escape key closes modals
- [ ] Arrow keys work in dropdowns

### Test 17.2: Screen Reader (Basic)
- [ ] Form labels read correctly
- [ ] Error messages announced
- [ ] Button purposes clear
- [ ] Table headers associated with cells

### Test 17.3: Color Contrast
- [ ] Text readable on all backgrounds
- [ ] Color coding has additional indicators (icons/text)
- [ ] High contrast mode works (if supported)

---

## PHASE 18: Security Testing

### Test 18.1: Password Security
- [ ] Passwords hashed (verify in IndexedDB DevTools - should see bcrypt hash)
- [ ] Passwords not exported in backup
- [ ] Cannot view other users' passwords
- [ ] Password strength requirements enforced

### Test 18.2: Session Security
- [ ] Session expires on logout
- [ ] Cannot access protected routes when logged out
- [ ] Session persists in localStorage (acceptable for demo)
- [ ] Refresh keeps session alive

### Test 18.3: Input Validation
- [ ] SQL injection attempts prevented (N/A for IndexedDB)
- [ ] XSS attempts escaped (React auto-escapes)
- [ ] File upload validation (only JSON for backup)
- [ ] No code execution via inputs

### Test 18.4: Authorization
- [ ] Users can only perform permitted actions
- [ ] Sales cannot delete users
- [ ] Viewer cannot edit quotes
- [ ] Proper error messages (not "unauthorized", but redirects)

---

## PHASE 19: Final Acceptance Testing

### Test 19.1: End-to-End User Journey
**Complete Workflow:**
1. [ ] Admin logs in
2. [ ] Creates sales user
3. [ ] Configures pricing (approval tiers, residuals)
4. [ ] Adds forklift models to catalog
5. [ ] Adds battery models
6. [ ] Creates T&C template, sets default
7. [ ] Logs out

8. [ ] Sales user logs in
9. [ ] Creates new quote
10. [ ] Enters customer details
11. [ ] Builds fleet (adds 3 forklifts with batteries)
12. [ ] Configures lease options (ROE, term, escalation)
13. [ ] Reviews pricing and margins
14. [ ] Checks financial analysis (IRR, NPV)
15. [ ] Views specifications
16. [ ] Submits for approval
17. [ ] Logs out

18. [ ] Manager logs in
19. [ ] Views pending approvals
20. [ ] Reviews quote details
21. [ ] Approves quote
22. [ ] Logs out

23. [ ] Sales user logs in
24. [ ] Finds approved quote
25. [ ] Generates PDF with all options
26. [ ] Downloads PDF
27. [ ] Verifies PDF contents match quote

**Verification:**
- [ ] All steps complete without errors
- [ ] Audit log shows complete trail
- [ ] PDF professional and accurate
- [ ] Data persists correctly
- [ ] No console errors

### Test 19.2: Stress Test
**High Load:**
- [ ] Rapidly create/edit/delete quotes
- [ ] Open many modals quickly
- [ ] Generate multiple PDFs consecutively
- [ ] Import large backup file
- [ ] No crashes or data corruption

### Test 19.3: Recovery Test
**Simulate Failures:**
- [ ] Close browser mid-save
- [ ] Restart browser
- [ ] Verify quote recovered (auto-save)
- [ ] No partial/corrupted data

---

## Test Results Summary

After completing all tests, create a summary:

### Overall Results
- **Total Tests:** [Count]
- **Passed:** [Count]
- **Failed:** [Count]
- **Blocked:** [Count]
- **Not Tested:** [Count]

### Critical Bugs Found
1. [Bug description, severity, steps to reproduce]
2. [Bug description, severity, steps to reproduce]

### Non-Critical Issues
1. [Issue description]
2. [Issue description]

### Performance Metrics
- Average quote load time: [X] seconds
- Average PDF generation: [X] seconds
- Average auto-save latency: [X] seconds

### Browser Compatibility
- Chrome: [Pass/Fail]
- Edge: [Pass/Fail]
- Firefox: [Pass/Fail]
- Safari: [Pass/Fail]

### Responsive Compatibility
- Desktop: [Pass/Fail]
- Tablet: [Pass/Fail]
- Mobile: [Pass/Fail]

---

## Sign-Off

**Tested By:** _______________________
**Date:** _______________________
**Approved for Production:** [ ] Yes [ ] No

**Notes:**
[Any additional comments, recommendations, or known limitations]

---

## Appendix: Quick Test Data

### Sample Customers
1. Crick Group / Rowan Sauders / rowan@crickgroup.co.za
2. Fuchs Lubricants / John Smith / john@fuchs.co.za
3. Adcock Ingram / Sarah Lee / sarah@adcock.co.za

### Sample Quotes
- Quote 2140: Fuchs (5231, 1275, 1276, 1120, 1156) - Mixed fleet
- Quote 2142: Crick (5021) - Single unit, reference quote
- Quote 2124: Adcock (1275, 1156) - Dual unit

### Test Users
- admin / admin123 (Admin)
- manager / manager123 (Manager) - Create after testing user management
- sales / sales123 (Sales) - Create after testing user management
- viewer / viewer123 (Viewer) - Create after testing user management

---

**End of Comprehensive Testing Guide**

**Good luck with testing! Report all bugs immediately and retest after fixes.**
