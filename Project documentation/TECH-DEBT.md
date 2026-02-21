# TECH-DEBT.md — BIS Edge Quotation Dashboard

Generated: 2026-02-21
Source: Full codebase audit across `src/` (234 source files, ~25,000 LOC).

---

## How to read this document

Each item has a severity tag:
- **CRITICAL** — causes bugs, data loss, security holes, or crashes now
- **IMPORTANT** — significant maintenance burden, risk, or correctness issue
- **MINOR** — cosmetic, low-risk, or low-impact

Items within each section are ordered by severity (highest first).

---

## 1. Duplicated Code

### TD-1.1 `validateQuote` and `validateQuoteSync` are identical copy-pastes [CRITICAL]

- **Files:** `src/engine/validators.ts` lines 41-161 and 166-286
- **Problem:** Two functions (~240 lines) with character-for-character identical logic. `validateQuote` is `async` but contains zero `await` calls. `validateQuoteSync` is the synchronous copy.
- **Risk:** Fixing a bug in one without updating the other creates silent divergence.
- **Fix:** Delete `validateQuoteSync`. Remove the unnecessary `async` from `validateQuote`.

### TD-1.2 `CommissionTier` type defined 3 times with field name drift [CRITICAL]

- **Files:**
  - `src/types/quote.ts` lines 344-348 — field `commissionPct`
  - `src/db/interfaces.ts` lines 316-321 — field `commissionRate`
  - `src/engine/commissionEngine.ts` lines 4-9 — field `commissionPct` + `description`
- **Problem:** Three interfaces for the same domain concept with different field names. Already causing the commission_tiers production bug (PLAN.md 1.1).
- **Fix:** One canonical definition. Standardise on one field name.

### TD-1.3 Commission tier-matching algorithm copy-pasted 3 times [IMPORTANT]

- **File:** `src/engine/commissionEngine.ts` lines 22-33, 55-65, 75-82
- **Problem:** `calcCommission`, `calcCommissionSync`, and `getCommissionTier` all contain the same sorted-tier half-open-interval lookup logic.
- **Fix:** Extract `findMatchingTier(tiers, marginPct)` helper. Call it from all three.

### TD-1.4 Save-quote-then-audit boilerplate repeated in 3 places [IMPORTANT]

- **Files:**
  - `src/hooks/useApprovalActions.ts` lines 82-103 and 199-217
  - `src/components/panels/ApprovalWorkflowPanel.tsx` lines 107-125
- **Problem:** Identical 20-line sequence: save quote, check success, set version, markSaved, log audit. The panel reimplements what the hook already does.
- **Fix:** Extract `saveQuoteWithAudit()` helper. Panel should call the hook, not reimplement.

### TD-1.5 Supabase `price_list_series` query repeated 4 times + 5 JSON parse duplicates [IMPORTANT]

- **File:** `src/hooks/usePriceList.ts` lines 22, 76, 139, 196 (queries) and lines 34, 94, 99, 157, 214 (JSON parsing)
- **Problem:** `useSeriesData`, `useSeriesModels`, and `useModelOptions` all run the same `.eq('series_code', x).maybeSingle()` query independently. Five identical `typeof x === 'string' ? JSON.parse(x) : (x || [])` blocks.
- **Fix:** `useSeriesModels` and `useModelOptions` should derive from `useSeriesData`. Extract `parsePriceListRow()`.

### TD-1.6 Pending-approval count query duplicated across 3 files [IMPORTANT]

- **Files:**
  - `src/hooks/useApprovalCount.ts` lines 28-31
  - `src/components/dashboard/widgets/PendingApprovalsWidget.tsx` lines 118-127
  - `src/components/admin/approvals/ApprovalDashboard.tsx` lines 514-517
- **Problem:** All three independently query `quotes` for `pending-approval` and `in-review` counts. `useApprovalCount` exists for this purpose but the other two ignore it.
- **Fix:** Widget and dashboard should consume `useApprovalCount`.

### TD-1.7 Polling-with-visibility pattern repeated 3 times [IMPORTANT]

- **Files:** `src/hooks/useApprovalCount.ts` lines 47-73, `src/hooks/useNotifications.ts` lines 51-76, `src/hooks/usePresence.ts` lines 72-86
- **Problem:** Identical ~25-line pattern: setInterval, visibilitychange listener, pause/resume, cleanup.
- **Fix:** Extract `usePollingWithVisibility(callback, intervalMs)` utility hook.

### TD-1.8 Pipeline stage constants defined in 3 places [IMPORTANT]

