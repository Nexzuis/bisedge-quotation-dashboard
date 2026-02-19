# Remediation Plan

> Prioritized fix plan for all confirmed + new findings.
> Three waves: Wave 0 (same-day), Wave 1 (72 hours), Wave 2 (1–2 weeks).

---

## Wave 0 — Critical / Same-Day Fixes

These bugs produce **incorrect financial output** or **broken core navigation**. Must be fixed before any production use.

### Fix 0.1: Financial Calculation Corrections (WS-B-2, B-3, B-5)

**What:** Margin and IRR use `factoryCostZAR` instead of `landedCostZAR`, inflating margins 2-3x and cascading into commission overpayment.

**Files to change:**
- `src/store/useQuoteStore.ts:611` — Change `calcMargin(sellingPriceZAR, factoryCostZAR)` → `calcMargin(sellingPriceZAR, landedCostZAR)`
- `src/store/useQuoteStore.ts:700` — Change `totalFactoryCost += pricing.factoryCost * slot.quantity` → `totalFactoryCost += pricing.landedCostZAR * slot.quantity` (rename variable to `totalLandedCost`)
- `src/engine/calculationEngine.ts:442` — Same margin fix in `calcSlotPricingFull`

**Acceptance criteria:**
- [ ] Margin reflects true margin on landed cost, not factory cost
- [ ] IRR initial outlay uses full landed cost
- [ ] Commission tiers match the corrected margin

### Fix 0.2: Singleton Autosave (WS-A-2, E-3, A-6)

**What:** 3-4 concurrent autosave instances cause version conflicts and double-saves.

**Files to change:**
- `src/hooks/useUnsavedChanges.ts` — Remove `useAutoSave()` call. Accept `lastSavedAt` as prop or read from context.
- `src/components/layout/TopBar.tsx` — Remove `useAutoSave()`. Read save status from context/store.
- `src/components/builder/steps/ExportStep.tsx` — Remove `useAutoSave()`. Use passed `saveNow` or context.
- Keep only the single instance at `src/App.tsx:72`.

**Acceptance criteria:**
- [ ] Only 1 `useAutoSave()` instance exists in the active component tree
- [ ] Save status (saving/saved/error) shared via context
- [ ] No duplicate save operations in network tab

### Fix 0.3: Deep Link Reading (WS-A-1)

**What:** 8 navigation sites generate `?id=<uuid>` but nothing reads it.

**Files to change:**
- `src/Dashboard.tsx` — Add `useSearchParams()` and `useQuoteDB().loadFromDB(id)` on mount
- `src/App.tsx:98-118` — Gate `loadMostRecent()` to only fire when no `?id=` parameter is present

**Acceptance criteria:**
- [ ] Clicking a quote in any list navigates to `/quote?id=<uuid>` and loads that specific quote
- [ ] If no `?id=` parameter, falls back to `loadMostRecent()`

### Fix 0.4: PDF Cost Fields (WS-G-1, F-8, F-9)

**What:** PDF uses deprecated zero-value fields for cost breakdown and ignores quote type.

**Files to change:**
- `src/pdf/generatePDF.tsx:83-87` — Replace `slot.maintenanceCostPerMonth` with `pricing.maintenanceMonthly`, replace `slot.telematicsCostPerMonth` with `slot.telematicsSubscriptionSellingPerMonth`
- `src/pdf/generatePDF.tsx:38` — Read `quoteType` from `quoteState.quoteType` instead of defaulting to `'rental'`
- All three callers (TopBar, ExportStep, QuoteGeneratorPanel) — Pass `{ quoteType: quote.quoteType }` in options

**Acceptance criteria:**
- [ ] PDF additional costs line items add up to the total monthly
- [ ] PDF quote type matches user selection
- [ ] No deprecated field reads in PDF generation

### Fix 0.5: PMT Division-by-Zero Guard (WS-B-6)

