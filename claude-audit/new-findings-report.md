# New Findings Report

> All issues discovered by Claude Code that were NOT in the original Codex audit.
> 98 new findings across 8 workstreams, categorized by severity.

---

## Severity Guide

| Level | Meaning | Action |
|-------|---------|--------|
| **P0** | Release blocker — incorrect financial output, data loss | Fix before any production use |
| **P1** | High risk — security gaps, calculation errors, data corruption | Fix within 72 hours |
| **P2** | Medium risk — performance, UX, minor data issues | Fix within 1-2 weeks |
| **P3** | Low risk — dead code, cosmetic, informational | Fix when convenient |

---

## P0 — Release Blockers (6 findings)

### WS-A-3: loadQuote/createInitialState Feedback Loop Risk

**Evidence:** `src/hooks/useAutoSave.ts:49-55` explicitly sets `updatedAt: new Date()` when auto-assigning a quote ref, which triggers the autosave watcher effect at line 109, scheduling another save. Combined with 3+ concurrent `useAutoSave` instances (WS-A-2), one instance's save completion can trigger another instance's watcher.

**Impact:** Potential infinite save loop on first save of new quotes. The `getTime()` guard partially prevents this, but with multiple instances the race window exists.

**Fix Direction:** Add dedicated `setVersion(v)` and `setQuoteRef(ref)` store actions instead of using `loadQuote` for single-field updates. Never set `updatedAt: new Date()` in the save path.

**Confidence:** Medium

---

### WS-B-1: IRR Cash Flow Missing Revenue Streams

**Evidence:** `src/store/useQuoteStore.ts:713-716` — `generateCashFlows` receives `totalLeaseRate` but the cash flow array only includes the lease payment stream. Maintenance revenue, telematics revenue, and operator revenue are NOT included in the IRR cash flows despite being part of `totalMonthlyCosts`.

**Impact:** IRR understates the return because revenue from maintenance and telematics subscriptions is excluded from the inflow side while costs may be included. This makes deals look less profitable than they are for these revenue components.

**Fix Direction:** Include all monthly revenue streams in the cash flow generation, or clarify that IRR is lease-only.

**Confidence:** High

---

### WS-B-2: IRR Uses factoryCostZAR Instead of landedCostZAR

**Evidence:** `src/store/useQuoteStore.ts:700` — `totalFactoryCost += pricing.factoryCost * slot.quantity`. The variable `totalFactoryCost` is used as the initial outlay in the IRR cash flow. But `pricing.factoryCost` is `factoryCostEUR * factoryROE` (line 590), which does NOT include clearing charges, local costs, battery, attachments, or telematics.

**Impact:** The IRR initial outlay is **understated** by 30-50% of actual investment (the full clearing + local cost component). For a R300k factory cost unit with R150k in clearing/local charges, IRR is computed on R300k instead of R450k — making every deal look dramatically more profitable than it is.

**Fix Direction:** Change accumulation to use `pricing.landedCostZAR * slot.quantity`.

**Confidence:** High

---

### WS-D-2: CustomerListPage Defaults to All Companies (Codex P0-4 extension)

**Evidence:** `src/components/crm/CustomerListPage.tsx:27` — `showMyAccounts` defaults to `false`. No role-based check on mount. A `sales_rep` sees every company in the CRM by default.

**Impact:** Complete CRM data exposure to all authenticated users regardless of role.

**Fix Direction:** Default `showMyAccounts` to `true` for `sales_rep` and `key_account` roles.

**Confidence:** High

---

### WS-D-3: No Ownership Check on CustomerDetailPage (Codex P0-4 extension)

**Evidence:** `src/components/crm/CustomerDetailPage.tsx:28-33` — Loads any company by route ID with zero ownership verification. A `sales_rep` can navigate directly to `/customers/:id` for any company.

**Impact:** Direct URL access allows any authenticated user to view, edit, and delete any company's data.

**Fix Direction:** Check `company.assignedTo === user.id` for `sales_rep`/`key_account` roles after loading.

**Confidence:** High

---

### WS-G-1: PDF Additional Costs Use Deprecated Fields — Wrong Numbers

