# Changes Implemented (Codex)

Date: 2026-02-19  
Scope: Execute the agreed remediation plan with focus on go-live blockers and immediate hardening.

## Implemented Fixes

### P0-1 Deep-link quote loading
- Implemented query-param aware loading in `src/Dashboard.tsx`.
- `/quote?id=<id>` now attempts `loadFromDB(id)`.
- `/quote` with no `id` now loads most recent quote.
- Missing/invalid `id` now shows a visible error and resets in-memory quote to avoid editing stale data.
- Prevented global startup loader from overriding `/quote` route loading logic in `src/App.tsx`.

### P0-2 Autosave singleton + race reduction
- Enforced single autosave instance at app level in `src/App.tsx`.
- Added shared autosave context in `src/hooks/AutoSaveContext.tsx`.
- Switched `TopBar` and builder export step to consume shared autosave context:
  - `src/components/layout/TopBar.tsx`
  - `src/components/builder/steps/ExportStep.tsx`
- Updated unsaved-changes hook to consume shared autosave state instead of creating a second autosave instance:
  - `src/hooks/useUnsavedChanges.ts`
- Replaced full `loadQuote(...)` mutations during autosave with narrow store actions:
  - Added `setQuoteRef` and `setVersion` in `src/store/useQuoteStore.ts`
  - Updated `src/hooks/useAutoSave.ts` to use them

### P0-3 Financial correctness (landed-cost basis + PMT guard)
- Added PMT safety guard for invalid terms (`nPeriods <= 0`) in `src/engine/calculationEngine.ts`.
- Changed slot margin basis to landed cost:
  - `src/store/useQuoteStore.ts`
  - `src/engine/calculationEngine.ts` (`calcSlotPricingFull`)
- Changed IRR initial outlay basis to landed cost in quote totals:
  - `src/store/useQuoteStore.ts`
- Updated PMT edge-case test expectation:
  - `src/engine/__tests__/calculationEngine.test.ts`

### P0-4 Permission override deny fix
- Implemented explicit deny semantics in `hasPermission` so `override === false` revokes access:
  - `src/auth/permissions.ts`
- Added tests for role/default, grant, deny, and unrelated override behavior:
  - `src/auth/__tests__/permissions.test.ts`

### P0-5 PDF field correctness and quote type consistency
- PDF generator now defaults `quoteType` from quote state, not hardcoded rental:
  - `src/pdf/generatePDF.tsx`
- Removed hardcoded signatory defaults in PDF generation.
- Replaced deprecated monthly fields in PDF line items with current computed fields:
  - maintenance from pricing engine
  - telematics/operator from active commercial fields
- Quote Generator panel now uses persisted quote `quoteType` from store:
  - `src/components/panels/QuoteGeneratorPanel.tsx`

### P0-6 Logistics shipping persistence
- Added typed shipping model:
  - `src/types/quote.ts` (`ShippingEntry`, `shippingEntries` on `QuoteState`)
- Added quote store shipping actions:
  - `addShippingEntry`, `updateShippingEntry`, `removeShippingEntry`
  - `src/store/useQuoteStore.ts`
- Moved Logistics panel from local state to quote store state:
  - `src/components/panels/LogisticsPanel.tsx`
- Added shipping serialization/deserialization:
  - `src/db/interfaces.ts`
  - `src/db/serialization.ts`
- Added/updated serialization tests:
  - `src/db/__tests__/serialization.test.ts`
- Added shipping fallback for Supabase-loaded quotes:
  - `src/db/SupabaseAdapter.ts`
- Added Supabase write mapping for shipping:
  - `src/db/SupabaseAdapter.ts` now includes `shipping_entries: JSON.stringify(quote.shippingEntries ?? [])` in `saveQuote(...)`
  - prevents cloud/hybrid shipping data loss on device change or local cache reset
  - read path now handles both text and JSONB array shapes for `shipping_entries`

### P0-7 CRM ownership enforcement (low-role restriction)
- Added role-aware access filtering in company data hook:
  - `src/hooks/useCompanies.ts`
  - `sales_rep` and `key_account` now restricted to assigned companies
- Enforced default “My Accounts” behavior and disabled broad toggle for restricted roles:
  - `src/components/crm/CustomerListPage.tsx`

