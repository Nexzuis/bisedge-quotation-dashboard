# CURRENT-PLAN.md — Phase 5: Edge Case & Small Bug Fixes

Created: 2026-02-22
Updated: 2026-02-22 (v2 — addresses PLAN-REVIEW.md findings)
Sources: Claude audit (25 bugs), Codex audit (10 bugs), merged and de-duplicated.

---

## Changes from v1 (PLAN-REVIEW.md response)

| Finding | Severity | Resolution |
|---------|----------|------------|
| #1 CRITICAL: Recursion guard for cross-tab SIGNED_OUT | CRITICAL | Added concrete `_isLoggingOut` re-entry flag to Wave 1, step 1f. Full call flow documented. |
| #2 CRITICAL: Step 3c is documentation-only, not an actual fix | CRITICAL | Replaced with actual SQL migration change: `005_stale_lock_cleanup.sql` includes `save_quote_if_version` amendment to skip lock check when `locked_at > 1 hour`. |
| #3 IMPORTANT: C4/C5 root cause is wrong — store already deep-merges | IMPORTANT | Re-scoped Wave 2. `loadQuote()` at line 977 already deep-merges with defaults. Adapter returning `[]` is safe because `loadQuote()` maps against defaults. Downgraded C4/C5 to defensive hardening (LOW). Only fix: adapter should log a warning on corrupt parse so we can detect bad data. |
| #4 IMPORTANT: H1 listed in scope but fix is deferred | IMPORTANT | Removed H1 from Wave 3 scope. Moved to Out of Scope with clear rationale. Wave 3 no longer claims to fix same-user multi-tab editing. |
| #5 IMPORTANT: M12 audit fix is non-actionable | IMPORTANT | Verified: `audit_log.user_id` has NO foreign key constraint (confirmed in SQL migrations). The nil UUID approach works. Changed step 6e to verify this in code and add a test assertion. |
| #6 IMPORTANT: Lock timeout 1hr vs 5min mismatch in test | IMPORTANT | Aligned: stale lock threshold = 1 hour (business rationale: users go to meetings, lunch). Test updated to "close tab, wait, verify lock clears after cleanup RPC runs" instead of "wait 5 min". |
| #7 MINOR: H7 slotIndex sort is redundant | MINOR | Dropped step 4d. `loadQuote()` already reconstructs canonical order via `defaults.slots.map()`. Removed H7 from bug list. |

---

## Master Bug List (33 unique items, grouped by priority)

### CRITICAL — Data Loss or Corruption Risk (Fix First)

| # | Bug | Where | Root Cause | Impact |
|---|-----|-------|------------|--------|
| C1 | Logout not awaited — navigate fires before cleanup | `CrmTopBar.tsx:37`, `AdminTopBar.tsx:10` | `logout()` is async but called without `await`, `navigate('/login')` runs immediately | Locks, presence, store resets may never complete |
| C2 | Logout has no auto-save grace period | `useAuthStore.ts:215` (logout) | `forceLogout()` waits 5s for in-flight auto-save, but `logout()` does not | If user clicks logout during auto-save, session dies mid-write — data loss |
| C3 | Cross-tab logout bypasses all cleanup | `AuthContext.tsx:38-56` | `onAuthStateChange(SIGNED_OUT)` calls `setState()` directly, not the full `logout()` | Other tabs never release locks, delete presence, or reset stores |
| C6 | Realtime update can overwrite just-saved local data | `useRealtimeQuote.ts:146-201` | Conflict detection uses `updatedAt > _lastSavedAt` timestamp, not version comparison | Remote reload after auto-save completes discards freshly-saved changes |

### HIGH — Functional Bugs (Fix Second)

