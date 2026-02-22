# CURRENT-PLAN.md — Phase 7: Deep Workflow Audit Fixes

Created: 2026-02-22
Updated: 2026-02-22 (v2 — addresses PLAN-REVIEW.md findings)
Sources: 4-agent deep workflow audit (quote lifecycle, auth/session, CRM/leads, approval/admin) + manual verification.

---

## Changes from v1 (PLAN-REVIEW.md response)

| Finding | Severity | Resolution |
|---------|----------|------------|
| #1 CRITICAL: Lock guard uses `version === 0` but store starts at `version: 1` | CRITICAL | Fixed: changed to `quoteRef === '0000.0'` — this is the default ref set by `resetQuote()` and only replaced after `getNextQuoteRef()` succeeds. Verified at `useQuoteStore.ts:310`. |
| #2 IMPORTANT: I6 scope not evidence-backed for persisted fields | IMPORTANT | Narrowed: `useCrmStore` persists only `viewMode` (line 41), `useLeadStore` persists only `viewMode` + `pageSize` (line 68). Filters like `searchQuery`, `statusFilter`, `assignedToFilter` are in-memory only — they survive within a SPA session (logout → login without page reload) but NOT across reloads. Updated bug description and fix to target in-memory state reset only. |
| #3 IMPORTANT: I5 approvalStatus gating may be inconsistent | IMPORTANT | Verified: `applyAction()` at `useApprovalActions.ts:75-76` sets `state.status = newStatus` (e.g. `'pending-approval'`) in the Zustand store immediately. The ExportStep reads `quote.status` from the store. So after a successful submit, `quote.status` IS `'pending-approval'` and the button IS disabled. The window only exists if the user navigates away before the store update (race condition during save failure + revert at line 87-90). Downgraded to MINOR — only manifests on save failure followed by immediate re-navigation. |
| #4 IMPORTANT: C4 impact overstated — markNotificationRead rehydrates from DB | IMPORTANT | Verified: `NotificationsPage` loads notifications via `getNotifications()` which returns DB-generated IDs. `markNotificationRead` uses those DB IDs. The caller-generated ID is never used for mark-read. Downgraded C4 from CRITICAL to MINOR (consistency cleanup — no user-facing failure demonstrated). |
| #5 IMPORTANT: C5 FK behavior asserted without evidence | IMPORTANT | Verified: No FK constraints defined in migration files for `quotes.company_id`. The column is a plain `uuid` with an index (`idx_quotes_company_id`) but no REFERENCES clause. Supabase default behavior for unlinked columns: DELETE succeeds, `quotes.company_id` retains the now-stale UUID (no cascade, no SET NULL). Updated bug description: quotes are NOT deleted but become orphaned (stale `company_id` pointing to non-existent company). Fix updated accordingly. |
| #6 IMPORTANT: I7 toast in AuthContext doesn't match control flow | IMPORTANT | Verified: `refreshUserFromDB` (useAuthStore.ts:467-476) updates the role in the store and returns `{ kicked: false }`. AuthContext only redirects on `kicked: true`. `RequireAdmin` re-renders from the store update and silently bounces the user. Fix moved: toast should be emitted inside `refreshUserFromDB` when role change is detected (useAuthStore.ts:467-475), not in AuthContext. |

---

## Audit Summary

4 specialized agents performed a deep static audit focused on real-world user workflows, mid-action interruptions, and "dumb user" edge cases. All findings verified against actual code — no false positives.

**25 unique confirmed bugs:** 4 CRITICAL, 13 IMPORTANT, 8 MINOR (re-graded after Codex review)

---

## Master Bug List

### CRITICAL — Data Loss, Dead Features, or Broken Core Flows