### P0-8 Backup/restore completeness hardening
- Expanded backup manifest coverage across active operational stores:
  - `priceListSeries`, `forkliftModels`, `batteryModels`, `containerMappings`, `telematicsPackages`, `attachments`, `notifications`
- Added backup metadata:
  - `schemaVersion`, `appVersion`, backup `version`
- Added import compatibility guard for newer schema backups.
- Expanded replace-mode clear and import restore paths for newly covered stores.
- Expanded import preview UI counts for covered stores.
- File:
  - `src/components/admin/backup/BackupRestore.tsx`

### P1-2 Login rate limiting / lockout (implemented early)
- Added progressive delay, failed-attempt tracking, and temporary lockout in auth store.
- Added audit events for `login_failed` and `lockout`.
- Extended audit action type union.
- Files:
  - `src/store/useAuthStore.ts`
  - `src/db/interfaces.ts`

## Validation Results

Executed successfully:
1. `npm run typecheck`
2. `npm run test` (96 tests passed)
3. `npm run build`

## Files Added
- `src/hooks/AutoSaveContext.tsx`
- `src/auth/__tests__/permissions.test.ts`
- `codex/changes.md`

## Notes
- Shipping data is now persisted and survives save/load cycles. Financial totals were not forcibly changed to include shipping by default to avoid introducing unapproved pricing side effects.
- Backup restore continues to protect against user-password data loss patterns; password hashes are still excluded from backup payloads.

## Frontend Audit Report (Go-Live)
- Added detailed frontend audit report:
  - `codex/frontend go live frontend report.md`
- Scope covered: button wiring, route correctness, modal flows, responsive sizing risks, and accessibility issues.
- Prioritization included: `P0`, `P1`, `P2` with exact file/line references and recommended fix order.

## Front End Fix Final (Combined Codex + Claude)
- Added consolidated frontend report:
  - `codex/front end fix final.md`
- Merges Codex and Claude findings with final severity calibration and execution waves.
- Includes exact file references for P0/P1/P2 fixes.

## Frontend Remediation Execution (Combined Plan)

Date: 2026-02-19
Scope: Execute all P0, P1, and P2 frontend fixes from `codex/front end fix final.md`.

### Completed Fixes

**P0 (5/5 completed):**
- FEF-P0-1: LinkedQuotes now navigates with quote ID (`/quote?id=...`)
- FEF-P0-2: Builder Export button routes to `/quote` with "Back to Quote" label
- FEF-P0-3: CompanyPickerModal "Create New" navigates to `/customers` with `openNewLead` state
- FEF-P0-4: Admin routes wrapped with `RequirePermission` component for per-resource auth
- FEF-P0-5: All empty catch blocks in ApprovalDashboard now log with console.error/warn

**P1 (10/11 completed, 1 deferred):**
- FEF-P1-1: Button component defaults to `type="button"`
- FEF-P1-2: SearchableSelect clear button has `type="button"` and `aria-label`
- FEF-P1-3: CrmTopBar `isActive()` uses exact path + child matching (no false positives)
- FEF-P1-4: QuotesListPage sort headers wrapped in `<button>` with `aria-sort`
- FEF-P1-5: 12 icon-only buttons across 7 files now have `aria-label`
- FEF-P1-6: ApprovalActionModal Escape key now closes modal (when not processing)
- FEF-P1-7: EditModal stops propagation only on Escape (no longer blocks all keys)
- FEF-P1-8: Deferred (hash navigation works correctly with HashRouter)
- FEF-P1-9: Numeric inputs clamped (ROE >= 0, discount/interest 0-100)
- FEF-P1-10: LoadQuoteModal and QuoteComparisonModal reset state on close
- FEF-P1-11: CustomerListPage user name preload has `.catch()` handler

**P2 (4/5 completed, 1 mostly deferred):**
- FEF-P2-1: Kanban skeleton uses responsive grid (`grid-cols-2 sm:3 md:5 lg:7`)
- FEF-P2-2: FleetBuilderPanel `text-[10px]` replaced with `text-xs` globally
- FEF-P2-3: LoadQuoteModal inline width styles replaced with Tailwind classes
- FEF-P2-4: Deferred (wide-reaching style standardization, low risk)
- FEF-P2-5: Backdrop click-to-close added to 6 modals