- **Files:** `src/hooks/useReportingData.ts` lines 67-85, `src/hooks/usePipelineMetrics.ts` lines 5-13, `src/components/crm/shared/stageConfig.ts` lines 22-79
- **Problem:** Same 7 stages hardcoded in 3 locations. `stageConfig.ts` is the richest canonical source, but the hooks ignore it.
- **Fix:** Import from `stageConfig.ts` everywhere.

### TD-1.9 Config data fetched from 5+ independent entry points [IMPORTANT]

- **Files:** `src/store/useConfigStore.ts` (cached), `src/hooks/usePricingConfig.ts` (3 hooks, each with own cache), `src/engine/commissionEngine.ts` (3 uncached fresh fetches)
- **Problem:** `useConfigStore` already loads and caches all config. The hooks and engine ignore it and make their own DB calls.
- **Fix:** Route all config reads through `useConfigStore`.

### TD-1.10 `StoredNotification` type defined in 2 places [IMPORTANT]

- **Files:** `src/types/notifications.ts` lines 16-26 and `src/db/interfaces.ts` lines 291-301
- **Fix:** Single canonical definition.

### TD-1.11 `getAvailabilityBadge` defined twice with different labels [IMPORTANT]

- **Files:** `src/hooks/usePriceList.ts` lines 488-501, `src/hooks/useConfigurationMatrix.ts` lines 190-206
- **Problem:** Same switch-case logic but level 3 shows "Non-Standard" vs "Special Order".
- **Fix:** Single shared utility with consistent labels.

### TD-1.12 `useAuth()` vs `useAuthStore()` — two APIs for the same data [MINOR]

- **Problem:** `useAuth()` from `AuthContext.tsx` is a thin wrapper around `useAuthStore()`. ~25 files use one, ~20 use the other.
- **Fix:** Pick one. Standardise.

### TD-1.13 CRUD hook boilerplate repeated across 4 hooks [MINOR]

- **Files:** `useContacts.ts`, `useActivities.ts`, `useLeads.ts`, `useCompanies.ts`
- **Problem:** Same try/catch → console.error → return fallback pattern repeated ~20 times.
- **Fix:** Generic `useRepository(repoFactory)` hook.

### TD-1.14 `useQuotes` and `useQuoteDB` overlap [MINOR]

- **Problem:** Both provide quote listing/searching through different layers. Developers unsure which to use.
- **Fix:** Consolidate into one hook.

### TD-1.15 Permission overrides parsing duplicated within same file [MINOR]

- **File:** `src/store/useAuthStore.ts` lines 136-145 and 234-243
- **Fix:** Extract `parsePermissionOverrides(raw)` utility.

---

## 2. Missing Error Handling

### TD-2.1 ~236 raw `console.*` calls instead of logger utility [IMPORTANT]

- **Worst offenders:** `SupabaseAdapter.ts` (~40), `UserManagement.tsx` (9), `usePriceList.ts` (7), `ApprovalDashboard.tsx` (6), `useNotifications.ts` (4)
- **Problem:** Production console leaks. `logger.ts` exists but is used in only ~7 hooks.
- **Fix:** Replace with `logger.error()` / `logger.debug()`. Priority: `SupabaseAdapter.ts`.

### TD-2.2 ~30 empty `catch {}` blocks swallow errors silently [IMPORTANT]

- **Worst offenders:**
  - `src/store/useAuthStore.ts` — 6 silent catches (login, checkAuth, logout)
  - `src/db/SupabaseAdapter.ts` — 7 silent catches
  - `src/components/dashboard/widgets/PendingApprovalsWidget.tsx` — 3
  - `src/components/quotes/QuotesListPage.tsx` — 1
  - `src/components/leads/LeadExplorerPage.tsx` — 1
  - `src/components/crm/shared/CompanyForm.tsx` — 1
  - `src/components/crm/list/BulkActionsBar.tsx` — 2
- **Problem:** Errors disappear. No user notification, no logging, no debugging capability.
- **Fix:** At minimum log the error. For user-facing operations, show a toast.

### TD-2.3 Hooks catch errors but never notify the user [IMPORTANT]

- **Files:** `useNotifications.ts` (4 methods), `useCompanies.ts` (3), `useActivities.ts` (3), `useLeads.ts` (3), `usePriceList.ts` (7), `useCompanyMerge.ts` (3)
- **Problem:** `console.error()` is called but no `toast.error()` — user never knows the operation failed.
- **Fix:** Add user-facing error toasts for CRUD failures.