| # | Bug | Where | Root Cause | Impact |
|---|-----|-------|------------|--------|
| C1 | `createNewQuote()` resets store BEFORE async RPC — if RPC fails, current quote is destroyed | `useQuoteDB.ts:59` | `resetQuote()` called before `await getNextQuoteRef()` | Data loss: user's current quote wiped from store with no recovery |
| C2 | `RequireAuth` has no loading state — flashes to /login on every page reload | `App.tsx:39-42`, `useAuthStore.ts:490-508` | `onRehydrateStorage` clears `isAuthenticated` to false, `checkAuth()` is async | Login page flash, cancelled requests, broken useEffect hooks |
| C3 | Approval notification helpers never called — notification inbox is dead for approval events | `useApprovalActions.ts` (entire file) | `notifyApprovalNeeded()` and `notifyApprovalResult()` exist but are never imported/called | Approval notifications never persist to DB; inbox always empty for approval events |
| C4 | `deleteCompany` has no guard for linked quotes — orphans them silently | `SupabaseAdapter.ts:892-899`, `CustomerDetailPage.tsx:43` | Raw DELETE with no pre-check. No FK constraint on `quotes.company_id` — quotes retain stale UUID pointing to deleted company. | Quotes become orphaned (stale `company_id`, invisible in CRM company view) with no warning |
| C6 | `convertLead` result `companyId` is destructured but never used — no navigation to new company | `LeadDetailPage.tsx:77` | `companyId` return value ignored after destructuring | User converts lead, gets toast only, no way to find the new company immediately |

### IMPORTANT — Functional Bugs & Workflow Breakage

| # | Bug | Where | Root Cause | Impact |
|---|-----|-------|------------|--------|
| I1 | LoadQuoteModal navigates to `/quote` without `?id=` — Dashboard loads most recent instead | `QuickActionsWidget.tsx:76` | `onQuoteLoaded={() => navigate('/quote')}` has no ID | User selects Quote A from modal, sees Quote B |
| I2 | "Back to Quote" from builder navigates without ID | `ExportStep.tsx:262` | `navigate('/quote')` instead of `navigate('/quote?id=...')` | Context switch after submit/save |
| I3 | CrmTopBar "New Quote" nav item doesn't call `createNewQuote()` | `CrmTopBar.tsx:75,108,255` | Nav item goes directly to `/builder` with no state reset | Stale quote data carries into "New Quote" flow |
| I4 | Lock acquired for unsaved quote IDs that don't exist in DB | `useQuoteLock.ts:132-142` | `acquireQuoteLock` runs against non-existent row, returns 0 rows, shows wrong error | "Another user is editing" shown for brand-new quote |
| I5 | CRM/Lead in-memory filter state not cleared on logout — leaks within SPA session | `useAuthStore.ts:282-309` | `logout()` resets `useQuoteStore` but not `useCrmStore`/`useLeadStore`. Persisted fields (`viewMode`, `pageSize`) are harmless, but in-memory fields (`searchQuery`, `statusFilter`, `assignedToFilter`) survive same-tab logout→login. | User B sees User A's search/filter state in leads/CRM list within the same browser session |
| I6 | Role downgrade silently redirects with no explanation | `useAuthStore.ts:467-476` | `refreshUserFromDB` detects role change, updates store, but emits no toast. `RequireAdmin` re-renders and bounces user to `/` silently. | Admin demoted to sales_rep gets bounced with no message |
| I8 | Kanban drag for restricted roles silently no-ops but shows success toast | `KanbanBoard.tsx:47-55`, `useCompanies.ts:82-89` | `updateStage` returns without throwing for restricted roles | User sees card move + success toast, but nothing persisted |
| I9 | `qualifyLead` allows double-qualification — overwrites original qualifier | `LeadDetailPage.tsx:60-65`, `useLeads.ts:82-95` | No check for `qualificationStatus === 'qualified'` before write | Audit trail silently overwritten by second qualifier |
| I10 | GlobalSearch only searches companies — quotes and contacts never searched | `GlobalSearch.tsx:57-85` | Only `listCompanies()` called; quote/contact branches never implemented | Placeholder says "Search companies, quotes, contacts..." but only companies work |
| I11 | Bulk operations show misleading success count on partial failures | `BulkActionsBar.tsx:34-46`, `LeadExplorerPage.tsx:96-102` | `updateStage` silent no-op counted as success; bulk update doesn't check rows affected | Toast says "Updated 5" when only 3 actually persisted |
| I12 | `ApprovalActionModal` isSubmittingRef never reset if onConfirm fails without closing modal | `ApprovalActionModal.tsx:143-209` | `isSubmittingRef` set to true before `onConfirm`, only reset on modal re-open | Confirm button permanently disabled after a failed attempt |
| I13 | Deactivated user's quotes stay assigned — approval workflow deadlocks | `UserManagement.tsx:240-274`, `SupabaseAdapter.ts:2232-2233` | `softDeleteUser` doesn't reassign in-flight quotes | Quotes in pending-approval assigned to deactivated user are unreachable |