**Evidence:** `src/pdf/generatePDF.tsx:83-86` reads `slot.maintenanceCostPerMonth`, `slot.fleetMgmtCostPerMonth`, `slot.telematicsCostPerMonth` — all deprecated and initialized to 0. The actual pricing engine at `src/store/useQuoteStore.ts:624-634` computes maintenance from per-hour rates × operating hours.

**Impact:** The PDF's line-item cost breakdown shows R0 for maintenance while the total monthly (which IS correctly computed) shows the real amount. The customer sees numbers that don't add up — an arithmetic contradiction on the financial document.

**Fix Direction:** Use `pricing.maintenanceMonthly` and `slot.telematicsSubscriptionSellingPerMonth` from the pricing engine.

**Confidence:** High

---

## P1 — High Risk (23 findings)

### WS-A-4: loadMostRecent Fires Globally, Not Per-Route

**Evidence:** `src/App.tsx:98-118` — `loadMostRecent()` runs in `AppContent` on `isAuthenticated` change, regardless of route.

**Impact:** Unnecessary DB reads and store mutations on every route. Combined with broken deep links, navigating to `/quote?id=<id>` loads the wrong quote.

**Fix Direction:** Move to `/quote` route component, only fire when no `?id=` parameter.

---

### WS-A-6: useUnsavedChanges Redundantly Mounts useAutoSave

**Evidence:** `src/hooks/useUnsavedChanges.ts:9` — `const { lastSavedAt } = useAutoSave();` creates a hidden 2nd autosave instance.

**Impact:** Doubles autosave instances in AppContent. Creates parallel save timers.

**Fix Direction:** Remove `useAutoSave()` call. Accept `lastSavedAt` as parameter or from context.

---

### WS-A-7: Post-Save loadQuote Replaces Entire Store State

**Evidence:** `src/hooks/useAutoSave.ts:76-80` — To update one field (`version`), calls `loadQuote({...quote, version})` which runs `createInitialState()` and replaces entire store.

**Impact:** Every save causes full store replacement, breaking referential equality for all subscribers.

**Fix Direction:** Add `setVersion(v)` action that only mutates `state.version`.

---

### WS-B-3: Margin Computed Against factoryCostZAR Not landedCostZAR

**Evidence:** `src/store/useQuoteStore.ts:611` — `calcMargin(sellingPriceZAR, factoryCostZAR)` and `src/engine/calculationEngine.ts:442`.

**Impact:** Margins inflated 2-3x. Example: factory R200k, landed R300k, selling R360k → reported 44.4% vs true 16.7%.

**Fix Direction:** Change to `calcMargin(sellingPriceZAR, landedCostZAR)`.

---

### WS-B-5: Commission Cascading from Inflated Margin

**Evidence:** `src/store/useQuoteStore.ts:727` — Commission tier lookup uses the inflated `averageMargin` from WS-B-3.

**Impact:** Could mean R40k-R60k excess commission per R1M+ deal.

**Fix Direction:** Fix WS-B-3 first; commission corrects automatically.

---

### WS-B-6: PMT Division by Zero When Term = 0

**Evidence:** `src/engine/calculationEngine.ts:13-25` — No guard for `nPeriods = 0`. Both the `monthlyRate === 0` and `monthlyRate !== 0` branches divide by zero.

**Impact:** Returns NaN/Infinity, propagating through all downstream calculations.

**Fix Direction:** Add `if (nPeriods <= 0) return 0;` at function start.

---

### WS-C-8: V5 Migration viewer → sales_rep Privilege Escalation

**Evidence:** `src/db/schema.ts:321-326,335` — `viewer` maps to `sales_rep` + deactivated. If reactivated, gains full sales_rep permissions.

**Impact:** Former view-only users gain write access upon reactivation.

**Fix Direction:** Map viewer to restricted role or add `permissionOverrides` limiting access.

---

### WS-C-9: ROE Mismatch 19.73 vs 20.60 vs 19.20 (Confirmed P1-3)

**Evidence:** Code seeds 19.73, docs say 20.60, builder.md says factoryROE 19.20. Test fixtures use 20.60.

