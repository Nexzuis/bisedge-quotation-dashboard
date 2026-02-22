# CURRENT-PLAN.md — Phase 4: Production Readiness

**Date:** 22 February 2026
**Scope:** Fix all verified blockers and critical items from the Production Readiness Report
**Target:** 200 concurrent users, live quoting, saving, approvals, lead generation
**Verification:** All items independently verified by 3 VOLTA agents against actual codebase

---

## Verification Summary

Before planning, all 35 items from the Production Readiness Report were verified against the actual source code by three independent VOLTA agents (backend, frontend, fullstack). Key corrections to the original report:

| Item | Original Rating | Verified As | Change |
|------|----------------|-------------|--------|
| B1. Tests broken | BLOCKER | **FALSE POSITIVE** — config is correct; `src/_minimal.test.ts` syntax error causes noise | Downgraded — covered by B8 cleanup |
| B4. RPCs not version-controlled | BLOCKER | **FALSE POSITIVE** — both exist in `supabase-migrations-round4.sql` | Downgraded to process improvement |
| C1. Lock race condition | CRITICAL | **PARTIALLY** — server-side atomic guard protects data; client-side stale check is UX-only | Downgraded to IMPORTANT |
| C3. Residual value async per-line | CRITICAL | **FALSE POSITIVE** — function has zero call sites; sync path is used | Removed from scope |
| C7. IRR returns null | CRITICAL | **LOW** — by design, well-documented, tested | Downgraded to MINOR |
| I1. Admin loading states | IMPORTANT | **FALSE POSITIVE** — loading states exist; one minor gap | Removed from scope |
| I6. Form validation (negatives) | IMPORTANT | **PARTIALLY** — cost fields ARE clamped; client info format validation is weak | Scoped to client info only |
| I14. Admin config audit trail | IMPORTANT | **FALSE POSITIVE** — `logAudit` IS called; gap is `oldValues: null` | Scoped to oldValues capture |

---

## Sprint Structure

### Sprint 1: Foundation (Blockers)
### Sprint 2: Data Integrity & Reliability
### Sprint 3: Security & Session Hardening
### Sprint 4: Scale, UX & Operational Readiness

---

## Sprint 1: Foundation

### 1.1 Delete Diagnostic Files and Fix Test Suite

**Why:** `src/_minimal.test.ts` has broken syntax (`() =` instead of `() =>`) and is picked up by the vitest include glob, causing test runner noise. Three other diagnostic files pollute the project.

**Files to delete:**
- `_diag.test.ts` (project root)
- `_vitest_diag.config.ts` (project root)
- `src/_min2.test.ts`
- `src/_minimal.test.ts`

**Verification:**
1. Delete the 4 files
2. Run `npm run test` — all 178 tests should pass
3. Add `_diag*` and `_minimal*` patterns to `.gitignore`

**Risk:** Low. These are orphaned debugging artifacts.

---

### 1.2 Move ALL Schema Artifacts into Canonical Migration Directory

**Why:** `save_quote_if_version`, `generate_next_quote_ref`, and supporting schema changes (status constraint, `updated_by` column, `quote_ref_seq` sequence) all exist in `supabase-migrations-round4.sql` at the project root but not in `supabase/migrations/`. This breaks the migration convention and risks losing non-RPC schema changes if the root file is deleted.

**Codex review correction:** The original plan only copied lines 31-231 (RPC definitions), which would drop the status constraint update (line 7-9), `updated_by` column migration (line 12), and quote-ref sequence bootstrap (lines 15-29). All artifacts must be preserved.

**Actions:**
1. Create `supabase/migrations/002_schema_and_rpcs.sql`
2. Copy the **entire contents** of `supabase-migrations-round4.sql` into the new migration file — this includes:
   - Status constraint update (`quotes_status_check` — lines 7-9)
   - `updated_by` column addition (line 12)
   - `quote_ref_seq` sequence bootstrap (lines 15-29)
   - `generate_next_quote_ref` RPC (lines 31-43)
   - `save_quote_if_version` RPC (lines 47-231)
   - All `REVOKE`/`GRANT` statements