### TD-2.4 Hooks expose no loading or error state [IMPORTANT]

- **Files:** `useCompanies.ts`, `useActivities.ts`, `useLeads.ts`, `useContacts.ts`, `usePriceList.ts`, `useCompanyMerge.ts`, `useApprovalCount.ts`
- **Problem:** These hooks return async functions but no `isLoading` or `error` state. Components cannot show loading spinners or error messages.
- **Also:** The two hooks that do expose loading state use different names: `isLoading` vs `loading`.

---

## 3. Inconsistent Patterns Across Files

### TD-3.1 Data fetching: repository pattern vs direct Supabase [CRITICAL]

- **Through adapter (correct):** `useQuoteDB`, `useCompanies`, `useActivities`, `useContacts`, `useLeads`, `useNotifications`, `useReportingData`
- **Direct `supabase` calls (bypasses adapter):** `usePriceList` (all 8 sub-hooks), `useApprovalCount`, `usePresence`, `useQuoteLock`, `useCompanyMerge`, `useRealtimeQuote`, `useApprovalNotifications`, `UserManagement.tsx`, `ApprovalDashboard.tsx`, `PendingApprovalsWidget.tsx`
- **Impact:** Schema changes require hunting through 10+ files instead of updating the adapter once.

### TD-3.2 State management: granular selectors vs whole-store subscriptions [CRITICAL]

- **Correct (granular):** Panel components, most builder steps (individual `useQuoteStore((s) => s.field)` calls)
- **Wrong (whole store):**
  - `useWorkflowProgress.ts` line 16: `const quote = useQuoteStore()` — re-renders on every keystroke
  - `useQuoteLock.ts` line 37: destructured without selector
  - `TopBar.tsx` line 22: `useQuoteStore((state) => state)` — equivalent to no selector
  - `QuoteGeneratorPanel.tsx` line 25: same pattern
  - `ApprovalWorkflowPanel.tsx` line 53: same pattern
- **Also:** 20+ files destructure `useAuthStore()` without selector.
- **Impact:** Severe unnecessary re-renders.

### TD-3.3 Type casting: `as any` used 30+ times, `as unknown as` used 5 times [IMPORTANT]

- **`_lastSavedAt` phantom field (worst offender):** `useQuoteStore.ts` line 930, `useAutoSave.ts` line 182, `useRealtimeQuote.ts` line 52 — all access an undeclared store field via `(state as any)._lastSavedAt`. Completely bypasses TypeScript.
- **`ClientInfoStep.tsx`:** 4 calls cast customer info `as any` to bypass type safety.
- **`AuditLogViewer.tsx`:** 6 casts access fields not on the typed interface.
- **`ResidualCurvesEditor.tsx`:** 4 casts access dynamic term fields.
- **Schema mismatch casts:** `SupabaseAdapter.ts` lines 1338, 1361 use `as unknown as` to force commission/residual inserts past type checks.

### TD-3.4 Date formatting: 5+ different patterns [IMPORTANT]

- `formatDate()` from `src/engine/formatters.ts` outputs `DD/MM/YYYY` but is barely used outside PDFs.
- Components use `toLocaleDateString('en-ZA', ...)` with varying options.
- Some use `toLocaleDateString()` with no locale (browser-dependent).
- Some use `toLocaleString()` for timestamps.
- PDFs define their own inline formatters.
- **Fix:** Use `formatDate()` from formatters.ts everywhere. Create `formatDateTime()` variant.

### TD-3.5 Export style: 15 non-lazy files use `export default` [MINOR]

- Convention says named exports for everything except lazy-loaded routes.
- **Violators:** `Dashboard.tsx`, `App.tsx`, `AdminTopBar.tsx`, `AdminSidebar.tsx`, `DataTable.tsx`, `EditModal.tsx`, `ConfirmDialog.tsx`, `PricingManagement.tsx`, `CommissionTiersEditor.tsx`, `ResidualCurvesEditor.tsx`, `DefaultValuesEditor.tsx`, `ConfigurationMatrixManagement.tsx`, `TemplateManagement.tsx`, `LoginPage.tsx`, `NotFoundPage.tsx`

### TD-3.6 Naming: context files in hooks directory [MINOR]

- `src/hooks/AutoSaveContext.tsx` and `src/hooks/ReadOnlyContext.tsx` are React Contexts, not hooks, but live in the hooks directory.

---

## 4. Security Vulnerabilities

### TD-4.1 No Row-Level Security (RLS) on any table [CRITICAL]