| # | Bug | Where | Root Cause | Impact |
|---|-----|-------|------------|--------|
| H2 | No server-side stale lock sweeper for `quotes.locked_by` | `004_presence_cleanup.sql` | Only cleans `quote_presence`, not `quotes.locked_by` | Presence cleaned but lock remains forever — persistent ghost locks |
| H3 | Lock ownership in save RPC has no age fallback | `002_schema_and_rpcs.sql:83-90` | RPC rejects save if another `locked_by` exists, regardless of lock age | Stale lock = hard write block until manual DB intervention |
| H4 | Empty `modelCode` string bypasses pricing guard | `useQuoteStore.ts:662` | Checks `modelCode === '0'` but not `modelCode === ''` | Returns pricing with all zeros — PDF quote could show "Total: R0.00" |
| H5 | `slots[slotIndex]` accessed without null check in components | `UnitCard.tsx:14`, `CommercialStep.tsx:12`, `CostsStep.tsx:12` | No guard on `useQuoteStore(s => s.slots[slotIndex])` | Components crash if slots array is short or corrupted |
| H6 | CEO/System Admin can't submit quotes — no valid approval targets | `approvalEngine.ts:14-18` | `getDefaultTarget()` uses `Math.min()` on empty array → `Infinity` → returns `null` | Quote submission fails silently for highest-role users |
| H8 | Quote locks become stale on tab/browser crash | `useQuoteLock.ts:143` | Unmount-only release, no `beforeunload` for lock release | Other users see "X is editing" indefinitely |
| H9 | Save vs Submit for Approval is easy to misinterpret | `ExportStep.tsx:39` (save) vs `:101` (submit) | Two separate actions, users expect save triggers approval | Approvers see nothing; quote stays draft; "approval missing" incidents |

### MEDIUM — Reliability & UX Issues (Fix Third)

| # | Bug | Where | Root Cause | Impact |
|---|-----|-------|------------|--------|
| M1 | Flash of login page on refresh for authenticated users | `useAuthStore.ts:433-449` | `isAuthenticated = false` set synchronously, `checkAuth()` runs async | Brief login page flash before dashboard renders |
| M2 | localStorage role readable before server validation | `useAuthStore.ts:430-449` | `user` object from localStorage available before `checkAuth()` completes | Components can read tampered role for ~200ms |
| M3 | No timeout on periodic DB validation calls | `useAuthStore.ts:385-427` | `refreshUserFromDB()` has no abort controller or timeout | Network hang stacks up concurrent queries |
| M4 | NaN propagation in cost fields | `CostFieldGroup.tsx:39-42` | `parseFloat('')` = `NaN`; edge cases bypass `Number.isFinite()` guard | NaN corrupts downstream pricing formulas |
| M5 | Zero displays as empty in cost inputs | `CostFieldGroup.tsx:38` | `value={field.value || ''}` treats 0 as falsy | Users can't distinguish "not set" from "explicitly zero" |
| M6 | Double-click on approval confirm button | `ApprovalActionModal.tsx:187-200` | Only `isProcessing` flag prevents re-submit; state update is async | Duplicate approval chain entries |
| M7 | Pagination breaks after filtering | `DataTable.tsx:62-66` | `currentPage` stays at old value after filter reduces total pages | Empty table with no indication why |
| M8 | Stale lock override is silent — original user not notified | `useQuoteLock.ts:100-103` | No notification to original lock holder when their stale lock is overridden | Original user continues editing, next save hits version conflict |
| M9 | Quote ref sorts alphabetically, not numerically | `QuotesListPage.tsx:141-144` | String comparison: "10.0" sorts before "2.0" | Incorrect list order |
| M10 | Connection probe conflates session expiry with network issues | `useConnectionStatus.ts:73-76` | Probe queries authenticated table; expired session = "unreachable" | False "connection lost" warnings |
| M11 | Approval chain silently becomes `[]` on parse failure | `PendingApprovalsWidget.tsx:70-75` | Catch sets `chain = []` without logging or alerting | Entire approval history disappears from UI |
| M12 | Failed-login audit logging uses nil UUID | `useAuthStore.ts:82-86` | All-zero UUID placeholders for pre-auth events | Verified: no FK constraint exists on `audit_log.user_id` — this works, but is worth a comment and test |
| M13 | Several critical UI data paths fail silently | `useApprovalCount.ts:54-56`, `useNotifications.ts:47-49` | catch blocks swallow errors without user feedback | Badge/count failures look like "no approvals" |
| M14 | Presence unload cleanup is best-effort only | `usePresence.ts:87-96` | No `navigator.sendBeacon` fallback for reliable cleanup | More stale presence rows than expected on abrupt close |
| M15 | Auth user vs profile user drift | `useAuthStore.ts:151,161` | Login checks auth first, then public.users; creating only one = confusing errors | "user exists but cannot login" incidents |