**What:** `pmt()` divides by zero when `nPeriods = 0`.

**Files to change:**
- `src/engine/calculationEngine.ts:13-25` — Add `if (nPeriods <= 0) return 0;` at top of function

**Acceptance criteria:**
- [ ] `pmt(0.01, 0, -100000)` returns `0`, not `NaN`/`Infinity`
- [ ] Existing tests still pass

---

## Wave 1 — High Priority / 72 Hours

### Fix 1.1: CRM Access Control (WS-D-2, D-3, D-4)

**What:** All CRM data visible to all users regardless of role.

**Changes:**
- `CustomerListPage.tsx:27` — Default `showMyAccounts` to `true` for `sales_rep` and `key_account`
- `CustomerDetailPage.tsx:28-33` — Add ownership check after loading company
- `useCompanies.ts` — Accept `userId` filter parameter
- `SupabaseAdapter.ts:listCompanies` — Add `assigned_to` filter for non-managers

### Fix 1.2: Admin Route Per-Permission Guards (WS-D-8, D-18, D-19)

**What:** `sales_manager` can access all admin sub-routes including user management and backup.

**Changes:**
- Create `RequirePermission` wrapper component
- Wrap each admin sub-route with appropriate permission check
- Add internal permission check to `UserManagement.tsx` and `BackupRestore.tsx`

### Fix 1.3: Permission Override Deny Fix (WS-D-1)

**What:** Setting a permission override to `false` does not deny access.

**Changes:**
- `src/auth/permissions.ts:186-191` — Change logic to: if override is `true`, grant; if override is `false`, deny; if undefined, use base role permission

### Fix 1.4: Seed Overwrite Prevention (WS-C-17)

**What:** Seed force-overwrites admin-configured ROE and discount on every startup.

**Changes:**
- `src/db/seed.ts:218-221` — Remove the force-update block for `defaultROE`, `defaultFactoryROE`, and `defaultDiscountPct`
- Or gate it behind a version/flag check

### Fix 1.5: Admin Password Console Logging (WS-C-11, D-12)

**What:** Generated admin password printed to console.warn.

**Changes:**
- `src/db/seed.ts:131-136` — Replace `console.warn` with a first-time setup modal/wizard
- If not feasible, at minimum use `console.log` with immediate clear, or store in a temporary toast

### Fix 1.6: Login Rate Limiting (WS-D-13)

**What:** No rate limiting on login attempts.

**Changes:**
- `src/store/useAuthStore.ts:login` — Add failed attempt tracking with exponential backoff
- Lock accounts after 10 consecutive failures

### Fix 1.7: Backup Store Coverage (WS-D-5, H-8)

**What:** 7 database stores missing from backup.

**Changes:**
- `BackupRestore.tsx` — Add `batteryModels`, `priceListSeries`, `telematicsPackages`, `containerMappings`, `notifications`, `forkliftModels`, `attachments` to export/import
- Add schema version field and validation on import

### Fix 1.8: ROE Consistency (WS-C-9)

**What:** Three different ROE values across code, docs, and tests.

**Changes:**
- Decide canonical ROE values with business stakeholders
- Update seed, hardcoded fallbacks, documentation, and test fixtures to match
- Decide if dual-ROE model (factoryROE vs customerROE) is intended

### Fix 1.9: Configuration Cost Calculation (WS-F-4)

**What:** `toggleOption` does not recalculate `configurationCost` — stays 0 if Configure step is skipped.

**Changes:**
- `useQuoteStore.ts:toggleOption` — Add `configurationCost` recalculation after toggling
- Or remove Configure step (step 3) from `SKIPPABLE_STEPS`

### Fix 1.10: Supabase Lazy Loading (WS-H-1, H-9)

**What:** Module-level throw blocks local mode; SyncQueue fires side effects at import.