### Changed Files (22)
- `src/components/crm/detail/LinkedQuotes.tsx`
- `src/components/builder/steps/ExportStep.tsx`
- `src/components/crm/shared/CompanyPickerModal.tsx`
- `src/components/builder/steps/ClientInfoStep.tsx`
- `src/components/admin/AdminLayout.tsx`
- `src/components/admin/approvals/ApprovalDashboard.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/SearchableSelect.tsx`
- `src/components/crm/CrmTopBar.tsx`
- `src/components/quotes/QuotesListPage.tsx`
- `src/components/crm/detail/ContactCard.tsx`
- `src/components/shared/LoadQuoteModal.tsx`
- `src/components/shared/QuoteComparisonModal.tsx`
- `src/components/shared/ApprovalActionModal.tsx`
- `src/components/admin/shared/EditModal.tsx`
- `src/components/GlobalSearch.tsx`
- `src/components/builder/steps/QuoteSettingsStep.tsx`
- `src/components/crm/CustomerListPage.tsx`
- `src/components/panels/FleetBuilderPanel.tsx`
- `src/components/crm/merge/CompanyMergeModal.tsx`
- `src/components/admin/shared/ConfirmDialog.tsx`

### Validation Results
- `npx tsc --noEmit`: 0 errors
- `npx vitest run`: 96/96 tests passed
- `npx vite build`: Clean production build

### Deferred Items
- FEF-P1-8: Hash navigation works correctly with HashRouter; proper fix adds complexity for no user benefit
- FEF-P2-4: Converting 16 raw buttons to shared Button is wide-reaching for purely cosmetic gain

## Bug Fix Sprint — 2026-02-21

### Round 1 (17 bugs identified, initial fixes applied)

17 bugs were identified across store logic, hooks, engine calculations, and UI components. Initial fixes were applied in a single pass.

### Round 2 (9 corrective fixes after code review)

Code review found 8 fully fixed, 6 partially fixed, and 3 regressions. The following 9 corrective fixes were applied:

| Bug # | Fix | File(s) | Description |
|-------|-----|---------|-------------|
| #3 | Fix A | `useQuoteStore.ts`, `useRealtimeQuote.ts`, `useAutoSave.ts` | Added `_lastSavedAt` timestamp to store; replaced broken epoch-vs-version heuristic with reliable `updatedAt > _lastSavedAt` dirty check; call `markSaved()` after successful auto-save |
| #2 | Fix D | `useQuoteStore.ts` | Deep-merge slots by `slotIndex` in `loadQuote()` — preserves `clearingCharges` and `localCosts` defaults for older quotes missing new fields |
| #27 | Fix B | `usePriceList.ts` | Added `requestIdRef` race-condition guard to `useSeriesData`, `useSeriesModels`, `useModelOptions` — prevents stale data from rapid dropdown changes |
| #9 | Fix C | `commissionEngine.ts` | Reverted to half-open `[min, max)` intervals with last-tier fallback — eliminates tier overlap at exact boundaries |
| #23 | Fix J | `approvalEngine.ts`, `useApprovalActions.ts`, `ApprovalDashboard.tsx`, `PendingApprovalsWidget.tsx` | `getNextStatus` returns `null` for invalid transitions; all 3 callsites check and show error toast instead of creating phantom entries |
| #18 | Fix E | `formatters.ts` | Added `Number.isFinite()` guard to `formatNumber` and `formatCompact` |
| #20 | Fix F | `GlobalSearch.tsx` | Changed `stopPropagation()` to `stopImmediatePropagation()` on Escape key handler |
| #6 | Fix G | `useAuthStore.ts` | Call `resetDbAdapter()` on logout after `resetRepositories()`, with logged error handling |
| #4 | Fix H | `useQuoteLock.ts` | Removed `lockedBy` from main effect deps — prevents acquire/release cycle; separate takeover-detection effect handles external lock changes |
| #22 | Fix I | `containerOptimizer.ts` | Added `containerHeight > 0` to active-unit filter — prevents zero-height units from entering packing algorithm |

### Validation Results
- `npx tsc --noEmit`: 0 type errors
- `npx vitest run`: 122/122 tests passed