- **Impact:** Any authenticated user can read/write/delete any record in any table via browser console. The Supabase anon key is embedded in the client bundle (expected), but without RLS it grants full access.
- **Attack vector:** `supabase.from('users').select('*')` from browser console returns all users. `supabase.from('quotes').delete().eq('id', x)` deletes any quote.

### TD-4.2 Client-side user creation with anon key [CRITICAL]

- **File:** `src/components/admin/users/UserManagement.tsx` lines 218-226
- **Problem:** `createClient()` with anon key → `auth.signUp()` → insert into `public.users`. Anyone who extracts the anon key from the JS bundle can create auth accounts. Without RLS, they can also insert a `system_admin` row.
- **Fix:** Server-side Edge Function with service-role key.

### TD-4.3 Frontend-only admin guards — no server enforcement [IMPORTANT]

- **File:** `src/App.tsx` lines 43-51
- **Problem:** `RequireAdmin` is a React component redirect. All admin operations (pricing config, user management, templates, settings) go through the same Supabase client. A `sales_rep` can call `getDb().saveCommissionTiers()` from browser console.
- **Fix:** RLS policies (TD-4.1) are the real fix.

### TD-4.4 IDOR on all entity access [IMPORTANT]

- **Problem:** `loadQuote(id)`, `getCompany(id)`, `deleteQuote(id)`, etc. accept any ID. Without RLS, any user can access any entity by ID.
- **Fix:** RLS policies with user-scoped access.

### TD-4.5 `setCustomerInfo` allows state pollution via Object.assign [IMPORTANT]

- **File:** `src/store/useQuoteStore.ts` lines 320-324
- **Problem:** `Object.assign(state, info)` can overwrite `status`, `approvalStatus`, `version`, `lockedBy`, etc. `ClientInfoStep.tsx` calls it with `as any` casts.
- **Fix:** Explicit field whitelist.

### TD-4.6 Auth role persisted in localStorage — tamperable [IMPORTANT]

- **File:** `src/store/useAuthStore.ts` lines 269-284
- **Problem:** User object with `role` is persisted to `localStorage['auth-storage']`. A user can change their role to `system_admin` and access admin routes before the async `checkAuth()` re-validates.
- **Mitigated by:** `checkAuth()` runs on mount, but there is a race window.

### TD-4.7 Weak password policy (6 chars, no complexity) [IMPORTANT]

- **File:** `src/components/admin/users/UserManagement.tsx` line 112
- **Problem:** Minimum 6 characters, no uppercase/digit/special requirements. Password reset dialog requires 8 chars — inconsistent.

### TD-4.8 Unsanitised `customerName` in `listQuotes` ilike [IMPORTANT]

- **File:** `src/db/SupabaseAdapter.ts` line 254
- **Problem:** `filters.customerName` is interpolated into `.ilike()` without `sanitizePostgrestValue()`. SQL wildcards `%` and `_` pass through.

### TD-4.9 No clickjacking protection headers [MINOR]

- **Files:** `vercel.json`, `index.html`
- **Problem:** No `X-Frame-Options` or `frame-ancestors` CSP. App can be iframed.

---

## 5. Missing Input Validation

### TD-5.1 Client info form: no email/phone validation [IMPORTANT]

- **File:** `src/components/builder/steps/ClientInfoStep.tsx` lines 211-224
- **Problem:** Relies on HTML `type="email"` and `type="tel"` (which accepts any text). `validateEmail()` and `validatePhone()` exist in `engine/validators.ts` but are never called.

### TD-5.2 No text length limits on any form input across entire app [IMPORTANT]

- **Files:** `ClientInfoStep.tsx`, `CompanyForm.tsx`, `ContactForm.tsx`, `AddActivityForm.tsx`, `UserManagement.tsx`, `CommercialStep.tsx`
- **Problem:** No `maxLength` attribute anywhere. Users can enter megabytes of text.

### TD-5.3 ROE accepts zero — causes NaN propagation [IMPORTANT]

- **File:** `src/components/builder/steps/QuoteSettingsStep.tsx` lines 78, 91
- **Problem:** `Math.max(0, parseFloat(e.target.value) || 0)` allows zero. ROE is used as a divisor. Zero ROE → NaN in all pricing.

### TD-5.4 Company form: negative estimated value accepted [IMPORTANT]

- **File:** `src/components/crm/shared/CompanyForm.tsx` lines 187-194
- **Problem:** HTML `min="0"` is advisory only. `parseFloat("-50000")` passes the `|| 0` fallback. Corrupts pipeline metrics.

### TD-5.5 Contact form: no email/phone validation [IMPORTANT]