3. Add a header comment: `-- Migrated from supabase-migrations-round4.sql on 2026-02-22`
4. Keep `supabase-migrations-round4.sql` in place with a deprecation comment pointing to the canonical location, until human confirms the migration has been applied
5. Update CLAUDE.md to reflect that all schema artifacts are now version-controlled

**Files to create:**
- `supabase/migrations/002_schema_and_rpcs.sql`

**Files to modify:**
- `supabase-migrations-round4.sql` — add deprecation header
- `CLAUDE.md` — update "Not Yet Implemented" section

**Risk:** Low. No code changes — purely organizational. No schema artifacts lost.

---

### 1.3 Fix Non-Atomic Delete+Insert (Data Loss Risk)

**Why:** `saveCommissionTiers()` and `saveResidualCurves()` in `SupabaseAdapter.ts` perform DELETE ALL then INSERT as two separate HTTP requests. If the INSERT fails, all data is permanently lost.

**Evidence:** `SupabaseAdapter.ts` lines 1325-1372

**Fix approach — Supabase RPC functions (implicitly transactional):**

**Codex review correction:** PostgreSQL functions called via Supabase RPC are already executed within a single transaction. Explicit `BEGIN`/`COMMIT` inside a function body is invalid. The function body's statements are inherently atomic — if any statement fails, the entire function call rolls back automatically.

1. Create `supabase/migrations/003_atomic_saves.sql` with two new `plpgsql` functions:
   - `save_commission_tiers_atomic(p_tiers jsonb)` — DELETE existing rows, then INSERT from `jsonb_array_elements`. No explicit `BEGIN`/`COMMIT` — the function call itself is the transaction boundary.
   - `save_residual_curves_atomic(p_curves jsonb)` — same pattern.
   - Both functions should use `SECURITY DEFINER` with `SET search_path = public, pg_temp` (matching existing RPC conventions).

2. Update `SupabaseAdapter.ts`:
   - `saveCommissionTiers()` → call `supabase.rpc('save_commission_tiers_atomic', { p_tiers: tiers })`
   - `saveResidualCurves()` → call `supabase.rpc('save_residual_curves_atomic', { p_curves: curves })`

3. Update `src/db/interfaces.ts` if method signatures change

**Files to create:**
- `supabase/migrations/003_atomic_saves.sql`

**Files to modify:**
- `src/db/SupabaseAdapter.ts` — `saveCommissionTiers()`, `saveResidualCurves()`

**Testing:**
- Verify save/load roundtrip in admin pricing UI
- Verify rollback: pass a malformed tier entry (e.g., null required field) and confirm that the original data is preserved (not deleted)
- Verify empty array input: passing `[]` should delete all rows without error

**Risk:** Medium. Requires deploying the RPC to Supabase before the client code change. Coordinate deployment order.

---

### 1.4 Implement Server-Side Rate Limiting for Login

**Why:** Login brute-force protection is purely in-memory JavaScript. Refreshing the page or using direct API calls bypasses all lockout.

**Evidence:** `useAuthStore.ts` lines 38-41 — `LOGIN_ATTEMPTS` is a `Map` in module scope.

**Fix approach — Supabase Auth built-in rate limiting (single implementation path):**

**Codex review correction:** The original plan presented two options without choosing. This revision locks on a single concrete path.

**Chosen implementation: Configure Supabase Auth's built-in rate limiting at the dashboard/infrastructure level.**

1. Configure the following in Supabase Dashboard → Authentication → Rate Limits:
   - `GOTRUE_RATE_LIMIT_TOKEN_REFRESH`: 30 requests/minute
   - `GOTRUE_RATE_LIMIT_EMAIL_SENT`: 5 emails/hour
   - Sign-in rate limit: 5 attempts per IP per 10 minutes (Supabase built-in)

2. Document the exact configuration values in `docs/supabase-config.md`

3. Keep client-side rate limiting (`LOGIN_ATTEMPTS` Map in `useAuthStore.ts`) as a UX layer for instant feedback. No client code changes needed.

4. No Edge Function required — Supabase GoTrue handles enforcement at the server level, which cannot be bypassed by page refresh or direct API calls.

**Files to create:**
- `docs/supabase-config.md` — document all Supabase dashboard configuration