### LOW — Minor / Operational (Fix If Time)

| # | Bug | Where | Root Cause | Impact |
|---|-----|-------|------------|--------|
| L1 | Logout errors not caught or reported to user | `CrmTopBar.tsx:37` | No try/catch on async logout call | User not informed if logout failed |
| L2 | Logout type `void` but actually `Promise<void>` | `AuthContext.tsx:18` | Interface mismatch | TypeScript won't warn callers about missing `await` |
| L3 | `setCustomerInfo` uses `(state as any)` cast | `useQuoteStore.ts:326` | Whitelist-based assignment bypasses type checking | Could silently overwrite internal fields |
| L4 | RLS policies for price_list_series/telematics/containers not in migrations | `001_rls_policies.sql` | Fixed in live DB but not codified | New/staging environments reintroduce the outage |
| L5 | Missing shipping entry field validation on old quotes | `SupabaseAdapter.ts:1728-1754` | Old entries may lack `id`, `costZAR`, etc. | React key warnings, delete-entry fails |
| L6 | Adapter returns `[]` for corrupt slots (defensive) | `SupabaseAdapter.ts:1727` | `catch` returns `[]` silently — store's `loadQuote()` handles this correctly but adapter should log a warning | No data loss, but corrupt data goes unnoticed |

---

## Fix Plan — Ordered by Priority and Dependency

### Wave 1: Logout & Session Safety (C1, C2, C3, L1, L2)

**Goal:** Make all logout paths safe, awaited, and complete.

| Step | File | Change |
|------|------|--------|
| 1a | `useAuthStore.ts:215` | Add `_autoSaveInProgress` grace period to `logout()` (same as `forceLogout()`) |
| 1b | `useAuthStore.ts:30` | Change `logout` type from `() => void` to `() => Promise<void>` |
| 1c | `AuthContext.tsx:18` | Update `AuthContextType.logout` to `() => Promise<void>` |
| 1d | `CrmTopBar.tsx:37-40` | Make `handleLogout` async, `await logout()`, add try/catch with toast |
| 1e | `AdminTopBar.tsx:9-11` | Same as 1d |
| 1f | `AuthContext.tsx:38-56` | **Recursion-safe cross-tab cleanup:** Add module-level `_isLoggingOut = false` flag in `useAuthStore.ts`. In `logout()` and `forceLogout()`, set `_isLoggingOut = true` at entry, reset at exit. In `onAuthStateChange(SIGNED_OUT)` handler, check the flag: if `_isLoggingOut` is true, this tab initiated the sign-out so skip (cleanup already running). If false, this is a cross-tab event — call `logout()` with a new `skipSignOut: true` option that skips `supabase.auth.signOut()` (already signed out by the other tab) but runs all cleanup (lock release, presence delete, store reset). |

**Cross-tab SIGNED_OUT call flow:**
```
Tab A clicks logout:
  → _isLoggingOut = true
  → release locks/presence
  → supabase.auth.signOut()
  → reset stores
  → set({ user: null, isAuthenticated: false })
  → _isLoggingOut = false

Tab B receives onAuthStateChange(SIGNED_OUT):
  → checks _isLoggingOut → false (Tab B didn't initiate)
  → calls logout({ skipSignOut: true })
    → _isLoggingOut = true
    → release locks/presence (Tab B's locks)
    → SKIP supabase.auth.signOut() (already done)
    → reset stores
    → set({ user: null, isAuthenticated: false })
    → _isLoggingOut = false
  → navigate to /login
```

### Wave 2: Defensive Adapter Hardening (L5, L6)

**Goal:** Add logging for corrupt data and fill missing fields on old shipping entries. NOT the primary fix for slots (store `loadQuote()` already handles that).