- **File:** `src/components/crm/shared/ContactForm.tsx` lines 88-100
- **Problem:** Same as TD-5.1 but for CRM contacts.

### TD-5.6 Commercial step: advisory-only min/max on numeric fields [IMPORTANT]

- **File:** `src/components/builder/steps/CommercialStep.tsx` lines 16-34
- **Problem:** HTML `min`/`max` are not enforced in JavaScript. Users can bypass via paste or devtools.

### TD-5.7 No URL validation on website/LinkedIn fields [MINOR]

- **File:** `src/db/SupabaseAdapter.ts` lines 767, 1437-1438
- **Problem:** `website`, `sourceUrl`, `decisionMakerLinkedin` accept arbitrary text.

### TD-5.8 No validation on shipping entry quantity/cost [MINOR]

- **File:** `src/store/useQuoteStore.ts` lines 138-146
- **Problem:** `quantity` and `costZAR` not validated. `containerType` is a free-form string.

### TD-5.9 `sortBy` falls through to raw value if not in column map [MINOR]

- **File:** `src/db/SupabaseAdapter.ts` lines 264-272
- **Problem:** Unknown `sortBy` values pass through to `.order()`. PostgREST rejects invalid columns, but exposes internal column names in error messages.

---

## 6. Deprecated API Usage

### TD-6.1 `database.types.ts` is hand-written — should be auto-generated [IMPORTANT]

- **File:** `src/lib/database.types.ts` line 5 — `TODO: Replace with auto-generated types`
- **Problem:** Schema drift is the root cause of commission_tiers, residual_curves, and users.username bugs.
- **Fix:** Run `npx supabase gen types typescript --project-id <id>`.

### TD-6.2 `pg_proc` REST introspection at startup [IMPORTANT]

- **File:** `src/db/SupabaseAdapter.ts` — `verifyRequiredRpcs()` method
- **Problem:** Queries the PostgreSQL system catalog `pg_proc` via PostgREST, which doesn't expose system tables. Always fails.
- **Fix:** Remove entirely (already in PLAN.md 1.5).

### TD-6.3 No deprecated React, React Router, Supabase, Zustand, or Tailwind APIs detected [OK]

- The codebase uses modern APIs throughout. No `componentWillMount`, `Switch`, `Redirect`, `useHistory`, or deprecated Supabase v1 patterns found.

---

## 7. Performance Concerns

### TD-7.1 Unbounded data fetches — full table scans [CRITICAL]

- `listCompanies()` — `SupabaseAdapter.ts` line 842: fetches ALL companies, no LIMIT. Called from GlobalSearch (every keystroke), CustomerListPage, usePipelineMetrics, useReportingData.
- `listAllActivities()` — line 1214: fetches ALL activities.
- `listUsers()` — line 564: fetches ALL users.
- `QuotesListPage.tsx` line 69: `pageSize: 500` — fetches 500 full quote objects, then filters client-side.
- `QuoteStatsWidget.tsx` line 49: `pageSize: 200` — fetches 200 quotes just to count statuses.

### TD-7.2 Whole-store subscriptions cause re-render storms [CRITICAL]

- `useWorkflowProgress.ts` line 16: `useQuoteStore()` — subscribes to entire store. Every keystroke re-renders `WorkflowStepper` + `DashboardLayout`.
- `useQuoteLock.ts` line 37: destructured without selector.
- `TopBar.tsx`, `QuoteGeneratorPanel.tsx`, `ApprovalWorkflowPanel.tsx`: `useQuoteStore((state) => state)`.

### TD-7.3 Expensive computed getters called in render path without memoization [CRITICAL]

- `getQuoteTotals()` — iterates all slots, calls `getSlotPricing()` per slot, runs IRR/NPV/commission. Called directly in render by `FinancialAnalysisPanel`, `PricingMarginsPanel` — no `useMemo`.
- `getSlotPricing()` — 13 arithmetic steps per slot, called in `FleetBuilderPanel` render loop.
- Zero `React.memo` usage across entire codebase (0 out of 134 components).

### TD-7.4 N+1 query patterns [IMPORTANT]

- `PendingApprovalsWidget.tsx` lines 80-111: fetches pending quotes, then `getUser(submittedBy)` per quote in `Promise.all`.
- `PendingApprovalsWidget.tsx` lines 229-239: `loadTargetUsers` calls `getUsersByRole(role)` sequentially per role.

### TD-7.5 Duplicate data fetches from dashboard widgets [IMPORTANT]

