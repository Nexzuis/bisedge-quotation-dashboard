# PLAN-REVIEW.md — Critical Review of PLAN.md

Generated: 2026-02-21
Reviewer: Independent AI reviewer (Claude Opus 4.6)
Documents reviewed: `SPEC.md`, `PLAN.md`, `TECH-DEBT.md`, plus direct codebase verification.

**Note:** The original review request asked to also review `CURRENT-PLAN.md` (a detailed plan for the current phase). This file does not exist in the repository. Only `PLAN.md` (the overall phase plan) was available for review. A "current phase" review cannot be completed until `CURRENT-PLAN.md` is created.

---

## Methodology

Every claim in PLAN.md was verified against the actual source code. Line numbers, file paths, and code snippets are included. Where the plan understates, overstates, or omits something, the evidence is provided.

---

## 1. Contradictions With Spec

### 1.1 Plan understates HEAD count scope (Plan 1.6)

**Plan says:** `head: true` is in 3 files — `SupabaseAdapter.ts`, `useApprovalCount.ts`, `PendingApprovalsWidget.tsx`.

**Actual:** `head: true` appears in **5 files across 11 call sites:**

| File | Lines | Context |
|------|-------|---------|
| `src/db/SupabaseAdapter.ts` | 1240, 1400 | `getTableCounts()`, `countQuotesSince()` |
| `src/hooks/useApprovalCount.ts` | 28, 30 | Pending + review counts |
| `src/hooks/useCompanyMerge.ts` | 140, 141, 142 | Three count queries by company |
| `src/components/admin/approvals/ApprovalDashboard.tsx` | 515, 516 | Pending + review counts |
| `src/components/dashboard/widgets/PendingApprovalsWidget.tsx` | 118, 120 | Pending + review counts |

The plan misses `useCompanyMerge.ts` entirely (3 call sites) and undercounts `ApprovalDashboard.tsx`. Blast radius is ~40% larger than described.

### 1.2 Plan mischaracterises `verifyRequiredRpcs` (Plan 1.5)

**Plan says:** Constructor queries `pg_proc` and probes `generate_next_quote_ref`.

