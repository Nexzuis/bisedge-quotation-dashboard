# PLAN.md - BIS Edge Quotation Dashboard

Generated: 2026-02-21
Baseline: `Project documentation/SPEC.md` + current codebase state.

---

## Phase Order
1. Stabilise (Fix partially built or broken features)
2. Stabilise (Known bugs and reliability issues)
3. Improve (Quality, UX, maintainability, hardening)
4. New Features (Your requested additions)

---

## Phase 1 - STABILISE (Fix): Partially Built or Broken Features

### 1.1 Fix `commission_tiers` schema drift (admin pricing is inconsistent)
- Evidence:
  - `src/lib/database.types.ts` uses `commission_pct`
  - `src/db/SupabaseAdapter.ts` writes/reads `commission_rate`
- Action:
  1. Align DB writes/reads + interfaces to one column shape (`commission_pct` if schema is correct).
  2. Remove `as unknown as` casts around commission tier inserts.
  3. Verify admin Commission editor save/load roundtrip.
- Exit criteria:
  - Saving commission tiers no longer drops values or returns zeros unexpectedly.

### 1.2 Fix `residual_curves` schema drift (admin residual editor mismatch)
- Evidence:
  - `src/lib/database.types.ts` expects `chemistry` + `term_36..term_84`
  - `src/db/SupabaseAdapter.ts` uses `term/residual_pct/model_family`
  - `src/db/interfaces.ts` expects `chemistry` + `term36..term84`
- Action:
  1. Pick one canonical DB shape (from live Supabase schema).
  2. Update adapter mappings + interfaces accordingly.
  3. Verify residual curves render and persist correctly.
- Exit criteria:
  - Residual curves load and save correctly from admin UI.

### 1.3 Resolve `users.username` mismatch between app code and typed schema
- Evidence:
  - `src/components/admin/users/UserManagement.tsx` reads/writes `username`
  - `src/lib/database.types.ts` `users` table has no `username`
- Action:
  1. Verify live DB: does `users.username` actually exist?
  2. If yes, add it to typed schema.
  3. If no, remove username persistence from admin flow and treat email/full_name as identifiers.
- Exit criteria:
  - User create/edit/uniqueness checks run without column errors.

### 1.4 Fix audit log write/read mismatch (silent data loss)
- Evidence:
  - `src/db/SupabaseAdapter.ts` `logAudit()` drops `oldValues/newValues`
  - `mapAuditLogEntry()` reads fields not in typed schema (`user_name`, `notes`, `target_user_*`)
- Action:
  1. Persist `old_values` and `new_values` when provided.
  2. Align audit read mapping with actual DB columns.
  3. Update `AuditLogEntry` usage sites to match persisted shape.
- Exit criteria:
  - Audit entries preserve before/after payloads and map consistently.

### 1.5 Fix RPC reliability and remove startup side effects
- Evidence:
  - `src/db/SupabaseAdapter.ts` constructor calls `verifyRequiredRpcs()`
  - `verifyRequiredRpcs()` queries `pg_proc` and probes `generate_next_quote_ref`
  - `saveQuote()` fails hard on RPC error (no write fallback path)
- Action:
  1. Remove `pg_proc` REST introspection and quote-ref sequence probing from startup.
  2. Keep runtime RPC call error handling explicit.
  3. Add a controlled fallback path for quote save when RPC is unavailable (or fail with a clear, actionable error state and recovery path).
- Exit criteria:
  - App startup does not touch quote sequence or emit noisy RPC health errors.
  - Quote save behavior is deterministic during RPC outages.

### 1.6 Replace fragile HEAD count queries across app
- Evidence (`head: true` still present):
  - `src/db/SupabaseAdapter.ts` (`getTableCounts`, `countQuotesSince`)
  - `src/hooks/useApprovalCount.ts`
  - `src/components/dashboard/widgets/PendingApprovalsWidget.tsx`
- Action:
  1. Replace with GET count pattern (`select('id', { count: 'exact' }).limit(0)` or equivalent).
  2. Keep single fallback strategy shared by all count callers.
- Exit criteria:
  - Count widgets/metrics remain stable even when HEAD is blocked.

### 1.7 Wire approval event persistence to match realtime listeners
- Evidence:
  - `src/hooks/useApprovalNotifications.tsx` listens to `approval_actions` INSERT
  - `src/hooks/useApprovalActions.ts` and quick actions in `PendingApprovalsWidget.tsx` update quote JSON/audit, but do not insert `approval_actions`
- Action:
  1. Decide source of truth:
     - Option A: persist `approval_actions` on each action, or
     - Option B: switch listeners to `quotes` updates on `approval_chain`.
  2. Implement one path and remove dead path.
- Exit criteria:
  - Approval notifications fire reliably for submit/approve/reject/escalate/return.

---

## Phase 2 - STABILISE: Known Bugs and Reliability Issues

### 2.1 Invalid quote ID route renders editable empty quote shell
- Evidence:
  - `src/Dashboard.tsx` shows error banner but still renders `DashboardLayout` after load failure.
- Action:
  1. Add explicit not-found state for bad `?id=`.
  2. Redirect to `/quotes` or render dedicated not-found view.
  3. Prevent save actions when quote load failed.