**Files to modify:**
- None (client code stays as-is)

**Verification criteria (brute-force protection):**
- [ ] After 5 failed logins from the same IP, the 6th attempt is rejected server-side (HTTP 429) regardless of browser state
- [ ] Refreshing the page does NOT reset server-side lockout
- [ ] Direct API calls to `/auth/v1/token` without the client are also rate-limited
- [ ] After the lockout window (10 minutes), login attempts succeed again

**Risk:** Low. Configuration-only change. Battle-tested Supabase infrastructure.

---

### 1.5 Deploy Edge Function and Prepare SMTP Configuration

**Why:** Admin user creation (`admin-create-user`) is broken until deployed. Email workflows require SMTP.

**Actions:**
1. Document the exact deployment command: `supabase functions deploy admin-create-user --project-ref padeaqdcutqzgxujtpey`
2. Create `docs/deployment-checklist.md` with:
   - Edge Function deployment steps
   - SMTP provider configuration steps (Resend/SendGrid/Postmark)
   - Required environment variables
   - Supabase Auth rate limit configuration
3. Verify `UserManagement.tsx` error handling when function is not deployed (already confirmed graceful)

**Files to create:**
- `docs/deployment-checklist.md`

**Risk:** Low. This is documentation + infrastructure work, not code changes.

---

## Sprint 2: Data Integrity & Reliability

### 2.1 Harden Auto-Save Failure Handling

**Why:** Generic network failures in auto-save only show faint muted text in TopBar. The builder UI shows NO save status at all. Users can lose work without realizing it.

**Evidence:** `useAutoSave.ts` — generic failures set `status: 'error'` but fire no toast. `BuilderLayout.tsx` renders no save status indicator.

**Actions:**
1. In `useAutoSave.ts`:
   - Fire `toast.error()` on ALL save failures, not just lock/version conflicts
   - After 3 consecutive failures, show a persistent warning banner (not just a toast)
   - Track `consecutiveFailures` counter

2. In `BuilderLayout.tsx` or `BuilderBottomBar.tsx`:
   - Add a save status indicator (synced to auto-save state)
   - Show "Unsaved changes" warning when `status === 'error'`

3. In `NavigationGuard`:
   - After a failed "Save & Leave", keep the modal open with clear error text instead of closing

**Files to modify:**
- `src/hooks/useAutoSave.ts`
- `src/components/builder/BuilderLayout.tsx` or `BuilderBottomBar.tsx`
- `src/components/builder/QuoteBuilder.tsx` (NavigationGuard section)

**Testing:**
- Simulate network failure during auto-save (disconnect network)
- Verify toast appears and builder shows persistent warning
- Verify NavigationGuard blocks exit after failed save

**Risk:** Low. UI-only changes with no data flow impact.

---

### 2.2 Add Database Connection Error Recovery

**Why:** Zero retry/backoff/offline detection anywhere. A brief Supabase outage causes silent failures for all 200 users.

**Actions:**
1. Create `src/utils/resilientFetch.ts`:
   - Wrap Supabase client calls with retry + exponential backoff
   - Max 3 retries, 1s/2s/4s backoff
   - Only retry on network errors and 5xx, NOT on 4xx (auth/validation)

2. Create `src/hooks/useConnectionStatus.ts`:
   - Monitor `navigator.onLine` + periodic Supabase health check
   - Expose `isOnline`, `isSupabaseReachable` state
   - Show a persistent banner when offline or Supabase is unreachable

3. Apply retry wrapper to critical paths:
   - `saveQuote()` in `SupabaseAdapter.ts`
   - Auto-save in `useAutoSave.ts`
   - Quote loading

4. Non-critical paths (notifications, approval counts) — fail silently as they already do

**Files to create:**
- `src/utils/resilientFetch.ts`
- `src/hooks/useConnectionStatus.ts`

**Files to modify:**
- `src/db/SupabaseAdapter.ts` — wrap critical methods
- `src/hooks/useAutoSave.ts` — use retry wrapper
- `src/components/layout/DashboardLayout.tsx` — render connection status banner

**Retry reconciliation for quote saves:**