| Step | File | Change |
|------|------|--------|
| 2a | `SupabaseAdapter.ts:1727` | Add `logger.warn()` in the catch block instead of silent `return []` — still returns `[]` but now operators can detect corruption |
| 2b | `SupabaseAdapter.ts:1728-1754` | Validate each shipping entry has required fields (`id`, `costZAR`); fill missing with defaults |

### Wave 3: Locking & Presence Hardening (H2, H3, H8, M8)

**Goal:** Make locks durable and self-healing. Stale lock threshold: **1 hour** (rationale: users step away for meetings, lunch — 1hr is generous enough to avoid false eviction while still preventing indefinite ghost locks).

**H1 (same-user multi-tab) is OUT OF SCOPE** — requires per-session lock tokens (schema change).

| Step | File | Change |
|------|------|--------|
| 3a | `useQuoteLock.ts` | Add `beforeunload` handler for lock release (matches what `usePresence.ts` already has) |
| 3b | New migration `005_stale_lock_cleanup.sql` | **Two functions:** (1) `cleanup_stale_locks()`: sets `locked_by = NULL, locked_at = NULL` on quotes where `locked_at < NOW() - INTERVAL '1 hour'`. Grants: authenticated + service_role. (2) **Amend `save_quote_if_version`**: add stale-lock bypass — if `locked_by IS NOT NULL AND locked_by != p_user_id AND COALESCE(locked_at, NOW()) > NOW() - INTERVAL '1 hour'`, reject. Otherwise treat as unlocked (allow save). **NULL `locked_at` handling:** `COALESCE(locked_at, NOW())` treats a NULL timestamp as "just now" (i.e., active/fresh lock), so legacy rows with `locked_by` set but `locked_at` NULL are treated as actively locked and rejected — preventing accidental bypass of lock enforcement. This replaces the current strict lock check that has no age fallback. |
| 3c | `SupabaseAdapter.ts` | Add `cleanupStaleLocks()` method that calls the new RPC |
| 3d | `DatabaseAdapter.ts` | Add `cleanupStaleLocks(): Promise<void>` to interface |
| 3e | `useQuoteLock.ts:74-98` | Call `cleanupStaleLocks()` before lock acquisition (same pattern as presence cleanup) |

### Wave 4: Pricing & Validation Guards (H4, H5, H6, M4, M5)

**Goal:** Prevent NaN/undefined/empty from reaching calculations or UI.

| Step | File | Change |
|------|------|--------|
| 4a | `useQuoteStore.ts:662` | Add `!modelCode || modelCode === '0'` guard in `getSlotPricing()` |
| 4b | `UnitCard.tsx`, `CommercialStep.tsx`, `CostsStep.tsx` | Add `if (!slot) return null` guard |
| 4c | `approvalEngine.ts:14-18` | Handle empty `validRoles` array — when `Math.min()` would receive empty array, return `null` early with `logger.info()` explaining this is the highest role |
| 4d | `CostFieldGroup.tsx:38` | Change `value={field.value || ''}` to `value={field.value === 0 ? '0' : field.value || ''}` |
| 4e | `CostFieldGroup.tsx:39-42` | Clamp parsed value: if `isNaN(v)` → set to 0 instead of passing through |

### Wave 5: Realtime & Conflict Safety (C6, M6, M7, M11)

**Goal:** Prevent silent data loss from realtime events and UI race conditions.

| Step | File | Change |
|------|------|--------|
| 5a | `useRealtimeQuote.ts:146-201` | Use version comparison (`remoteVersion > localVersion`) instead of timestamp for conflict detection |
| 5b | `ApprovalActionModal.tsx:187-200` | Disable confirm button immediately on first click (before async setState) using a `useRef` flag |
| 5c | `DataTable.tsx:62-66` | Clamp `currentPage` to valid range after filtering: `Math.min(currentPage, totalPages)` |
| 5d | `PendingApprovalsWidget.tsx:70-75` | Log parse failures; show "Approval history unavailable" instead of silently hiding |

### Wave 6: Session & Auth Robustness (M1, M2, M3, M10, M12, M13, M15)

**Goal:** Improve auth UX and reduce silent failures.