### MINOR — UX Polish & Edge Cases

| # | Bug | Where | Root Cause | Impact |
|---|-----|-------|------------|--------|
| M1 | QuickActionsWidget `handleNewQuote` has no try/catch | `QuickActionsWidget.tsx:22-25` | Missing error handling (compare to CRM QuickActions which has it) | Silent failure on network error |
| M2 | BuilderTopBar Exit uses `window.location.hash` — narrow NavigationGuard bypass | `BuilderTopBar.tsx:17-19` | Direct DOM mutation instead of React Router `navigate()` | Guard may not fire if `lastSavedAt` is null at startup |
| M3 | `CustomerDetailPage` loadCompany has no cancellation token | `CustomerDetailPage.tsx:28-33` | Plain async function, no `useCallback`, no cancelled flag | React unmount warning on slow network |
| M4 | "View Contact in CRM" navigates to company page, not contact | `LeadDetailPage.tsx:304-311` | Both buttons use same `convertedCompanyId` URL | Misleading button label |
| M5 | system_admin can't act on `in-review` quotes | `approvalEngine.ts:96-106` | Admin override only handles `pending-approval`, not `in-review` | Admin locked out of in-review quotes they don't own |
| M6 | UserManagement no success toast after soft-delete | `UserManagement.tsx:254-274` | Missing `toast.success()` after successful deactivation | Admin unsure if action worked |
| M7 | `saveNotification` ID divergence (consistency cleanup) | `SupabaseAdapter.ts:1056-1079` | Adapter generates its own UUID, callers also generate one. No user-facing failure: `markNotificationRead` uses DB-rehydrated IDs. | Potential confusion if caller references local ID, but no demonstrated failing path |
| M8 | ExportStep submit button: narrow race on save-failure revert | `ExportStep.tsx:194` | `applyAction` sets `status = 'pending-approval'` immediately (line 76), so button IS disabled post-submit. Only manifests if save fails + reverts status (line 87-90) + user immediately re-navigates. | Extremely narrow window; no demonstrated repro |

---

## Fix Plan — Ordered by Priority and Dependency

### Wave 1: Quote Creation Safety (C1, I4, M1)

**Goal:** Make `createNewQuote()` safe against async failures and fix downstream lock/error issues.

| Step | File | Change |
|------|------|--------|
| 1a | `useQuoteDB.ts:56-76` | Move `resetQuote()` AFTER the `await getNextQuoteRef()` succeeds. Sequence: get ref → reset → set new state. If RPC fails, current quote is preserved. |
| 1b | `useQuoteLock.ts:132-142` | Skip lock acquisition when quote has not been saved to DB yet. Guard: `useQuoteStore.getState().quoteRef === '0000.0'` — this is the default ref set by `resetQuote()` (verified at `useQuoteStore.ts:310`) and only replaced after `getNextQuoteRef()` RPC succeeds. Using `version === 0` would NOT work because the store initializes `version: 1`. |
| 1c | `QuickActionsWidget.tsx:22-25` | Add try/catch with `toast.error()` matching the pattern in CRM `QuickActions.tsx:14-22`. |

### Wave 2: Navigation ID Stability (I1, I2, I3, M2)

**Goal:** All navigation to `/quote` includes the quote ID. All "New Quote" paths call `createNewQuote()`.