- Home dashboard renders 8+ widgets simultaneously. `QuoteStatsWidget` (200 quotes), `MyQuotesWidget`, `PendingApprovalsWidget` each fetch quotes independently. `PipelineWidget` fetches companies. No shared cache or deduplication.

### TD-7.6 Missing debounce on search inputs [IMPORTANT]

- `CustomerListPage.tsx` line 146: `onChange` fires Supabase query on every keystroke. No debounce.
- `LeadExplorerPage.tsx` line 142: same issue.
- Note: `GlobalSearch.tsx` and `QuotesListPage.tsx` do have `setTimeout` debouncing.

### TD-7.7 Price list hooks make 3-4 independent fetches for same data [IMPORTANT]

- A single `FleetSlot` calls `usePriceListSeries()`, `useSeriesData()`, `useModelOptions()`, `useTelematicsPackages()` — 4 Supabase calls, 3 hitting the same table. No caching layer.

### TD-7.8 `getResidualCurveImpact` downloads 100 quotes to scan client-side [MINOR]

- **File:** `src/hooks/usePricingConfig.ts` lines 68-94
- **Problem:** Fetches 100 full quote objects, parses each `slots` JSON, counts battery chemistry matches. Should be a server-side query or RPC.

### TD-7.9 No list virtualization for large datasets [MINOR]

- Quotes list (500 rows), customer list, leads list all render full DOM. `@tanstack/react-virtual` is installed but unused for these lists.

---

## 8. Missing or Incomplete Tests

### TD-8.1 Overall test coverage: <5% [CRITICAL]

| Category | Source Files | Tested | Coverage |
|----------|-------------|--------|----------|
| Engine (pure logic) | 7 files (~1,700 LOC) | 3 files | ~43% |
| Auth | 1 file | 1 file | 100% |
| DB layer | ~5 files (~2,500 LOC) | 1 file (serialization only) | ~20% |
| Hooks | ~25 files | 1 file (matchSeriesCode only) | ~4% |
| Stores | 5 files (~1,700 LOC) | 0 files | **0%** |
| Components | 134 files | 0 files | **0%** |
| Utils | ~6 files | 0 files | **0%** |

6 test files exist with ~75 test cases. `@testing-library/react` and `@testing-library/jest-dom` are installed but never used.

### TD-8.2 Zero tests for highest-risk modules [CRITICAL]

| Module | Lines | Risk | Testability |
|--------|-------|------|-------------|
| `approvalEngine.ts` | 195 | Approval state machine | Pure logic — trivial to test |
| `validators.ts` | 369 | Business rule validation | Pure logic — trivial to test |
| `commissionEngine.ts` | 116 | Money calculations | Pure logic — trivial to test |
| `containerOptimizer.ts` | 241 | Bin-packing algorithm | Pure logic — trivial to test |
| `useQuoteStore.ts` | 953 | Core state + pricing derivation | Requires Immer mock setup |
| `useAuthStore.ts` | 286 | Login lockout + session | Requires Supabase mock |
| `SupabaseAdapter.ts` | 2,028 | Entire data layer | Requires Supabase mock |
| `useAutoSave.ts` | 225 | Debounced save + conflict | Requires timer mocking |
| `useApprovalActions.ts` | 235 | Approval workflow orchestrator | Requires store + DB mocks |

### TD-8.3 Zero component tests [IMPORTANT]

- 134 component files, 0 `.test.tsx` files. No render tests, no interaction tests, no accessibility tests.

### TD-8.4 No E2E test infrastructure [IMPORTANT]

- No Cypress, Playwright, or WebdriverIO. No `e2e/` directory.

### TD-8.5 No test utilities, mocks, or fixtures [IMPORTANT]

- No `setupTests.ts`, no test helpers, no mock factories, no custom render wrappers. Each test file is self-contained.

---

## 9. Hardcoded Values That Should Be Environment Variables or Config

### TD-9.1 Brand contact info hardcoded in PDF templates [CRITICAL]

- **Files:**
  - `src/pdf/components/BisedgePartnerPage.tsx` lines 29-127 — company name, phone, email, website, address
  - `src/pdf/templates/coverLetter.ts` lines 20-33 — duplicate of same contact info
  - `src/pdf/templates/defaultTerms.ts` lines 6-101 — "Bisedge" hardcoded ~15 times in legal text
- **Impact:** Any contact detail change requires a code deployment.
- **Fix:** DB company profile table or admin-editable config.

### TD-9.2 Business rule thresholds hardcoded in engine/validators [CRITICAL]