**Codex review correction:** A network timeout after a successful server-side save can cause the retry to encounter a version conflict. The retry logic must handle this gracefully:

- Before retrying a failed quote save, first reload the quote from the DB and check its `version` and `updated_at`
- If the version has incremented since the original save attempt, the first save actually succeeded — treat this as success, not failure
- Only retry the actual save RPC if the version is unchanged (meaning the server truly did not receive/process the request)
- Surface this reconciliation to the user: "Save confirmed after retry" vs "Save failed — please reload"

**Risk:** Medium. Must be careful not to retry non-idempotent operations. The reconciliation check (reload before retry) ensures `save_quote_if_version` is only called when the previous attempt genuinely failed.

---

### 2.3 Optimize Notification Polling → Realtime Subscriptions

**Why:** At 200 users, polling generates ~1,000 DB queries/minute. Both `useNotifications.ts` (60s) and `useApprovalCount.ts` (30s) poll independently.

**Actions:**
1. Refactor `useApprovalCount.ts`:
   - Replace polling with Supabase Realtime subscription on `quotes` table (filtered to status changes)
   - Pattern already exists in `useRealtimeQuote.ts` — follow the same channel/subscription approach

2. Refactor `useNotifications.ts`:
   - Replace polling with Realtime subscription on `notifications` table
   - Keep initial fetch on mount, then subscribe for INSERT events

3. Both hooks should:
   - Register a single shared channel (avoid duplicate subscriptions)
   - Use `visibilitychange` to pause/resume subscriptions
   - Clean up on unmount

**Files to modify:**
- `src/hooks/useApprovalCount.ts`
- `src/hooks/useNotifications.ts`

**Risk:** Medium. Realtime subscriptions behave differently from polling — need to handle reconnection, missed events, and initial state sync.

---

### 2.4 Fix Realtime Connection Management

**Why:** Each open quote creates a new realtime channel. No channel limit, no cleanup on tab crash, presence rows orphan.

**Actions:**
1. In `useRealtimeQuote.ts`:
   - Add a channel registry (module-level Map) to prevent duplicate channels for the same quote
   - Limit max concurrent channels (e.g., 5) — unsubscribe oldest if exceeded

2. In `usePresence.ts`:
   - Add `beforeunload` listener to clean up presence rows on normal tab close
   - Server-side cleanup via scheduled RPC (concrete implementation below)

3. Create `supabase/migrations/004_presence_cleanup.sql`:
   - Define `cleanup_stale_presence()` function: `DELETE FROM quote_presence WHERE last_seen_at < NOW() - INTERVAL '5 minutes'`
   - Enable `pg_cron` extension (Supabase Pro plan) and schedule: `SELECT cron.schedule('cleanup-presence', '*/5 * * * *', 'SELECT cleanup_stale_presence()')`
   - If `pg_cron` is not available on the current plan, add a fallback: call `cleanup_stale_presence()` at the start of every `acquireLock()` call as a client-triggered sweep

**Codex review correction:** The original plan used ambiguous "or" language ("cron job or RPC"). This revision specifies `pg_cron` as primary mechanism with a concrete fallback if `pg_cron` is unavailable.

**Files to modify:**
- `src/hooks/useRealtimeQuote.ts`
- `src/hooks/usePresence.ts`
- `src/hooks/useQuoteLock.ts` (fallback cleanup call if no `pg_cron`)

**Files to create:**
- `supabase/migrations/004_presence_cleanup.sql`

**Risk:** Low-Medium. Channel registry is straightforward. `pg_cron` availability depends on Supabase plan — fallback ensures cleanup works regardless.

---

## Sprint 3: Security & Session Hardening

### 3.1 Add Session Lifecycle Enforcement

**Why:** No `onAuthStateChange` listener. Deactivated/role-changed users retain access until page refresh.

**Evidence:** Zero `onAuthStateChange` calls anywhere in codebase. `checkAuth()` only runs once at mount.

**Actions:**
1. In `src/components/auth/AuthContext.tsx`:
   - Add `supabase.auth.onAuthStateChange()` subscription
   - Handle `SIGNED_OUT` → clear store, redirect to login
   - Handle `TOKEN_REFRESHED` → re-check `is_active` and role from `public.users`
   - Handle `PASSWORD_RECOVERY` → redirect to password reset flow