| Step | File | Change |
|------|------|--------|
| 2a | `QuickActionsWidget.tsx:76` | Change `onQuoteLoaded` callback: after `LoadQuoteModal` loads a quote, navigate to `/quote?id=${quoteId}` instead of `/quote`. The `LoadQuoteModal` already passes the loaded quote to the store — read `useQuoteStore.getState().id` after load. |
| 2b | `ExportStep.tsx:262` | Change "Back to Quote" from `navigate('/quote')` to `navigate('/quote?id=${quoteId}')` using the current store's quote ID. |
| 2c | `CrmTopBar.tsx:75,108,255` | Change "New Quote" nav item to call `createNewQuote()` before navigating, same pattern as CRM `QuickActions.tsx`. Requires importing `useQuoteDB`. |
| 2d | `BuilderTopBar.tsx:17-19` | Replace `window.location.hash = '/'` with `navigate('/')` via React Router for consistent NavigationGuard interception. |

### Wave 3: Auth & Session Safety (C2, I5, I6)

**Goal:** Eliminate login flash, clear in-memory store state on logout, notify on role changes.

| Step | File | Change |
|------|------|--------|
| 3a | `useAuthStore.ts` | Add `isAuthLoading: boolean` to store state. Set `true` in `onRehydrateStorage`, set `false` after `checkAuth()` resolves. |
| 3b | `App.tsx:39-42` | Update `RequireAuth`: if `isAuthLoading`, render `<LazyFallback label="Authenticating..." />` instead of redirecting. Only redirect to `/login` when `!isAuthLoading && !isAuthenticated`. |
| 3c | `useAuthStore.ts:282-309` | In `logout()`, reset in-memory filter state in `useCrmStore` and `useLeadStore`. Only in-memory fields need clearing (`searchQuery`, `statusFilter`, `assignedToFilter`, `page`) — persisted fields (`viewMode`, `pageSize`) are harmless UI preferences. Add reset calls to both `logout()` and `forceLogout()`. Verified: `useCrmStore` persists only `viewMode` (line 41), `useLeadStore` persists only `viewMode` + `pageSize` (line 68). |
| 3d | `useAuthStore.ts:467-476` | In `refreshUserFromDB`, when role change is detected (line 467: `dbUser.role !== currentUser.role`), add `toast.info(\`Your role has been updated to ${dbUser.role}\`)` inside the role-change block. This is where the role update actually happens — NOT in AuthContext which only handles kicked/signed-out flows. |

### Wave 4: Approval Notifications & Actions (C3, I12, M5, M7)

**Goal:** Make approval notifications actually persist and fix action guards.

| Step | File | Change |
|------|------|--------|
| 4a | `useApprovalActions.ts` | After each approval action (approve/reject/escalate/return), call the appropriate notification helper (`notifyApprovalResult` or `notifyApprovalNeeded`). Import from `notificationHelpers.ts`. |
| 4b | `SupabaseAdapter.ts:1056-1079` | Consistency cleanup: remove the duplicate `crypto.randomUUID()` in `saveNotification`. Accept the caller's `id` field. Change interface from `Omit<StoredNotification, 'id' | 'createdAt'>` to `Omit<StoredNotification, 'createdAt'>`. No user-facing failure demonstrated (mark-read uses DB-rehydrated IDs), but prevents future confusion. |
| 4c | `ApprovalActionModal.tsx` | Reset `isSubmittingRef.current = false` in a `finally` block after `onConfirm`, or add a `useEffect` that resets it when `isProcessing` transitions from `true` to `false`. |
| 4d | `approvalEngine.ts:96-106` | Add `system_admin` override block for `in-review` status (same pattern as `pending-approval` at lines 91-93). |

### Wave 5: CRM & Lead Safety (C4, C5, I7, I8, I10)

**Goal:** Guard destructive operations, fix silent no-ops, prevent double-qualification.