| Value | File | Line |
|-------|------|------|
| CPI rate 5.5% default | `calculationEngine.ts` | 252 |
| Margin thresholds 35/25/15% | `calculationEngine.ts` | 292-295 |
| Same thresholds (25/15%) | `ReviewSummaryStep.tsx` line 141, `LivePricingPreview.tsx` line 19, `FleetBuilderPanel.tsx` line 486 |
| Discount warning 50% | `validators.ts` | 112, 237 (duplicated) |
| Markup warning 5% | `validators.ts` | 151, 276 (duplicated) |
| ROE spread warning 2% | `validators.ts` | 312 |

- **Impact:** Business policy changes require code deployment + finding all duplicated locations.
- **Fix:** Admin pricing config or DB settings table.

### TD-9.3 Linde product URL hardcoded in PDF QR generator [CRITICAL]

- **File:** `src/pdf/assets/qrCodeGenerator.ts` line 50
- **Value:** `https://www.linde-mh.com/en/products/electric-forklift-trucks/${cleanCode}`
- **Impact:** URL structure change at Linde breaks all PDF QR codes.
- **Fix:** Environment variable `VITE_LINDE_PRODUCT_BASE_URL`.

### TD-9.4 Quote validity "30 days" repeated in 9+ locations [IMPORTANT]

- **Files:** `useQuoteStore.ts`, `SupabaseAdapter.ts` (x2), `serialization.ts`, `generatePDF.tsx`, `defaultTerms.ts`, `QuotationTablePage.tsx`, `TemplateManagement.tsx`, `QuoteGeneratorPanel.tsx`
- **Fix:** Single `DEFAULT_VALIDITY_DAYS` constant.

### TD-9.5 Clearing charge and local cost defaults in JSON file [IMPORTANT]

- **File:** `src/data/clearingChargeDefaults.json` — freight rates, port charges, duties percentages
- **Impact:** These change with market conditions. Currently requires code deployment to update.
- **Fix:** Admin-editable config in DB.

### TD-9.6 Pagination limits scattered across 14+ locations [IMPORTANT]

- **Values:** `.limit(5)`, `.limit(20)` (x3), `.limit(50)`, `.limit(100)` (x3), `.limit(200)`, `.limit(500)`, `PAGE_SIZE = 20`, `pageSize: 10`
- **Fix:** Shared `QUERY_LIMITS` constants object.

### TD-9.7 Security parameters hardcoded in auth store [IMPORTANT]

- **File:** `src/store/useAuthStore.ts` lines 34-36
- **Values:** `MAX_FAILED_ATTEMPTS = 5`, `LOCKOUT_DURATION_MS = 600000`, `MAX_DELAY_MS = 4000`
- **Fix:** Environment variables or security config.

### TD-9.8 Lock staleness timeout hardcoded [IMPORTANT]

- **File:** `src/store/useQuoteStore.ts` line 33
- **Value:** `LOCK_STALE_MS = 3600000` (1 hour)
- **Fix:** Environment variable or admin config.

### TD-9.9 Legal/financial terms hardcoded in PDF templates [IMPORTANT]

- **File:** `src/pdf/templates/defaultTerms.ts`
- **Values:** "prime plus 2%" (line 37), "3 months rental" penalty (line 67), "7 days" insurance deadline (line 59)
- **Fix:** Admin-editable template (the template system exists but defaults are in code).

### TD-9.10 South Africa hardcoded as default country [MINOR]

- **File:** `src/db/SupabaseAdapter.ts` line 1943
- **Value:** `country: row.country || 'South Africa'`

### TD-9.11 Poll intervals and UI timeouts hardcoded [MINOR]

- `useApprovalCount.ts`: `POLL_INTERVAL_MS = 30000`
- `useNotifications.ts`: `REFRESH_INTERVAL_MS = 60000`, `MAX_RECENT = 20`
- `useAutoSave.ts`: debounce default `2000`, saved display `3000`
- `supabase.ts`: `eventsPerSecond: 10`

---

## 10. Dead Code and Unused Imports

### TD-10.1 Dead files — never imported anywhere [IMPORTANT]