2. Add periodic `is_active` re-validation:
   - Every 5 minutes, check `public.users.is_active` for the current user
   - If `is_active === false`, sign out and show "Account deactivated" message

3. Handle admin role changes:
   - On `TOKEN_REFRESHED`, compare stored role with DB role
   - If role changed, update local store and re-evaluate permissions

**Files to modify:**
- `src/components/auth/AuthContext.tsx`
- `src/store/useAuthStore.ts` (add `forceLogout()` action)

**Testing:**
- Deactivate a user via admin panel → verify they are signed out within 5 minutes
- Change a user's role → verify permissions update without page refresh

**Risk:** Medium. Must handle edge cases (race between token refresh and is_active check, logout during active save).

---

### 3.2 Replace Remaining `console.*` Calls with Structured Logger

**Why:** 164 raw `console.*` calls remain, with 97 concentrated in `SupabaseAdapter.ts`. These leak error details to production browser console.

**Actions:**
1. In `src/db/SupabaseAdapter.ts`:
   - Replace all 97 `console.error(...)` calls with `logger.error(...)`
   - Add structured context: `{ method: 'methodName', entity: 'tableName', error }`

2. In remaining 24 files with raw console calls:
   - Replace with appropriate `logger.debug/info/warn/error` calls
   - Remove `src/utils/testSupabaseConnection.ts` (21 calls) — diagnostic utility that shouldn't ship
   - Remove `src/components/SupabaseTestPage.tsx` — imports from `testSupabaseConnection.ts`; deleting the utility without removing this consumer would break `tsc` and the build
   - Remove any route registration for `SupabaseTestPage` in `App.tsx` (if present)

3. Update `src/utils/logger.ts`:
   - Add `logger.setLevel()` method reading from environment
   - Ensure production suppresses `debug` and `info` (already does, but verify)

**Files to modify:**
- `src/db/SupabaseAdapter.ts` (major — 97 replacements)
- `src/db/ConfigurationMatrixRepository.ts` (8 replacements)
- `src/db/serialization.ts` (3 replacements)
- ~21 other files (1-3 replacements each)

**Files to delete:**
- `src/utils/testSupabaseConnection.ts` (diagnostic utility — 21 console calls)
- `src/components/SupabaseTestPage.tsx` (imports `testSupabaseConnection`; must be removed together to avoid breaking `tsc`/build)

**Codex review correction:** The original plan deleted `testSupabaseConnection.ts` without removing its consumer `SupabaseTestPage.tsx`, which would break the TypeScript build.

**Risk:** Low. Mechanical find-and-replace. No logic changes. Must verify no route in `App.tsx` references `SupabaseTestPage` after deletion.

---

### 3.3 Capture `oldValues` in Admin Config Audit Logging

**Why:** `logAudit` IS called for pricing config changes, but `oldValues: null` means no before/after diff is recorded.

**Evidence:** `usePricingConfig.ts` lines 30-67 — all three save functions pass `oldValues: null`.

**Actions:**
1. In `src/hooks/usePricingConfig.ts`:
   - Before saving, fetch current values from DB
   - Pass current values as `oldValues` to `logAudit()`

2. Apply same pattern to any other admin config saves that pass `oldValues: null`

**Files to modify:**
- `src/hooks/usePricingConfig.ts`

**Risk:** Low. One additional DB read before each save — acceptable for admin operations.

---

## Sprint 4: Scale, UX & Operational Readiness

### 4.1 Route Adapter-Bypassing Files Through Adapter

**Why:** 8 files import `supabase` directly, bypassing centralized error handling, logging, and future caching.

**Verified files:**
1. `src/hooks/usePriceList.ts` — 7 separate query paths
2. `src/hooks/useApprovalCount.ts` — (addressed in 2.3 via Realtime)
3. `src/hooks/usePresence.ts` — presence CRUD
4. `src/hooks/useQuoteLock.ts` — lock acquire/release
5. `src/hooks/useCompanyMerge.ts` — multi-table merge
6. `src/components/admin/users/UserManagement.tsx` — user list/update
7. `src/components/admin/approvals/ApprovalDashboard.tsx` — approval queries
8. `src/components/dashboard/widgets/PendingApprovalsWidget.tsx` — pending count