| Step | File | Change |
|------|------|--------|
| 5a | `CustomerDetailPage.tsx:43` | Before delete confirmation, query quotes where `company_id = id` to get count. No FK constraint exists on `quotes.company_id` (verified: migrations only define an index, no REFERENCES clause). Supabase will DELETE the company row successfully; linked quotes retain the stale `company_id` UUID (orphaned, not deleted). Show "This company has X linked quotes that will become orphaned" in the dialog. Either block deletion or require explicit acknowledgment. |
| 5b | `LeadDetailPage.tsx:77` | After `convertLead`, navigate to `/customers/${companyId}` with a success toast "Lead converted — viewing new company". |
| 5c | `useCompanies.ts:82-89` | For restricted roles, throw an error (or return a result indicating no-op) instead of silently returning. This fixes both Kanban drag (I7) and bulk operations (I10). |
| 5d | `useLeads.ts:82-95` | In `qualifyLead`, check `lead.qualificationStatus !== 'qualified'` before writing. If already qualified, show toast and return early. |
| 5e | `BulkActionsBar.tsx:34-46` | Count actual successes vs failures and show accurate toast: "Updated 3 of 5 companies (2 failed)". |

### Wave 6: UX Polish (I9, I13, M3, M4, M6)

**Goal:** Fix remaining UX gaps and operational issues.

| Step | File | Change |
|------|------|--------|
| 6a | `GlobalSearch.tsx:57-85` | Add quote search (by `quoteRef`, `clientName`) and contact search (by name, email) to the search function. Wire into the existing `SearchResult` type which already supports `'quote' | 'contact'` types. |
| 6b | `UserManagement.tsx:240-274` | On `softDeleteUser`, check for in-flight quotes assigned to the user. Show warning in the confirm dialog with count. Add `toast.success('User deactivated')` after success. |
| 6c | `CustomerDetailPage.tsx:28-33` | Wrap `loadCompany` in `useCallback` with a `cancelled` flag pattern (same as `CustomerListPage.loadData`). Apply same fix to `LeadDetailPage.loadLead`. |
| 6d | `LeadDetailPage.tsx:304-311` | Change "View Contact in CRM" to navigate to `/customers/${convertedCompanyId}?contact=${convertedContactId}` (or remove the misleading button if no contact-specific view exists). |

---

## Testing Strategy

After each wave:
1. `npm run typecheck` — 0 errors
2. `npm run test` — all tests pass
3. `npm run build` — succeeds

Key manual tests:
- **Wave 1:** Click "New Quote" with network disconnected. Verify current quote is NOT destroyed. Verify no "Another user is editing" error on new quotes.
- **Wave 2:** Load a quote from modal → verify correct quote shows on dashboard. Click "Back to Quote" from builder → verify same quote. Click "New Quote" from CrmTopBar → verify clean state.
- **Wave 3:** Hard refresh while logged in → verify no login flash. Log out as User A, log in as User B → verify no stale filters. Get role downgraded → verify toast + redirect.
- **Wave 4:** Submit quote for approval → check notification inbox of approver. Fail an approval action → verify button is still clickable for retry. As system_admin, check in-review quotes.
- **Wave 5:** Try to delete a company with linked quotes → verify warning. Convert a lead → verify navigation to new company. Drag kanban card as restricted role → verify error feedback.
- **Wave 6:** Press Ctrl+K, search for a quote ref → verify result. Deactivate a user with pending approvals → verify warning.

---

## Risks

1. **Wave 1 (createNewQuote reorder):** Changing the reset/RPC order is a correctness-critical change. Must verify auto-save doesn't fire during the gap between RPC return and reset.
2. **Wave 3 (isAuthLoading):** Adding a loading state to auth could affect all protected route rendering. Must verify no regressions in the loading flow.
3. **Wave 4 (notification interface change):** Changing `saveNotification` interface affects all callers — must update both `useNotifications` and `notificationHelpers`.
4. **Wave 5 (updateStage throws):** Changing from silent no-op to throwing will break `KanbanBoard.handleDragEnd` if not caught. Must add try/catch at all call sites.
5. **Wave 6 (GlobalSearch):** Adding quote/contact search requires new DB queries — must be efficient and not slow down the search UX.

---

## Out of Scope

- `LoginPage` email vs username input type (AUTH-4): Supabase `signInWithPassword` requires email format anyway. The `emailOrUsername` naming is aspirational. Low priority, tracked for future.
- `ApprovalDashboard` stats query limit of 200 (A6): Operational concern, not a user-facing bug. Can increase limit later.
- Per-session lock tokens for same-user multi-tab editing: Schema change, deferred from Phase 5.