**Changes:**
- `supabase.ts` — Replace module-level throw with lazy `getSupabase()` factory
- `DatabaseAdapter.ts` — Convert static imports to dynamic `import()` gated on mode
- `SyncQueue.ts` — Replace singleton export with lazy factory function

### Fix 1.11: loadQuote Store Replacement (WS-A-7, E-2)

**What:** Every successful save replaces the entire Zustand store via `loadQuote`.

**Changes:**
- Add `setVersion(v: number)` action that only mutates `state.version`
- Add `setQuoteRef(ref: string)` action
- Replace `loadQuote` calls in `useAutoSave.ts` with targeted setters

### Fix 1.12: Unsanitized ilike Filter (WS-D-10, D-11)

**What:** One `.ilike()` call bypasses `sanitizePostgrestValue()`. Sanitizer misses `%` and `_`.

**Changes:**
- `SupabaseAdapter.ts:189` — Wrap with `sanitizePostgrestValue()`
- `sanitize.ts` — Add `%` and `_` to stripped characters

---

## Wave 2 — Medium Priority / 1–2 Weeks

### Fix 2.1: Pricing Memoization (WS-E-6, E-7, E-10, E-11)

**What:** O(N×M) pricing recalculations per render cycle.

**Changes:**
- Memoize `getQuoteTotals()` result in store state
- Replace `useQuoteStore((s) => s)` with specific selectors in TopBar, QuoteGeneratorPanel, ApprovalWorkflowPanel, ExportStep
- Replace `useQuoteStore()` calls in useQuoteLock, useWorkflowProgress

### Fix 2.2: Container Optimizer (WS-B-7, B-8, B-17)

**What:** 1D space tracking, zero-dimension units always fit, crashes on empty types.

**Changes:**
- Implement length-only strip packing (width/height per unit roughly constant for forklifts)
- Add zero-dimension guard
- Add empty `containerTypes` guard

### Fix 2.3: Clearing Charges ROE Propagation (WS-B-9)

**What:** EUR-denominated clearing charges frozen at slot creation time.

**Changes:**
- Store EUR values separately and convert dynamically using current `factoryROE`
- Or add `setFactoryROE` handler that recalculates all slots' EUR clearing charges

### Fix 2.4: Duties/Warranty Calculation (WS-B-10)

**What:** `dutiesPct` and `warrantyPct` from JSON are never applied (always R0).

**Changes:**
- Compute duties and warranty dynamically in `getSlotPricing()` based on percentages and factory cost
- Verify with business whether these should be automatic or manual entry

### Fix 2.5: Builder Wizard Validation (WS-F-2, F-3, F-17)

**What:** 6 of 8 steps allow unconditional proceed; completedSteps never invalidated.

**Changes:**
- Add meaningful validation to CommercialStep (require operating hours > 0, markup > 0)
- Re-validate `completedSteps` when navigating backwards
- Consider removing skip buttons or gating them

### Fix 2.6: Serialization Field Merging (WS-C-3, C-4)

**What:** Restored slots may have undefined fields; two createEmptySlot implementations diverge.

**Changes:**
- After JSON.parse, merge each slot with default template: `parsed.map((s, i) => ({ ...createEmptySlot(i), ...s }))`
- Unify to a single `createEmptySlot()` implementation

### Fix 2.7: V5 Migration Privilege Escalation (WS-C-8)

**What:** `viewer` → `sales_rep` + deactivated. Reactivation grants sales_rep permissions.

**Changes:**
- Add a `viewer` equivalent role, or add `permissionOverrides` restricting reactivated former viewers
- Log unmapped roles during migration

### Fix 2.8: Logout Data Handling (WS-D-20, E-9)

**What:** Logout clears business data tables in local mode; CRM/config stores not cleared.

**Changes:**
- In local mode, do NOT clear quotes, companies, contacts, activities on logout
- DO clear CRM filter state and config store on logout
- Remove `crm-ui-storage` from localStorage

