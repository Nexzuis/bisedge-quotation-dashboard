# BUILD-REVIEW.md - Phase Implementation Review

Date: 2026-02-21  
Commit reviewed: `0f60a3e`  
Inputs reviewed: `Project documentation/SPEC.md`, `Project documentation/CURRENT-PLAN.md`, and all files from `git diff --name-only HEAD~1`.

## Verdict
Implementation includes several real fixes, but this is **not phase-complete** against `CURRENT-PLAN.md` blockers. Security and plan-alignment gaps remain.

## Findings (ranked)

### 1. CRITICAL - Security blocker still open: admin user creation remains browser-side with anon key
Evidence:
- `src/components/admin/users/UserManagement.tsx:218`
- `src/components/admin/users/UserManagement.tsx:220`
- `src/components/admin/users/UserManagement.tsx:223`

What is wrong:
- The plan requires moving privileged user operations server-side (`CURRENT-PLAN.md:125`), but code still does `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` and calls `auth.signUp()` directly from the browser.

Impact:
- Privileged account lifecycle is still controlled in client code.
- If project auth/RLS is misconfigured, this is a direct escalation surface.

Required fix:
- Move user creation/reset/admin auth ops to an Edge Function or server endpoint with service role key.
- Keep browser to calling that endpoint only.

### 2. CRITICAL - Phase security foundation marked complete without RLS/clickjacking hardening being implemented
Evidence:
- `Project documentation/CURRENT-PLAN.md:123`
- `Project documentation/CURRENT-PLAN.md:127`
- `src/store/useAuthStore.ts:1`
- `vercel.json:1`

What is wrong:
- Plan says current phase starts with RLS verification/enforcement and clickjacking protections.
- Commit contains no RLS migration artifact and no response header hardening in deployment config.
- `useAuthStore.ts` still has TODO text acknowledging RLS dependency.

Impact:
- Security phase exit criteria are not met.

Required fix:
- Add and commit SQL policy migration(s) for RLS verification/enforcement.
- Add response headers (`X-Frame-Options` and/or CSP `frame-ancestors`) in deployment config.

### 3. IMPORTANT - SPEC is now stale/mismatched with implementation for approval notifications
Evidence:
- `Project documentation/SPEC.md:278`
- `Project documentation/SPEC.md:279`
- `src/hooks/useApprovalNotifications.tsx:44`
- `src/hooks/useApprovalNotifications.tsx:49`
- `src/hooks/useApprovalNotifications.tsx:51`

What is wrong:
- SPEC documents realtime channels on `approval_actions` inserts.
- Implementation now subscribes to `quotes` `UPDATE` events.

Impact:
- Documentation-driven testing and ops runbooks are now wrong.
- API/realtime behavior in spec is inaccurate.

Required fix:
- Update SPEC realtime/API sections to match code, or revert code to match documented design.

### 4. IMPORTANT - Approval notification logic assumes `payload.old.status` exists (not guaranteed)
Evidence:
- `src/hooks/useApprovalNotifications.tsx:58`

What is wrong:
- Logic treats `oldRecord.status !== newRecord.status` as status transition detection.
- On many Postgres realtime setups, `old` values are incomplete unless replica identity is configured appropriately.

Impact:
- False-positive notifications possible on non-status updates.
- Noisy/incorrect alerts under load.

Required fix:
- Verify DB replica identity behavior explicitly.
- Add robust guardrails (e.g., server-generated transition events, or explicit status-change write path).

### 5. IMPORTANT - Notification subscription is unfiltered and processes all quote updates
Evidence:
- `src/hooks/useApprovalNotifications.tsx:44`
- `src/hooks/useApprovalNotifications.tsx:49`
- `src/hooks/useApprovalNotifications.tsx:51`

What is wrong:
- Subscription listens to all `quotes` updates globally, then filters in client callback.

Impact:
- Unnecessary client load in active environments.
- Exposure risk if row-level protections are incomplete.