**Actions:**
1. Add methods to `src/db/interfaces.ts` (`IDatabaseAdapter`) for each missing operation
2. Implement in `src/db/SupabaseAdapter.ts`
3. Create repository wrappers in `src/db/repositories.ts` where appropriate
4. Update each hook/component to use `getDb()` instead of `supabase` direct

**Order of migration:**
- Start with `usePriceList.ts` (largest — 7 query paths)
- Then `useQuoteLock.ts` and `usePresence.ts` (data integrity)
- Then admin components (lower risk)
- `useApprovalCount.ts` handled by Sprint 2.3

**Files to modify:**
- `src/db/interfaces.ts`
- `src/db/SupabaseAdapter.ts`
- `src/db/repositories.ts`
- All 7 remaining bypass files (excluding `useApprovalCount.ts`)

**Risk:** Medium. Large surface area but each migration is mechanical. Must verify each query is faithfully reproduced in the adapter.

---

### 4.2 Add Builder Top Navigation Bar

**Why:** Users in the 8-step builder have no visible way to exit or return to the dashboard.

**Evidence:** `BuilderLayout.tsx` renders only `BuilderProgressBar` and `BuilderBottomBar` — no header, no exit link, no logo.

**Actions:**
1. Create `src/components/builder/shared/BuilderTopBar.tsx`:
   - Left: Back arrow + "Exit Builder" link (triggers NavigationGuard if unsaved)
   - Center: Quote reference number (if editing existing)
   - Right: User avatar/name (from auth store) + save status indicator

2. Add to `BuilderLayout.tsx` above `BuilderProgressBar`

3. Wire exit action through existing `NavigationGuard` logic

**Files to create:**
- `src/components/builder/shared/BuilderTopBar.tsx`

**Files to modify:**
- `src/components/builder/BuilderLayout.tsx`

**Risk:** Low. New component with no data flow changes.

---

### 4.3 Strengthen Client Info Form Validation

**Why:** Cost fields are properly clamped (verified), but client info fields accept any string for email/phone with no format validation.

**Evidence:** `ClientInfoStep.tsx` only checks `clientName.trim().length > 0 && contactName.trim().length > 0`.

**Actions:**
1. Add email format validation (regex or browser `ValidityState` API)
2. Add phone format validation (digits + optional formatting chars)
3. Add minimum length on company name (>= 2 characters)
4. Show inline validation errors below fields (not just disable the Next button)
5. Use `src/engine/validators.ts` for validation logic (already exists for other validations)

**Files to modify:**
- `src/components/builder/steps/ClientInfoStep.tsx`
- `src/engine/validators.ts` (add `validateEmail`, `validatePhone`)

**Risk:** Low. UI-only validation improvements.

---

### 4.4 Add Price List Overflow Detection

**Why:** Hard limits (200-500 rows) on price list queries with no overflow warning. If catalog grows, products silently disappear.

**Actions:**
1. In `usePriceList.ts`, after each query:
   - Check if `data.length === limit`
   - If so, log a `logger.warn('Price list query may be truncated')` and optionally show a toast
2. Consider raising limits to 1000 or adding pagination for the largest tables

**Files to modify:**
- `src/hooks/usePriceList.ts`

**Risk:** Low. Defensive check only.

---

### 4.5 Remove Dead Code

**Why:** `quote_versions` and `quote_collaborators` are typed but never queried. `calcResidualValueFromDB` has zero call sites.

**Actions:**
1. Remove `calcResidualValueFromDB` from `src/engine/calculationEngine.ts` (verified dead code)
2. Do NOT manually edit `src/lib/database.types.ts` — this file is auto-generated and any manual comments would create perpetual CI drift when the `gen:types` script (4.6) regenerates it. Instead, document unused tables in `CLAUDE.md` under a "Dead Code / Unused Tables" section.
3. `testSupabaseConnection.ts` and `SupabaseTestPage.tsx` deletion covered in 3.2