- Exit criteria:
  - Bad quote IDs cannot produce a ghost editable quote.

### 2.2 Protect `setCustomerInfo` from state pollution
- Evidence:
  - `src/store/useQuoteStore.ts` uses `Object.assign(state, info)`.
- Action:
  1. Replace with explicit field whitelist for customer/contact fields.
- Exit criteria:
  - Passing unexpected keys cannot mutate unrelated quote store state.

### 2.3 Add defensive numeric coercion in pricing calculations
- Evidence:
  - `src/store/useQuoteStore.ts` `getSlotPricing()` relies on many numeric fields directly.
- Action:
  1. Coerce all numeric inputs at calculation boundaries.
  2. Add guards for malformed legacy/partial quote payloads.
- Exit criteria:
  - Pricing pipeline does not propagate `NaN` from malformed input.

### 2.4 Tighten form validation where persistence currently allows weak data
- Evidence:
  - `ClientInfoStep` currently gates mainly on name presence.
  - Cost inputs have min/max but no explicit blur-level sanity/error messaging.
- Action:
  1. Add required/format validation for key client/contact fields.
  2. Add explicit validation feedback on cost fields before save/submit.
- Exit criteria:
  - Invalid contact and extreme numeric entries are blocked or clearly flagged.

### 2.5 Fix misleading password reset UX in admin
- Evidence:
  - `UserManagement.tsx` collects a new password but actually calls `resetPasswordForEmail`.
- Action:
  1. Either remove password input and make email-reset intent explicit, or
  2. Implement true admin-set-password via secure server path.
- Exit criteria:
  - UI action matches backend behavior.

### 2.6 Add targeted regression tests for high-risk flows
- Action:
  1. Add tests for quote save conflict/RPC-failure behavior.
  2. Add tests for invalid quote ID route behavior.
  3. Add tests for approval action notification pipeline.
- Exit criteria:
  - Critical flows are covered and protected from re-regression.

---

## Phase 3 - IMPROVE: Quality, UX, Maintainability, and Hardening

### 3.1 Consolidate data access patterns
- Problem:
  - Mix of adapter calls and direct `supabase` calls across hooks/components.
- Action:
  1. Move direct data mutations/queries behind adapter/repository boundaries.
- Outcome:
  - Centralized query logic and easier schema refactors/testing.

### 3.2 Reduce production `console.*` noise and standardize error logging
- Evidence:
  - ~236 `console.*` usages in `src`.
- Action:
  1. Migrate critical paths to shared logger utility with structured context.
- Outcome:
  - Cleaner diagnostics and less noisy production logs.

### 3.3 Optimize dashboard data loading
- Problem:
  - Home widgets make overlapping quote fetches with different limits.
- Action:
  1. Introduce shared `useHomeData()` aggregation hook/cache.
- Outcome:
  - Fewer duplicate calls and faster initial dashboard load.

### 3.4 Improve builder shell/navigation parity
- Problem:
  - `BuilderLayout` has no top nav context while rest of app uses `CrmTopBar` patterns.
- Action:
  1. Add lightweight builder top bar (back/home, quote ref, user context).
- Outcome:
  - Better orientation and navigation consistency.

### 3.5 Strengthen security architecture before production scale
- Action:
  1. Verify and enforce RLS policies in live Supabase for core tables.
  2. Move admin user-create/admin-password operations to server-side (Edge Function/service-role).
  3. Add explicit auth state handling for session lifecycle instrumentation.
- Outcome:
  - Reduced privilege risk and clearer auth behavior.

### 3.6 Improve PDF output completeness
- Evidence:
  - `src/pdf/assets/productImages/index.ts` uses placeholders.
  - `src/pdf/QuoteDocument.tsx` hardcodes T&C page assumptions.
- Action:
  1. Replace placeholder assets with real product image source.
  2. Make T&C page count computation data-driven.
- Outcome:
  - More accurate, production-grade quote documents.

### 3.7 Remove dead code and duplicate pathways
- Candidates:
  - `src/store/useAuthStore.v2.ts` re-export file
  - `src/engine/leadScraperTypes.ts` (currently unused)
  - `src/components/admin/catalog/` (empty directory)
  - `setManualContainerCost` no-op in `useQuoteStore`
  - duplicate reset actions (`resetQuote`, `resetAll`)
- Outcome:
  - Lower maintenance surface and clearer ownership.

---

## Phase 4 - NEW FEATURES (Waiting For Your List)

No user-specified feature list has been provided yet.

Please provide your feature list in this format and this section will be replaced with a scoped build plan:

1. Feature name
   - Why you want it
   - Priority (High/Medium/Low)
   - Any deadline

Template example:
1. Feature: <name>
   - Goal: <business/user outcome>
   - Priority: <High/Medium/Low>
   - Constraints: <security/performance/deadline>

---

## Validated As Already Addressed (Removed from active plan)
- `MyQuotes` ownership filter already checks `createdBy OR assignedTo`.
- Leads list already uses server-side pagination via `.range(...)`.
- Loading states/skeleton behavior already exists on key pages.
- Global app-level `ErrorBoundary` already exists.
- `src/utils/syncQueue.ts` is not present in this repository.

---

End of plan.