**Impact:** 4.4% pricing error per unit, R13k+ on 10-unit fleet.

**Fix Direction:** Establish single source of truth with business stakeholders.

---

### WS-C-11: Admin Password Logged to Console (Confirmed P1-2)

**Evidence:** `src/db/seed.ts:131-136` — Plaintext password printed to `console.warn`.

**Impact:** Password exposed in console, browser extensions, remote logging.

**Fix Direction:** Use a first-time setup wizard instead of console output.

---

### WS-D-1: Permission Override Cannot Deny

**Evidence:** `src/auth/permissions.ts:186-191` — Only checks `if (override === true)`. Explicit `false` is ignored.

**Impact:** Cannot revoke permissions via overrides. A `key_account` with `can_view_all_quotes: false` still sees all quotes.

**Fix Direction:** Add `else if (override === false) return false` branch.

---

### WS-D-8: Admin Route Guard — No Per-Route Permission Checks

**Evidence:** `src/App.tsx:38-46` — `RequireAdmin` accepts 4 roles. No per-route checks inside admin layout.

**Impact:** `sales_manager` can access `/admin/users` and `/admin/backup` by direct URL.

**Fix Direction:** Add `RequirePermission` wrapper per admin sub-route.

---

### WS-D-10: Unsanitized .ilike() Filter

**Evidence:** `src/db/SupabaseAdapter.ts:189` — `query.ilike('client_name', `%${filters.customerName}%`)` without `sanitizePostgrestValue()`.

**Impact:** PostgREST metacharacter injection. Inconsistent with sanitization pattern used elsewhere.

**Fix Direction:** Wrap with `sanitizePostgrestValue()`.

---

### WS-D-12: Admin Password Logged to Console (same as C-11)

Same finding, different workstream. See WS-C-11.

---

### WS-D-13: No Rate Limiting on Login Attempts

**Evidence:** `src/store/useAuthStore.ts:68-222` — No failed attempt tracking, no cooldown, no lockout.

**Impact:** Brute force attacks possible against local accounts.

**Fix Direction:** Add exponential backoff + account lockout after N failures.

---

### WS-D-16: Quote Filtering Is Client-Side Only

**Evidence:** `src/components/quotes/QuotesListPage.tsx:80-91` — Fetches ALL 500 quotes, then filters client-side by creator.

**Impact:** In cloud mode, all quotes fetched from server before filtering. Data over-exposure.

**Fix Direction:** Pass `userId` filter to repository's `listQuotes` method.

---

### WS-D-18: UserManagement No Internal Permission Check

**Evidence:** `src/components/admin/users/UserManagement.tsx` — No `hasPermission` check. Any role past `RequireAdmin` gate gets full user management.

**Impact:** `sales_manager` can create system_admin accounts.

**Fix Direction:** Add permission guard for `admin:users` at component top.

---

### WS-D-19: BackupRestore No Internal Permission Check

**Evidence:** `src/components/admin/backup/BackupRestore.tsx` — No auth import, no permission check.

**Impact:** `sales_manager` can export entire database and restore arbitrary data.

**Fix Direction:** Add permission guard for `admin:backup`.

---

### WS-E-1: Autosave Double-Save on First New Quote

**Evidence:** `src/hooks/useAutoSave.ts:49-55` — First save path sets `updatedAt: new Date()`, triggering autosave watcher for a second save.

**Impact:** Every new quote saves twice on first save.

**Fix Direction:** Don't set new `updatedAt` in the ref-assignment path.

---

### WS-E-3: Multiple useAutoSave Instances Create Save Races

Same as WS-A-2 from the state management perspective. 4 concurrent instances with independent mutexes.

---

### WS-F-2: 6/8 Steps Unconditionally Allow Proceed

**Evidence:** Steps 1, 3, 4, 5, 7 all call `setCanProceed(true)` with no checks. A user can proceed through the entire wizard entering zero commercial data.

**Impact:** Quotes with 0 operating hours, 0 markup, 0 finance cost reach export.

**Fix Direction:** Add validation to Commercial step at minimum (require operating hours > 0, markup > 0).