| Step | File | Change |
|------|------|--------|
| 6a | `useAuthStore.ts:433-449` | Clear `user` object on rehydrate (not just `isAuthenticated`); restore only after `checkAuth()` succeeds |
| 6b | `useAuthStore.ts:385-427` | Add `AbortController` with 10s timeout to `refreshUserFromDB()` |
| 6c | `useConnectionStatus.ts:73-76` | Use unauthenticated health check (e.g., `supabase.from('...').select('count')` on public table, or just a fetch to the Supabase URL) |
| 6d | `useApprovalCount.ts:54-56`, `useNotifications.ts:47-49` | Add user-visible fallback on fetch failure (stale data indicator or retry) |
| 6e | `useAuthStore.ts:82-86` | Add inline comment confirming no FK constraint on `audit_log.user_id` (verified in live database schema — migration files define RLS/indexes but not table DDL with FK constraints). No code change needed. |

### Wave 7: UX Polish & Operational (H9, M9, L3, L4)

**Goal:** Reduce user confusion and operational risk.

| Step | File | Change |
|------|------|--------|
| 7a | `ExportStep.tsx` | Add prominent visual distinction between Save and Submit for Approval (different color, confirmation dialog, tooltip explaining the difference) |
| 7b | `QuotesListPage.tsx:141-144` | Use numeric sort for quote ref: `parseFloat(a.quoteRef) - parseFloat(b.quoteRef)` |
| 7c | `001_rls_policies.sql` | Add RLS policies for `price_list_series`, `telematics_packages`, `container_mappings` |
| 7d | `useQuoteStore.ts:326` | Replace `(state as any)` cast with properly typed assignment |

---

## Testing Strategy

After each wave:
1. `npm run typecheck` — 0 errors
2. `npm run test` — all tests pass
3. `npm run build` — succeeds
4. Manual browser test of the affected flow

Key manual tests:
- **Wave 1:** Log out while auto-save spinner is visible. Open 2 tabs, log out in one — verify other tab redirects to login AND its locks/presence are cleaned up (no recursion, no infinite loop). Fast user-switch: log out, log in as different user, verify no stale state.
- **Wave 2:** Load an old quote with corrupted/missing shipping fields. Check browser console for adapter warning logs on bad data.
- **Wave 3:** Close browser tab mid-edit. Open same quote in another browser — verify lock is gone after `cleanup_stale_locks()` runs (triggered on next lock acquisition, not time-based). Test: User A locks quote, User A's tab crashes, User B opens quote and acquires lock successfully (cleanup runs before acquisition).
- **Wave 4:** Create a quote with empty slot (no unit selected). Verify no NaN in pricing. Test CEO: attempt to submit quote for approval — verify graceful handling (not silent failure).
- **Wave 5:** Edit quote in tab A. Edit in tab B (different user). Verify conflict prompt uses version, not timestamp. Rapidly click approval confirm — verify only one action fires.
- **Wave 6:** Refresh browser while logged in. Verify no login page flash. Disconnect network, verify no false "connection lost".
- **Wave 7:** Complete a quote as Key Accounts Manager. Verify clear distinction between Save and Submit for Approval.

---

## Risks

1. **Wave 3 (migration 005):** New SQL migration must be run on Supabase. Same deployment requirement as 003/004.
2. **Wave 3b (amend save_quote_if_version):** Changing the lock check in the RPC is a production-critical change. Must test: (a) normal save with valid lock works, (b) save with stale lock (>1hr) succeeds, (c) save with fresh lock by another user is rejected.
3. **Wave 5a (version comparison):** Requires the store to expose `version` in a way that `useRealtimeQuote` can access.
4. **Wave 6a (clear user on rehydrate):** May cause a brief "logged out" flash if `checkAuth()` is slow. Need a loading state.

---

## Out of Scope (Tracked in TECH-DEBT.md)

- **H1: Same-user multi-tab editing** — requires per-session lock tokens (schema change to add `lock_session_id` column). Current behavior: same user can edit in two tabs, version conflicts catch actual overwrites. Acceptable for now.
- **M14: `navigator.sendBeacon` for presence cleanup** — complex, unreliable across browsers, and the server-side `cleanup_stale_presence()` already handles the gap.
- **Server-side auth user creation via Edge Function** — infrastructure change, not a bug fix.