**Codex review correction:** The original plan added manual comments to `database.types.ts` while also adding CI drift enforcement via `gen:types` + `git diff`. These two actions are mutually exclusive — manual edits to a generated file would fail the drift check on every CI run.

**Files to modify:**
- `src/engine/calculationEngine.ts`
- `CLAUDE.md` — add "Dead Code / Unused Tables" documentation

**Risk:** Low.

---

### 4.6 Expand Existing CI Pipeline with `database.types.ts` Drift Check

**Why:** No script to regenerate types from live schema. Schema drift is undetectable until runtime.

**Codex review correction:** CI/CD already exists (`.github/workflows/ci.yml` runs lint, typecheck, test, build on Node 20/22). This task expands the existing pipeline, not creates one from scratch.

**Actions:**
1. Add to `package.json` scripts:
   ```
   "gen:types": "supabase gen types typescript --project-id padeaqdcutqzgxujtpey > src/lib/database.types.ts"
   ```
2. Add a new step to the existing `.github/workflows/ci.yml` (after "Install dependencies", before "Lint"):
   - Install Supabase CLI: `npm install -g supabase`
   - Run `npm run gen:types`
   - Run `git diff --exit-code src/lib/database.types.ts` — fail build on drift
3. Document in `docs/deployment-checklist.md`

**Files to modify:**
- `package.json`
- `.github/workflows/ci.yml` (expand existing pipeline)

**Risk:** Low. Requires Supabase CLI + project access token as CI secret (`SUPABASE_ACCESS_TOKEN`).

---

## Go-Live Exit Gates

**Codex review addition:** The original plan omitted explicit completion criteria for infrastructure/operational readiness. These gates must ALL pass before the 1.0 release is authorized.

### Code Gates (verified by CI + manual testing)
- [ ] All 178+ tests pass (`npm run test`)
- [ ] Zero TypeScript errors (`npm run typecheck`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] No diagnostic/test files in source (`_diag*`, `_minimal*`, `SupabaseTestPage`)
- [ ] Zero raw `console.*` calls in production paths (only structured `logger`)

### Infrastructure Gates (verified by human on Supabase/Vercel)
- [ ] RLS policies applied and tested (read `001_rls_policies.sql` confirmation)
- [ ] Edge Function `admin-create-user` deployed and responding
- [ ] Core RPCs (`save_quote_if_version`, `generate_next_quote_ref`) confirmed present
- [ ] Atomic save RPCs (`save_commission_tiers_atomic`, `save_residual_curves_atomic`) deployed
- [ ] SMTP provider configured (send test email, confirm delivery)
- [ ] Auth rate limiting configured (test with 6 rapid failed logins — verify 429)
- [ ] Connection pooling enabled for 200+ concurrent connections

### Environment Gates
- [ ] `.env.production` reviewed — all required vars set on Vercel
- [ ] `SUPABASE_URL` and `SUPABASE_ANON_KEY` point to production project
- [ ] No development/staging keys in production environment
- [ ] Security headers confirmed in Vercel deployment (`X-Frame-Options`, CSP, HSTS)

### Operational Gates
- [ ] Error monitoring configured (Sentry or equivalent) — captures JS errors in production
- [ ] Database backups enabled (Supabase Pro plan or manual schedule documented)
- [ ] Backup recovery tested at least once (restore to staging, verify data)
- [ ] Load test completed: 200 simulated concurrent users performing quote saves and polling
- [ ] Load test results documented with pass/fail criteria

### UAT Gates
- [ ] At least 3 real users have completed full quote creation → approval → PDF export workflow
- [ ] At least 1 admin user has tested: user creation, role change, pricing config update
- [ ] Mobile workflow tested on at least 2 devices (iOS + Android)
- [ ] User-reported bugs from UAT triaged (blockers fixed, non-blockers tracked)

---

## Items Explicitly Out of Scope (Post-1.0)

These were in the Production Readiness Report under "Important" but are feature work, not production blockers:

| Item | Reason for Deferral |
|------|-------------------|
| I3. PDF product images | Cosmetic — placeholders work functionally |
| I4. T&C page count hardcoded | Minor — only affects long T&C documents |
| I5. Dashboard customization | Feature work — all users see same dashboard |
| I7. Bulk quote operations | Feature work — individual operations work |
| I8. Data export/reporting | Feature work — not blocking go-live |
| I10. CI/CD pipeline | Already exists (lint/typecheck/test/build); expanded by 4.6 with drift check |
| I11. Favicon/branding | Cosmetic |
| I12. Health check endpoint | Ops — Vercel/Supabase provide basic monitoring |
| I13. User onboarding | Feature work — can be added post-launch |
| I15. Backup/recovery docs | Ops — handled at Supabase plan level |

---

## Infrastructure Actions (Not Code — Manual/Dashboard)

These require Supabase dashboard or CLI actions, not code changes:

1. **Apply RLS migration** — `supabase db push` or run `001_rls_policies.sql` manually (B2)
2. **Deploy Edge Function** — `supabase functions deploy admin-create-user` (B3)
3. **Configure SMTP** — Add production email provider in Supabase Auth settings (B7)
4. **Configure Supabase rate limiting** — Set `GOTRUE_RATE_LIMIT_*` vars (B6)
5. **Apply new RPC migrations** — `002_schema_and_rpcs.sql`, `003_atomic_saves.sql` (1.2, 1.3)
6. **Configure connection pooling** — Supabase Pro plan setting for 200+ users

---

## Execution Order

```
Sprint 1 (Foundation):
  1.1 Delete diagnostic files, verify tests ────────── 30 min
  1.2 Move RPCs to canonical migrations ─────────────── 1 hr
  1.3 Fix non-atomic delete+insert (RPC) ────────────── 4 hrs
  1.4 Server-side rate limiting config ──────────────── 2 hrs
  1.5 Deployment docs (Edge Function, SMTP) ─────────── 2 hrs

Sprint 2 (Data Integrity):
  2.1 Harden auto-save failure handling ─────────────── 4 hrs
  2.2 Database connection error recovery ────────────── 6 hrs
  2.3 Notification polling → Realtime ───────────────── 6 hrs
  2.4 Realtime connection management ────────────────── 4 hrs

Sprint 3 (Security):
  3.1 Session lifecycle enforcement ─────────────────── 4 hrs
  3.2 Replace console.* with logger ─────────────────── 4 hrs
  3.3 Capture oldValues in audit logging ────────────── 2 hrs

Sprint 4 (Scale & UX):
  4.1 Route adapter-bypass files through adapter ────── 8 hrs
  4.2 Builder top navigation bar ────────────────────── 3 hrs
  4.3 Client info form validation ───────────────────── 3 hrs
  4.4 Price list overflow detection ─────────────────── 1 hr
  4.5 Remove dead code ──────────────────────────────── 1 hr
  4.6 database.types.ts regen script + CI ───────────── 2 hrs
```

**Total estimated effort:** ~57 hours across 4 sprints

---

## How to Test Each Sprint

### Sprint 1
- `npm run test` — all 178 tests pass
- Verify commission tiers save/load roundtrip with simulated network failure
- Verify admin user creation works (after Edge Function deploy)

### Sprint 2
- Disconnect network during auto-save → verify persistent warning
- Kill and restart Supabase → verify retry and recovery
- Open 200 browser tabs (or load test) → verify no connection exhaustion

### Sprint 3
- Deactivate a user → verify forced logout within 5 minutes
- Change a user's role → verify permission update without refresh
- Check browser console in production build → verify no raw console output

### Sprint 4
- Enter quote builder → verify exit button works with unsaved changes guard
- Submit client info with invalid email → verify inline error
- Check audit log after pricing config change → verify oldValues recorded

---

## Dependencies and Risks

| Risk | Mitigation |
|------|-----------|
| RPC deployment must precede code changes (1.3) | Document deployment order; test RPCs independently first |
| Realtime subscriptions may miss events (2.3) | Keep initial fetch + subscribe pattern; add periodic reconciliation |
| Session enforcement may race with active saves (3.1) | Add grace period before forced logout; queue pending saves |
| Adapter migration is large surface area (4.1) | Migrate one file at a time; verify each before moving to next |

---

**Revision 2 — incorporates all 10 Codex PLAN-REVIEW.md amendments.**