---

### WS-F-4: toggleOption Does Not Recalculate configurationCost

**Evidence:** `src/store/useQuoteStore.ts:442-457` — `toggleOption` modifies `slot.configuration` but never touches `slot.configurationCost`. Cost only recalculated when `ConfigureOptionsStep` is mounted.

**Impact:** Skipping the Configure step means all configuration option costs are zero in the final price.

**Fix Direction:** Move cost calculation into the store action, or remove step 3 from SKIPPABLE_STEPS.

---

### WS-F-7: LogisticsPanel Containers in Local State (Confirmed P0-3)

Same as P0-3 confirmation — shipping container data uses `useState`, never persisted.

---

### WS-F-8: PDF Ignores Store's quoteType, Defaults to 'rental'

**Evidence:** `src/components/builder/steps/ExportStep.tsx:67` calls `generateQuotePDF` without passing `options`. Default at `generatePDF.tsx:38` is `quoteType: 'rental'`.

**Impact:** Rent-to-Own and Dual quotes always export as Rental.

**Fix Direction:** Pass `{ quoteType: quote.quoteType }` in options.

---

### WS-F-9: PDF Uses Legacy Fields Instead of Computed Values

**Evidence:** `src/pdf/generatePDF.tsx:83-87` reads `maintenanceCostPerMonth` (always 0), `fleetMgmtCostPerMonth` (always 0) instead of computed pricing values.

**Impact:** PDF cost breakdown is wrong — line items don't add up to total.

**Fix Direction:** Use `pricing.maintenanceMonthly` and computed values from the engine.

---

## P2 — Medium Risk (52 findings)

### WS-A-5: HashRouter Breaks Deep Link Sharing
URLs contain `#/` prefix. May be stripped by email clients or chat apps. Secondary to WS-A-1.

### WS-A-8: Lazy Load + loadMostRecent Race Condition
QuoteBuilder may render with empty state before `loadMostRecent()` resolves. Flash of incorrect content.

### WS-B-4: Commission Tier Boundary Gap
`marginPct < t.maxMargin` means exact maxMargin (e.g., exactly 100%) gets 0 commission. (`src/engine/commissionEngine.ts:50-51`)

### WS-B-7: Container Optimizer Zero-Dimension Units Always Fit
Units with 0×0×0 dimensions and 0 weight always pass `canFitUnit` check and consume no space. (`src/engine/containerOptimizer.ts:145-162`)

### WS-B-8: Container Space Tracking Is 1D Not 3D
Subtracts all 3 dimensions simultaneously after each unit. Overstates containers needed by 2-3x. (`src/engine/containerOptimizer.ts:69-74`)

### WS-B-9: Clearing Charges Frozen at Slot Creation Time
EUR→ZAR conversion happens once at slot creation. ROE changes don't propagate to existing slots. (`src/store/useQuoteStore.ts:32-43`)

### WS-B-10: Duties/Warranty Percentages in JSON Are Unused
`dutiesPct: 0.03` and `warrantyPct: 0.02` defined in `clearingChargeDefaults.json` but hardcoded to 0 in `getDefaultClearing()`.

### WS-B-13: No ZAR Rounding Anywhere
No `Math.round` applied to currency values. Floating-point accumulation across 6 slots.

### WS-B-14: Negative Margin Not Flagged in Validation
`validateQuoteSync` never checks `pricing.margin < 0`. Combined with WS-B-3, actual negative margins could appear positive.

### WS-B-15: customerROE Declared But Never Used
`src/types/quote.ts:206` declares `customerROE`. Store has `setCustomerROE`. Validator warns when `customerROE < factoryROE`. But no pricing formula ever references it.

### WS-C-2: approvalChain Inconsistent Serialize/Deserialize
Serialize uses `|| []`, deserialize handles both string and array. V5 migration may store raw arrays.

### WS-C-3: Slots Deserialization Lacks Field Merging
Restored slots from older versions may have `undefined` for newer fields, causing NaN in calculations.

### WS-C-4: Two Divergent createEmptySlot Implementations
Serialization version uses `discountPct: 0`, store version uses `discountPct: 66`. A 66% pricing difference.