### Fix 2.9: Error Handling (WS-H-5)

**What:** No global handlers for unhandled rejections; async errors silently lost.

**Changes:**
- Add `window.addEventListener('unhandledrejection', handler)` in `main.tsx`
- Show toast for unhandled async errors
- Consider error reporting service integration

### Fix 2.10: SyncQueue Migration (WS-H-6)

**What:** Sync queue in localStorage with no size limit.

**Changes:**
- Migrate queue storage from localStorage to IndexedDB (as the TODO comment suggests)
- Add max queue size with overflow warning
- Add admin UI for viewing/retrying failed sync operations

### Fix 2.11: PDF Completeness (WS-G-2, G-3, G-7, G-8, G-10, G-11, G-14, G-16)

**What:** Multiple PDF data gaps — empty specs, missing logistics, placeholder images, no approval status.

**Changes (incremental):**
- Populate specifications from product catalog
- Add logistics/shipping section
- Implement signature image rendering
- Add approval status display
- Replace placeholder product images
- Populate battery voltage/capacity
- Implement distinct rent-to-own pricing columns
- Use authenticated user as default signatory

### Fix 2.12: Realtime Subscription Stability (WS-E-4, E-5)

**What:** Subscription churn on every version change; stale closures.

**Changes:**
- Use refs for `currentVersion` and `user.id` in `useRealtimeQuote`
- Remove from `useCallback` dependency arrays
- Keep subscription stable across version bumps

### Fix 2.13: Conflict Resolution Completeness (WS-H-7)

**What:** Missing statuses in `mergeStatus`; slot merge silently drops local edits.

**Changes:**
- Add `in-review` and `changes-requested` to `statusOrder`
- Reconsider `rejected` > `approved` ordering
- Add user-facing conflict resolution dialog for slot conflicts

### Fix 2.14: Quote Lock Implementation (WS-H-3, E-13)

**What:** Lock hook exists but is unused; acquireLock has TOCTOU race.

**Changes:**
- Move check inside `set()` callback for atomicity
- Add lock TTL (5 minutes)
- Add server-side stale lock cleanup
- Actually integrate `useQuoteLock` into the editing flow

### Fix 2.15: Negative Margin Validation (WS-B-14)

**What:** Quotes with negative margins are not flagged.

**Changes:**
- Add per-slot margin check in `validateQuoteSync`
- Block or warn when margin < 0

### Fix 2.16: ZAR Rounding (WS-B-13)

**What:** No rounding applied to currency values.

**Changes:**
- Add `roundZAR(value)` utility: `Math.round(value * 100) / 100`
- Apply at slot pricing level before aggregation

---

## Acceptance Checklist

After all waves are complete, verify:

- [ ] `npm run typecheck` — PASS
- [ ] `npm run build` — PASS
- [ ] `npm run test` — PASS (all existing + new tests)
- [ ] `npm run lint` — 0 errors (warnings acceptable)
- [ ] Financial calculations produce correct margins on landed cost
- [ ] PDF output matches user selections and shows correct cost breakdown
- [ ] Deep links load the correct quote
- [ ] Only one autosave instance active at any time
- [ ] CRM data filtered by role at repository level
- [ ] Admin sub-routes check per-route permissions
- [ ] Backup exports/imports all 20 database stores
- [ ] No plaintext passwords in console output
- [ ] Login locked after 10 failed attempts

---

## Estimated Scope

| Wave | Fixes | Files Touched | Estimated Complexity |
|------|-------|--------------|---------------------|
| Wave 0 | 5 fixes | ~8 files | Low-Medium |
| Wave 1 | 12 fixes | ~20 files | Medium |
| Wave 2 | 16 fixes | ~30 files | Medium-High |

**Recommendation:** Execute Wave 0 immediately. Wave 1 within the first week. Wave 2 can be parallelized across developers.

---

*Generated by Claude Code (Opus 4.6) — Remediation Plan*