**Actual:** The method first tries `pg_proc` (always fails — PostgREST doesn't expose system catalogs). On failure, the fallback code at `SupabaseAdapter.ts` line 2001 **actually calls** `supabase.rpc('generate_next_quote_ref')`. If this RPC uses a Postgres sequence, **it burns a sequence number on every application startup, for every user session**. The code comment on line 1974 says "does NOT invoke the RPCs" — this is wrong; the comment describes only the happy path that always fails.

The plan describes this as "noisy errors" but the real issue is **data corruption** — sequence gaps in quote references.

### 1.3 "Validated As Already Addressed" items contain misleading claims

The plan's bottom section lists 5 items as already addressed. Two are misleading:

**"Loading states/skeleton behavior already exists on key pages":**
`src/components/dashboard/HomeDashboard.tsx` itself has zero internal loading states or skeletons — it immediately renders a grid of child widgets. It does have a route-level `<Suspense>` wrapper in `src/App.tsx:176` (covering the lazy-load of the component itself), and individual widgets (e.g. `MyQuotesWidget`) have their own spinner icons. However, the claim is partially valid for other pages: skeleton loaders do exist in `src/components/crm/reporting/ReportsPage.tsx` (lines 51, 616 — `SkeletonBlock` and `SectionSkeleton` components), `src/components/crm/CustomerListPage.tsx` (line 199 — kanban skeleton with shimmer), and `src/components/leads/LeadExplorerPage.tsx` (line 199 — card skeleton placeholders). The plan's claim is accurate for CRM/lead pages but misleading for the home dashboard specifically, which has no page-level skeleton or loading orchestration.

**"MyQuotes ownership filter already checks createdBy OR assignedTo":**
The filter is **client-side only**. `MyQuotesWidget.tsx` lines 40-48 call `db.listQuotes({ pageSize: 50 }, {})` with no server-side ownership filter, then filters in JavaScript. This means:
1. If a user's quotes aren't in the global top 50 most recent, the widget shows **zero quotes** (false empty state).
2. Every user downloads other users' quote data — a data leakage problem without RLS.
3. `QuoteStatsWidget.tsx` does the same with 200 quotes — stats are wrong if the DB has more.

---

## 2. Missing Edge Cases

### 2.1 `setCustomerInfo` pollution is a complete store takeover vector (Plan 2.2)

The plan describes this as "state pollution" — it is far worse. At `useQuoteStore.ts` lines 320-324:

```typescript
setCustomerInfo: (info) =>
  set((state) => {
    Object.assign(state, info);
    state.updatedAt = new Date();
  }),
```

The type signature accepts `Partial<QuoteState>`, which includes every field in the store. Calling `setCustomerInfo({ status: 'approved', version: 999, approvalChain: [] })` would succeed silently. Specific dangerous fields that can be overwritten:

| Field | Risk |
|-------|------|
| `id`, `quoteRef` | Corrupts quote identity |
| `status`, `approvalStatus` | Bypasses approval workflow |
| `version` | Breaks optimistic locking |
| `createdBy`, `assignedTo` | Changes ownership |
| `lockedBy`, `lockedAt` | Breaks pessimistic locking |
| `approvalChain` | Tampers with audit trail |
| `submittedBy`, `approvedBy` | Forges approval identity |
| `slots` | Overwrites entire fleet configuration |
| `factoryROE`, `customerROE`, `discountPct` | Manipulates pricing |
| `overrideIRR` | Bypasses IRR threshold checks |

The plan proposes "explicit field whitelist" but does not flag the severity. This is a security vulnerability, not just a code quality issue.

### 2.2 `approval_actions` is doubly dead (Plan 1.7)

Plan says the table has listeners but no writers. Verified: zero INSERTs into `approval_actions` exist anywhere in `src/`. But additionally, `useApprovalNotifications.tsx` (the listener file) is itself **never imported** — it is dead code subscribing to a table that is never populated. The plan doesn't note this.

### 2.3 Dead code scope is understated (Plan 3.7)

Plan lists 5 dead code candidates. Verified dead code includes:

| File | Status | Lines |
|------|--------|-------|
| `src/store/useAuthStore.v2.ts` | Dead re-export | 7 |
| `src/engine/leadScraperTypes.ts` | Dead types-only | 43 |
| `src/utils/notificationHelpers.ts` | Dead (5 exported functions, zero imports) | 157 |
| `src/hooks/useApprovalNotifications.tsx` | Dead (never imported + depends on never-populated table) | 202 |
| `src/components/admin/catalog/` | Empty directory | 0 |

The plan also misses dead store actions (`setManualContainerCost`, `setBatteryChemistryLock`, `setOverrideIRR`, `clearConfiguration`, `resetAll`) and dead exported functions (`usePresenceIndicator`, `useManualQuoteLock`, `calculateAttachmentCost`).

---

## 3. Security Concerns

### 3.1 RLS in Phase 3 is unacceptable phasing

The plan puts "Verify and enforce RLS policies" in Phase 3.5 — the third of four phases, labelled "Improve". Phase 1 and Phase 2 contain **zero security items** (2.5 is a UX bug, not security enforcement).

The situation based on what is observable in this repository:
- No RLS policies are defined in this repo
- SPEC.md (section 8.7) states: "RLS policies are not defined in this repository. Policy enforcement is expected in Supabase project configuration."
- If the live Supabase project has no RLS configured either, then any authenticated user could read/write/delete any record via the browser console
- The anon key is embedded in the client bundle (expected for Supabase, but only safe WITH RLS)
- **The plan does not verify or document the live RLS state** — this is an unverified assumption either way

Regardless of what exists in the live Supabase config, the plan should address RLS as a foundation item rather than a Phase 3 improvement. If RLS already exists live, this phase verifies and documents it. If it doesn't, this is a critical security gap. Either way, Phase 3 is too late to address it.

### 3.2 Five security vulnerabilities completely absent from plan

| Vulnerability | TECH-DEBT ref | Plan coverage |
|---------------|---------------|---------------|
| Auth role in localStorage is tamperable — users can set `role: 'system_admin'` before async `checkAuth()` re-validates | TD-4.6 | **Not mentioned** |
| IDOR on all entity access — any user can access any entity by UUID | TD-4.4 | **Not mentioned** |
| Weak password policy — 6 chars minimum, no complexity, inconsistent with 8-char reset dialog | TD-4.7 | **Not mentioned** |
| Unsanitized `customerName` in `listQuotes` ilike — SQL wildcard injection | TD-4.8 | **Not mentioned** |
| No clickjacking protection headers (`X-Frame-Options`, CSP `frame-ancestors`) | TD-4.9 | **Not mentioned** |

### 3.3 Client-side user creation understated

Plan 3.5 mentions "Move admin user-create/admin-password operations to server-side" as one bullet among three. The actual severity: anyone who extracts the anon key from the JS bundle can call `auth.signUp()` and, if no RLS exists on the live `public.users` table, insert a `system_admin` row. This is a potential privilege escalation path, not an improvement task. The risk depends on the live Supabase RLS configuration, which is not documented in this repo.

### 3.4 Seed script fallback to anon key for privileged operations

SPEC.md section 7.2 documents that `scripts/seed-leads.mjs` falls back to `VITE_SUPABASE_ANON_KEY` when `SUPABASE_SERVICE_KEY` is not set. The spec itself notes this is "not recommended for privileged seed ops." The plan does not mention this — a seed script running with the anon key may fail silently or, depending on RLS configuration, skip rows it should be writing.

---

## 4. Performance Issues

### 4.1 Most performance issues not covered in the plan

Plan 3.3 ("Optimize dashboard data loading") addresses overlapping widget fetches — this is the plan's only performance item. The following **CRITICAL** and **IMPORTANT** performance issues are absent:

**Unbounded data fetches (CRITICAL — TD-7.1):**
- `listCompanies()` at `SupabaseAdapter.ts:842` — fetches ALL companies, no LIMIT. Called from GlobalSearch on every keystroke.
- `listUsers()` at line 564 — fetches ALL users.
- `QuotesListPage.tsx:69` — `pageSize: 500`, then filters client-side.
- `QuoteStatsWidget.tsx:49` — `pageSize: 200` just to count statuses.

**Whole-store Zustand subscriptions (CRITICAL — TD-7.2):**
8 occurrences across 7 files subscribe to the entire `useQuoteStore`, causing re-renders on every keystroke:

| File | Line | Pattern |
|------|------|---------|
| `useWorkflowProgress.ts` | 16 | `useQuoteStore()` — no selector |
| `useQuoteLock.ts` | 37, 194 | Destructured without selector |
| `ReviewSummaryStep.tsx` | 12 | `useQuoteStore((s) => s)` |
| `ExportStep.tsx` | 17 | `useQuoteStore((s) => s)` |
| `TopBar.tsx` | 22 | `useQuoteStore((state) => state)` |
| `ApprovalWorkflowPanel.tsx` | 53 | `useQuoteStore((state) => state)` |
| `QuoteGeneratorPanel.tsx` | 25 | `useQuoteStore((state) => state)` |

`TopBar.tsx` is rendered on every page — every user input triggers a full re-render of the top bar. `useWorkflowProgress.ts` calls `getQuoteTotals()` (expensive IRR/NPV/commission calculations) on every re-render.

**Zero React.memo across 134 components (CRITICAL — TD-7.3):**
No component in the entire codebase uses `React.memo`. Combined with whole-store subscriptions, parent re-renders cascade through the entire component tree. `getQuoteTotals()` and `getSlotPricing()` (13 arithmetic steps per slot) are called directly in render paths without `useMemo`.

**N+1 queries (IMPORTANT — TD-7.4):**
`PendingApprovalsWidget.tsx` lines 80-111 fetch pending quotes, then call `getUser(submittedBy)` per quote in `Promise.all`. Lines 229-239 call `getUsersByRole(role)` sequentially per role.

**Missing debounce (IMPORTANT — TD-7.6):**
`CustomerListPage.tsx:146` and `LeadExplorerPage.tsx:142` fire Supabase queries on every keystroke. `GlobalSearch.tsx` and `QuotesListPage.tsx` correctly debounce — inconsistent.

### 4.2 Plan's only performance item addresses the least severe issue

Plan 3.3 proposes a shared `useHomeData()` hook to deduplicate widget fetches. This is the least impactful of the known performance problems. The unbounded fetches, re-render storms, and missing memoization are all more severe and completely absent.

---

## 5. Simpler Approaches

### 5.1 Items 1.1-1.4 should be one item: Auto-generate `database.types.ts`

The plan has four separate items for four separate schema mismatches. All four have the same root cause: `src/lib/database.types.ts` is hand-written (line 5: `TODO: Replace with auto-generated types`).

**PLAN.md never mentions auto-generation.** Zero hits for "auto-gen", "supabase gen", "npx supabase", or "codegen". All four items propose manual alignment:
- 1.1: "Align DB writes/reads + interfaces to one column shape"
- 1.2: "Pick one canonical DB shape... Update adapter mappings"
- 1.3: "Verify live DB... add it to typed schema"
- 1.4: "Align audit read mapping with actual DB columns"

The simpler approach: run `npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts`. This resolves all four mismatches at once, prevents future drift, and takes 30 seconds. The adapter/interface alignment work is still needed, but the type file itself should never be manually maintained.

### 5.2 Dead approval notifications path has a simpler fix than Plan 1.7 suggests

Plan 1.7 offers two options: persist `approval_actions` rows, or switch listeners to `quotes` updates. Since `useApprovalNotifications.tsx` is never imported anywhere, Option B is simpler: delete the dead listener file entirely, rely on `quotes.approval_chain` changes (which already happen), and write a new lightweight listener if needed. The current code is triply dead (not imported, listens to an empty table, the table has no writers).

### 5.3 Plan 3.7 dead code list is conservative

The plan lists 5 dead candidates. Rather than enumerating candidates manually, the simpler action: run an unused-exports analysis tool (e.g. `ts-prune` or `knip`) and delete everything it flags.

---

## 6. Unverified Assumptions

### 6.1 Plan assumes `database.types.ts` column names match the live Supabase schema

Items 1.1 and 1.2 say "pick one canonical DB shape (from live Supabase schema)" — but the plan never verifies what the live schema actually is. The actions assume `commission_pct` is correct because it's in `database.types.ts`, but `database.types.ts` is hand-written and could itself be wrong. The adapter's `commission_rate` might be the actual live column. Without connecting to the live DB, this is a coin flip.

### 6.2 Plan assumes `users.username` may or may not exist in live DB

Item 1.3 correctly says "Verify live DB: does `users.username` actually exist?" — this is the only item that admits the types file might not match reality. But items 1.1, 1.2, and 1.4 should apply the same verification-first approach.

### 6.3 Plan assumes RPC fallback is sufficient for quote save (Plan 1.5)

Item 1.5 proposes "Add a controlled fallback path for quote save when RPC is unavailable." But the `save_quote_if_version` RPC provides atomic version checking, row locking, and auth validation. A "fallback" that bypasses these protections would remove the concurrency guarantees. The plan should acknowledge that the fallback trades safety for availability, or explicitly state that the fallback should be a clear error with recovery instructions, not a degraded write path.

### 6.4 Plan's "Validated As Already Addressed" items were not verified

As documented in section 1.3 above, at least two of the five "validated" items are partially misleading:
- "Loading states/skeletons" — skeletons exist on CRM/lead pages but not on the home dashboard; the claim is unevenly true
- "MyQuotes filter" — client-side only; hides data leakage and false empty state bugs

---

## 7. Missing Database Indexes/Constraints

PLAN.md contains zero discussion of database indexes, constraints, foreign keys, or query performance at the database level.

### 7.1 No foreign key enforcement mentioned

SPEC.md section 3.3 documents 25+ logical relationships (`quotes.created_by -> users.id`, etc.) but notes that `database.types.ts` has empty `Relationships` arrays. The plan never proposes adding foreign key constraints. Without FKs, orphaned records accumulate silently (e.g. deleting a user leaves orphaned `quotes.created_by` references).

### 7.2 No index discussion for query patterns

The codebase runs these query patterns with no index discussion:
- `quotes` filtered by `status` + `approval_status` — approval dashboard queries
- `quotes` filtered by `created_by` or `assigned_to` — ownership queries
- `companies` filtered by `pipeline_stage` — CRM pipeline queries
- `leads` filtered by `qualification_status` — lead explorer queries
- `audit_log` filtered by `entity_type` + `entity_id` — audit queries
- `notifications` filtered by `user_id` + `is_read` — notification inbox

Without composite indexes, these become full table scans as data grows.

### 7.3 No unique constraints for business rules

- `quote_ref` should be unique (currently enforced only by sequence, not by constraint)
- `users.email` uniqueness is only enforced in Supabase Auth, not in the `public.users` table
- `companies.registration_number` and `companies.vat_number` have no uniqueness constraints

---

## 8. API Endpoints That Don't Match Spec

### 8.1 `approval_actions` spec vs implementation mismatch

SPEC.md section 4.3 documents realtime channels listening to `approval_actions` INSERT events. Section 4.2 lists it as a SELECT-only table ("client does not write this table"). The plan acknowledges this disconnect (1.7) but the spec itself is contradictory — it documents channels that can never fire as part of the "current" implementation.

### 8.2 `quote_versions` table never used

SPEC.md section 4.2 notes: "Table is typed but not currently used by implemented quote save/list flows." Neither PLAN.md nor TECH-DEBT.md addresses what to do with this table — keep it for future use, or drop it to reduce schema surface.

### 8.3 `quote_collaborators` table never used

Same as 8.2. The table is typed in `database.types.ts`, has defined relationships in the spec, but zero code reads or writes it. Not mentioned in the plan.

---

## 9. Items Completely Absent From Plan

These issues from TECH-DEBT.md have no corresponding plan item:

### CRITICAL (should block production)

| # | Issue | TECH-DEBT ref |
|---|-------|---------------|
| 1 | Whole-store Zustand subscriptions causing re-render storms (8 occurrences, 7 files) | TD-3.2, TD-7.2 |
| 2 | Expensive computed getters (`getQuoteTotals`, `getSlotPricing`) called in render path without `useMemo`, zero `React.memo` across 134 components | TD-7.3 |
| 3 | Unbounded data fetches — `listCompanies()` ALL, `listUsers()` ALL, `QuotesListPage` 500, `QuoteStatsWidget` 200 | TD-7.1 |
| 4 | Auto-generation of `database.types.ts` — root cause of all 4 Phase 1 items | TD-6.1 |

### IMPORTANT (significant risk or maintenance burden)

| # | Issue | TECH-DEBT ref |
|---|-------|---------------|
| 5 | Auth role persisted in localStorage is tamperable (race window) | TD-4.6 |
| 6 | IDOR on all entity access — any user can access any entity by ID | TD-4.4 |
| 7 | ~30 empty `catch {}` blocks silently swallow errors | TD-2.2 |
| 8 | Hooks expose no loading or error state to components | TD-2.4 |
| 9 | N+1 query patterns in `PendingApprovalsWidget` | TD-7.4 |
| 10 | Missing debounce on `CustomerListPage` and `LeadExplorerPage` search | TD-7.6 |
| 11 | Weak password policy (6 chars, no complexity, inconsistent with reset dialog 8 chars) | TD-4.7 |
| 12 | Unsanitized `customerName` in `listQuotes` ilike (SQL wildcard injection) | TD-4.8 |
| 13 | `validateQuote`/`validateQuoteSync` — 240-line identical copy-paste | TD-1.1 |
| 14 | No test infrastructure — zero test utilities, mocks, fixtures, or component tests | TD-8.3, TD-8.5 |
| 15 | 30+ `as any` / `as unknown as` type casts masking real type errors | TD-3.3 |
| 16 | Quote validity "30 days" hardcoded in 9+ locations | TD-9.4 |

---

## 10. Recommendations

### Re-phase the plan

| Proposed Phase | Content |
|----------------|---------|
| **Phase 0: Security Foundation** | RLS on all tables. Server-side user creation. Auto-generate `database.types.ts`. These are prerequisites — everything else is building on sand without them. |
| **Phase 1: Stabilise (Fix)** | Current Phase 1 items (1.1-1.7), but simplified after auto-gen types resolves 1.1-1.4's root cause. Add sanitization fixes (TD-4.8). |
| **Phase 2: Stabilise (Bugs)** | Current Phase 2 items (2.1-2.6). Expand 2.6 to cover the 9 critical untested modules, not just 3 regression tests. Add `setCustomerInfo` fix with explicit security framing. |
| **Phase 3: Performance** | New dedicated phase. Fix whole-store subscriptions, add `useMemo`/`React.memo`, add server-side pagination, fix N+1 queries, add debounce to search inputs. |
| **Phase 4: Improve** | Current Phase 3 items minus security (moved to Phase 0) and minus performance (moved to Phase 3). |
| **Phase 5: New Features** | Current Phase 4. |

### Add missing items to plan

1. Auto-generate `database.types.ts` as the FIRST action in Phase 0
2. Add all 5 missing security items from section 3.2 above
3. Add dedicated performance phase with all 5 items from section 4.1
4. Expand test coverage from 3 targeted tests to systematic coverage of the 9 untested critical modules
5. Add database index/constraint review as a Phase 0 item
6. Decide fate of `quote_versions` and `quote_collaborators` tables

### Fix "Validated As Already Addressed" section

- Change "Loading states/skeleton behavior already exists on key pages" to "Skeleton loaders exist on CRM ReportsPage, CustomerListPage, and LeadExplorerPage. Home dashboard has route-level Suspense and per-widget spinners but no page-level skeleton. Coverage is partial, not universal."
- Change "MyQuotes ownership filter" to "MyQuotes uses client-side ownership filter after fetching top N quotes globally — server-side filtering not implemented"

---

End of review.