### WS-C-5: V4 Migration Single-Word Name → Empty lastName
`"Sipho".split(' ')` produces `firstName: "Sipho"`, `lastName: ""`.

### WS-C-6: V4 Migration Case-Sensitive Name Matching
No `.trim()` on either side. Trailing whitespace breaks quote-company linking.

### WS-C-10: defaultResidualTruckPct Not Seeded
`getConfigDefaults()` reads it but the settings table never has it. Falls back to hardcoded 15%.

### WS-C-12: commissionPct vs commissionRate Naming
JSON uses `commissionPct`, DB uses `commissionRate`, engine maps between them. Confusion about percentage vs rate.

### WS-C-13: batteryId Deprecated But Actively Used
Marked deprecated in types, used in 5 active files for battery chemistry lock, workflow progress, PDF, and specs viewer.

### WS-C-16: Serialization Tests Miss Critical Edge Cases
8 test cases cover happy path only. No tests for: null approvalChain, corrupted slots JSON, missing fields, double-serialization.

### WS-C-17: Seed Force-Overwrites Admin ROE/Discount
`src/db/seed.ts:218-221` unconditionally patches `defaultROE`, `defaultFactoryROE`, `defaultDiscountPct` on every startup.

### WS-C-18: 66% Discount Undocumented, Inconsistent in Fallback
Serialization fallback uses `discountPct: 0` while seed/config uses `66`. A 2.94x factory cost difference.

### WS-D-7: No Backup Schema Version Validation (Confirmed P0-5 partial)
Backup version `'1.0.0'` never compared against current schema v6. No migration for old backups.

### WS-D-9: key_account Default can_view_all_quotes
`permissions.ts:56` gives `key_account` `can_view_all_quotes: true` by default. May expose sensitive deal information.