Required fix:
- Split into narrower filtered subscriptions where possible, or move notification fan-out to server-side events.

### 6. IMPORTANT - User edit UI implies password change but update path ignores password
Evidence:
- `src/components/admin/users/UserManagement.tsx:190`
- `src/components/admin/users/UserManagement.tsx:192`
- `src/components/admin/users/UserManagement.tsx:558`
- `src/components/admin/users/UserManagement.tsx:561`

What is wrong:
- Edit modal still captures optional password for existing users.
- Existing-user update only writes `public.users` profile fields and does not change auth password.

Impact:
- Admin believes password was changed when it was not.
- Operational confusion and account support churn.

Required fix:
- Remove password field from edit-user path, or wire it to a proper privileged server-side password update endpoint.

### 7. IMPORTANT - Performance fix introduces silent truncation risk in price list hooks
Evidence:
- `src/hooks/usePriceList.ts:264`
- `src/hooks/usePriceList.ts:340`
- `src/hooks/usePriceList.ts:397`

What is wrong:
- Hard `limit(100/200)` added without pagination or deterministic ordering for full-table fetch+client-filter flows.

Impact:
- Missing mappings/packages once dataset exceeds limits.
- Non-deterministic behavior depending on default row order.

Required fix:
- Replace full-table fetch + client filter with targeted server queries, or implement pagination with explicit ordering.

### 8. IMPORTANT - Plan item "generate DB types from live schema" not actually done
Evidence:
- `Project documentation/CURRENT-PLAN.md:134`
- `src/lib/database.types.ts:1`
- `src/lib/database.types.ts:5`

What is wrong:
- Types file is still manual and includes TODO for generator command.
- Commit only hand-edited one field (`username`) instead of generation from live schema.

Impact:
- Schema drift risk remains (root cause explicitly called out in plan).

Required fix:
- Generate and commit `database.types.ts` from live Supabase schema as planned.

### 9. MINOR - New tests give partial confidence only (logic reimplemented, not exercised through production function)
Evidence:
- `src/db/__tests__/auditLog.test.ts:5`
- `src/db/__tests__/auditLog.test.ts:18`
- `src/engine/__tests__/safeNum.test.ts:5`
- `src/engine/__tests__/safeNum.test.ts:13`

What is wrong:
- Tests reimplement private logic instead of invoking the production implementation.

Impact:
- Regressions can slip through if implementation diverges from test reimplementation.

Required fix:
- Expose pure helpers for direct import testing, or write adapter-level integration tests with a Supabase test double.

### 10. MINOR - Error classification for quote loading can mislabel transient failures as "not found"
Evidence:
- `src/hooks/useQuoteDB.ts:41`
- `src/hooks/useQuoteDB.ts:43`
- `src/Dashboard.tsx:39`
- `src/Dashboard.tsx:46`

What is wrong:
- `loadFromDB` returns `false` for both "not found" and operational errors.
- Dashboard then shows `Quote with id ... was not found.`

Impact:
- Misleading diagnostics for auth/network/backend failures.

Required fix:
- Return a typed result (`found | forbidden | transient_error`) and render specific messaging/actions.

## What matched plan/spec well
- `head: true` count calls replaced (`src/db/SupabaseAdapter.ts`, `src/hooks/useApprovalCount.ts`, `src/components/admin/approvals/ApprovalDashboard.tsx`, `src/components/dashboard/widgets/PendingApprovalsWidget.tsx`, `src/hooks/useCompanyMerge.ts`).
- `setCustomerInfo` mass-assignment fix is in place (`src/store/useQuoteStore.ts:326`).
- Invalid quote route now blocks editable ghost shell (`src/Dashboard.tsx:67`).
- `saveQuote` no longer falls back to direct upsert path (`src/db/SupabaseAdapter.ts:172`, `src/db/SupabaseAdapter.ts:210`).

## Bottom line
Good progress on reliability/schema fixes, but security foundation and plan-completeness claims are overstated. Do not mark this phase complete until Findings 1 and 2 are resolved.