| File | Lines | What it contains |
|------|-------|------------------|
| `src/store/useAuthStore.v2.ts` | 7 | Deprecated re-export |
| `src/engine/leadScraperTypes.ts` | 43 | Types-only, no implementation |
| `src/engine/containerOptimizer.ts` | 241 | Bin-packing algorithm, never used |
| `src/components/SupabaseTestPage.tsx` | ~50 | Test page, not in routes |
| `src/utils/testSupabaseConnection.ts` | ~30 | Only used by dead test page |
| `src/utils/notificationHelpers.ts` | ~80 | 5 exported functions, zero imports |
| `src/hooks/useQuotes.ts` | 197 | Entire hook never imported |
| `src/hooks/useApprovalNotifications.tsx` | ~100 | Dead (approval_actions never written) |
| `src/hooks/useReducedMotion.ts` | ~20 | Never imported |
| `src/components/shared/QuoteOwnershipBadge.tsx` | ~70 | Never imported |
| `src/components/shared/PresenceIndicator.tsx` | ~50 | Never imported |
| `src/components/ui/Checkbox.tsx` | ~30 | Never imported (native checkbox used instead) |
| `src/assets/react.svg` | — | Default Vite asset, never referenced |
| `src/components/admin/catalog/` | 0 | Empty directory |

**Total: 14 dead files/directories, ~920 dead lines.**

### TD-10.2 Dead exported functions — defined but never called [IMPORTANT]

| Function | File | Line |
|----------|------|------|
| `usePresenceIndicator` | `src/hooks/usePresence.ts` | 172 |
| `useManualQuoteLock` | `src/hooks/useQuoteLock.ts` | 192 |
| `calculateAttachmentCost` | `src/store/useQuoteStore.ts` | 150 |

### TD-10.3 Dead store actions — defined but never called from any component [IMPORTANT]

| Action | File |
|--------|------|
| `setManualContainerCost` | `useQuoteStore.ts` line 534 (no-op stub) |
| `setBatteryChemistryLock` | `useQuoteStore.ts` line 362 |
| `setOverrideIRR` | `useQuoteStore.ts` line 614 |
| `clearConfiguration` | `useQuoteStore.ts` line 584 |
| `resetAll` | `useQuoteStore.ts` line 915 (duplicate of `resetQuote`) |

### TD-10.4 Dead CSS classes in index.css [MINOR]

| Class | Line |
|-------|------|
| `.glass-interactive` | 290 |
| `.text-gradient-brand` | 69 |
| `.text-gradient-feature` | 73 |
| `.btn-feature` | 131 |
| `.text-balance` | 259 |
| `.divide-surface` | 255 |

### TD-10.5 Duplicate `fuzzyMatch` — local copy vs utility [MINOR]

- **File:** `src/components/GlobalSearch.tsx` line 15 defines local `fuzzyMatch` instead of importing from `src/utils/fuzzyMatch.ts`.

---

## Summary

| Section | CRITICAL | IMPORTANT | MINOR | Total |
|---------|----------|-----------|-------|-------|
| 1. Duplicated Code | 2 | 9 | 4 | 15 |
| 2. Missing Error Handling | 0 | 4 | 0 | 4 |
| 3. Inconsistent Patterns | 2 | 2 | 2 | 6 |
| 4. Security Vulnerabilities | 2 | 6 | 1 | 9 |
| 5. Missing Input Validation | 0 | 6 | 3 | 9 |
| 6. Deprecated API Usage | 0 | 2 | 0 | 2 |
| 7. Performance Concerns | 3 | 4 | 2 | 9 |
| 8. Missing Tests | 2 | 3 | 0 | 5 |
| 9. Hardcoded Values | 3 | 6 | 2 | 11 |
| 10. Dead Code | 0 | 3 | 2 | 5 |
| **TOTAL** | **14** | **45** | **16** | **75** |

---

## Cross-References to PLAN.md

| TECH-DEBT Item | PLAN.md Item |
|----------------|--------------|
| TD-1.2 CommissionTier type drift | Phase 1.1 |
| TD-3.1 Data access inconsistency | Phase 3.1 |
| TD-3.2 Whole-store subscriptions | (not in plan — new finding) |
| TD-4.1 No RLS | Phase 3.5 |
| TD-4.2 Client-side user creation | Phase 3.5 |
| TD-4.5 setCustomerInfo pollution | Phase 2.2 |
| TD-5.1 Missing form validation | Phase 2.4 |
| TD-5.3 ROE accepts zero | Phase 2.3 |
| TD-6.1 Hand-written types | Phase 1.1-1.4 (root cause) |
| TD-6.2 pg_proc introspection | Phase 1.5 |
| TD-7.1 Unbounded fetches | Phase 3.3 |
| TD-8.1 Test coverage <5% | Phase 2.6 |
| TD-9.1 Brand info hardcoded | Phase 3.6 |
| TD-10.1 Dead files | Phase 3.7 |

---

End of tech debt report.