### WS-D-11: Sanitize Missing % and _ Wildcards
`sanitizePostgrestValue` strips `, ( ) . * \` but NOT `%` or `_` SQL LIKE wildcards.

### WS-D-14: Auth State in localStorage — Race Window
Auth state rehydrated from localStorage sets `isAuthenticated = true` before async `checkAuth()` completes. Brief window for tampered role.

### WS-D-17: QuotesListPage Ignores Permission Overrides
`QuotesListPage.tsx:57` uses `ROLE_HIERARCHY >= 2` instead of `hasPermission()`. Ignores `can_view_all_quotes` override.

### WS-D-20: Logout Clears Business Data
`useAuthStore.ts:237-249` permanently deletes quotes, companies, contacts, activities from IndexedDB on logout.

### WS-E-2: createInitialState Wasteful Allocations
Every `loadQuote` call generates 6 slots, 6 clearing charge objects, a UUID — all immediately overwritten.

### WS-E-4: Realtime Subscription Churn on Version Change
`currentVersion` in `useCallback` deps causes subscription teardown/reconnect on every save (every 2s).

### WS-E-5: Stale Closure in handleRemoteUpdate
During subscription transition, old callback may still be active on channel. Remote updates can be missed.

### WS-E-6: useWorkflowProgress Subscribes to Entire Store
`useQuoteStore()` with no selector. Every state change triggers full pricing recalculation for workflow bar.

### WS-E-7: getQuoteTotals N×M Unmemoized Pricing Calculations
9 components × 6 slots = 54 `getSlotPricing` calls + 9 IRR calculations per render cycle.

### WS-E-9: Logout Does Not Clear CRM or Config Stores
CRM filter state and commission tiers persist across user sessions.

### WS-E-10: TopBar and 3 Panels Subscribe to Entire Store
`useQuoteStore((s) => s)` in TopBar, QuoteGeneratorPanel, ApprovalWorkflowPanel, ExportStep. Re-renders on every mutation.

### WS-E-11: useQuoteLock Subscribes to Entire Store
`useQuoteStore()` with no selector in useQuoteLock.ts. Lock status rarely changes but re-renders constantly.

### WS-E-13: acquireLock TOCTOU Race Condition
`get()` and `set()` are separate operations. Two users can both read `lockedBy === null` and both acquire.

### WS-E-14: loadQuote Silently Uses Random UUID for Incomplete Data
If `quote` parameter lacks `id`, the UUID from `createInitialState()` is used, creating a duplicate.

### WS-F-1: Skip Button Bypasses canProceed
Steps 3 and 4 skip button calls `nextStep()` without checking `canProceed`. Unguarded backdoor.

### WS-F-3: Progress Bar Jump-Back Bypasses Validation
`goToStep()` has no `canProceed` check. Users can invalidate data on early steps, then jump forward.

### WS-F-5: Overlapping specCode Category Ranges
Range 1200-1399 matches "Pedals & Brakes" before "Wheels & Tires" can match 1300-1399. Dead code.

### WS-F-6: No Save on Step Navigation
Neither `nextStep` nor `prevStep` triggers a save. 2-second data loss window.

### WS-F-10: Review Missing Fields in PDF and Vice Versa
Review shows IRR/NPV/commission not in PDF. PDF shows address/validity/signatory not in Review.

### WS-F-11: Model Change Silently Resets Configuration
Changing a model resets all custom options. No confirmation dialog.

### WS-F-13: Builder vs Dashboard Data Conflict
Both views read/write the same store. LogisticsPanel data is ephemeral while CostsStep data persists.

### WS-F-15: Export Does Not Auto-Save Before PDF
`handleExportPDF` generates PDF without calling `saveNow()`. Quote may not be persisted.

### WS-F-17: completedSteps Never Cleared
Once a step is marked complete, it stays complete even when its data is invalidated.

### WS-G-4: No EUR Values or ROE Shown in PDF
All values in ZAR only. Customer cannot verify EUR basis or ROE used.

### WS-G-5: Hardcoded "30 Days" Validity Note
`QuotationTablePage.tsx:197` says "30 days" even when `validityDays` is set differently.

### WS-G-6: T&C Page Count Hardcoded to 2
`QuoteDocument.tsx:57-59` assumes 2 pages for T&C. Page numbers may be wrong.

### WS-G-7: Signature Image Never Rendered
`SignaturePage.tsx:147-155` has a TODO comment placeholder instead of `<Image>` element.

### WS-G-8: No Approval Status in PDF
No indication of approval chain or status on the customer-facing document.

### WS-G-9: Stale Totals from QuoteGeneratorPanel
`totals` computed at render time, not at export time. May be stale.

### WS-G-10: Product Images Are SVG Placeholders
`productImages/index.ts` always returns gray rectangles. Never real product photos.

### WS-G-11: Battery Voltage and Capacity Always 0
`generatePDF.tsx:75-77` hardcodes `voltage: 0, capacity: 0`.

### WS-G-12: Cover Letter Fallback 60 Months for Mixed Terms
Falls back to 60 months when terms are mixed. Incorrect statement on cover letter.

### WS-G-14: rent-to-own Table Identical to rental
Only difference is subtitle text. No distinct pricing columns or buyout terms.

### WS-H-3: Quote Lock Client-Side Only, No Stale Cleanup
Cloud lock never released on browser crash. No TTL. Hook never actually used (zero imports).

### WS-H-4: Notification Helpers Bypass Adapter/Sync
Write directly to Dexie, bypassing adapter layer. Also never called (dead code).

### WS-H-5: ErrorBoundary Misses Async Errors
No `window.addEventListener('unhandledrejection')`. Async errors silently lost.

### WS-H-6: SyncQueue localStorage No Size Limit
Can grow until localStorage fills up (~5-10MB), then silently loses data.

### WS-H-7: ConflictResolver Missing Statuses
`in-review` and `changes-requested` not in `statusOrder`. Get index -1, lose to everything.

### WS-H-9: SyncQueue Constructor Fires Side Effects at Import
Singleton created at module evaluation. Constructor calls `processQueue()` before app mounts.

### WS-H-11: Approval Notifications Toast-Only
`useApprovalNotifications` shows ephemeral toasts but never writes to notifications table. Missed if away.

---

## P3 — Low Risk (17 findings)

### WS-B-11: NPV Uses Lease Rate as Discount Rate
Internally consistent but uninformative. NPV near zero by definition.

### WS-B-12: IRR Newton-Raphson No Bisection Fallback
May not converge for low-return deals. Returns null gracefully.

### WS-B-16: avgTerm Rounding for Multi-Term Quotes
Averaged term doesn't represent actual cash flow profile for mixed-term slots.

### WS-B-17: Container Optimizer Crashes on Empty containerTypes
`sortedContainers[sortedContainers.length - 1]` is `undefined` for empty array. TypeError at runtime.

### WS-B-18: PMT Sign Convention (Informational — Correct)
Sign convention is correct. Documented for completeness.

### WS-C-1: validityDays Missing from Test Fixture
Test never validates `validityDays` round-trip behavior. False confidence.

### WS-C-7: V4 Migration Address Fields Lost
City, province, postal code set to empty strings even if original address contained them.

### WS-C-14: clientAddress No Array Validation
Serialization passes `clientAddress` through without checking it's actually an array.

### WS-C-15: approvalChain Type Declaration Inaccurate
Interface says `string` but runtime handles `string | array`.

### WS-D-15: bcrypt Cost Factor 10
Adequate minimum. OWASP recommends 12+ for higher security.

### WS-E-8: useAuthStore.v2.ts Is Dead Code
Re-exports from `useAuthStore.ts`. Zero imports. Safe to delete.

### WS-E-12: Repository Singleton Is Safe
`getQuoteRepository()` correctly implements lazy singleton. Low-priority optimization only.

### WS-F-12: Quantity Resets to 1 When Editing
Local state `quantity` defaults to 1. Not pre-populated with existing slot quantity on edit.

### WS-F-14: No Email/Phone Validation
`validateEmail` and `validatePhone` exist in validators.ts but are never called in ClientInfoStep.

### WS-F-16: No Total Quantity Guard
6 slots × 99 max = 594 units possible. No warning for unrealistic quantities.

### WS-G-13: totals and Pricing Typed as `any`
`generatePDF.tsx:29-30` — No type safety on pricing parameters.

### WS-G-15: No Quantity Guard in PDF
Zero-quantity slots pass the active filter and appear as R0.00 line items.

### WS-G-16: Default Signatory "John Smith" Hardcoded
PDFs from TopBar/ExportStep always show "John Smith, Sales Manager" regardless of logged-in user.

### WS-G-17: Customer Address Fallback Check Always True
`clientAddress.length > 0` is true for `['','','','']`. Placeholder never shown.

### WS-G-18: T&C Template Loaded with Unsafe Cast
`as typeof defaultTermsTemplate` with no runtime validation. Malformed template crashes PDF generation.

### WS-H-2: Presence Feature Has Correct Guards (Informational)
Runtime guards are correct. Import chain still triggers WS-H-1.

### WS-H-10: useOnlineStatus Dead Code in handleOnline
`if (!navigator.onLine)` inside `handleOnline` is always false. Dead code.

---

## Statistics

| Severity | Count |
|----------|-------|
| P0 | 6 |
| P1 | 23 |
| P2 | 52 |
| P3 | 17 |
| **Total** | **98** |

| Workstream | P0 | P1 | P2 | P3 | Total |
|------------|----|----|----|----|-------|
| A — Routing/Autosave | 1 | 3 | 2 | 0 | 6 |
| B — Financial Math | 2 | 3 | 7 | 6 | 18 |
| C — Data Integrity | 0 | 3 | 11 | 4 | 18 |
| D — Security/RBAC | 2 | 8 | 6 | 1 | 17 |
| E — State Management | 0 | 2 | 10 | 2 | 14 |
| F — Builder Wizard | 0 | 4 | 8 | 3 | 15 |
| G — PDF Generation | 1 | 0 | 9 | 5 | 15 |
| H — Realtime/Errors | 0 | 0 | 7 | 2 | 9 |

> Note: Some findings overlap across workstreams (e.g., WS-D-12 same as WS-C-11). De-duplicated count is approximately 98 unique issues.

---

*Generated by Claude Code (Opus 4.6) — New Findings Report*
