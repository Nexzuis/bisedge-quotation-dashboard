# Codex Confirmation Report

> Item-by-item verification of all 14 findings from the Codex readiness audit.
> All findings were **independently confirmed** by reading the actual source code.

---

## P0 — Release Blockers

### P0-1: Quote Deep Links Broken — CONFIRMED

**Codex said:** Navigation calls generate `/quote?id=<uuid>` but no code reads the `?id=` parameter.

**Our verification (WS-A-1):**
- Found **8 navigation sites** that generate `navigate('/quote?id=${quote.id}')`:
  - `src/components/dashboard/widgets/PendingApprovalsWidget.tsx:292,328`
  - `src/components/admin/approvals/ApprovalDashboard.tsx:326,380`
  - `src/components/dashboard/widgets/MyQuotesWidget.tsx:87`
  - `src/components/quotes/QuotesListPage.tsx:254`
  - `src/components/notifications/NotificationBell.tsx:214`
  - `src/components/notifications/NotificationsPage.tsx:160`
- The `/quote` route at `src/App.tsx:218-222` renders `<Dashboard />` which has no `useSearchParams()` call
- `loadFromDB(id)` exists in `src/hooks/useQuoteDB.ts:31-46` but is only called from `LoadQuoteModal`
- Instead, `loadMostRecent()` fires globally at `src/App.tsx:98-118` regardless of route

**Verdict: FULLY CONFIRMED** — All 8 deep link sources are broken. Users always get the most recent quote.

---

### P0-2: Autosave Race Condition (Multiple Instances) — CONFIRMED

**Codex said:** Multiple `useAutoSave()` instances create concurrent save operations.

**Our verification (WS-A-2):**
Found **4 concurrent `useAutoSave()` instances** in the active component tree:

| # | Location | File:Line |
|---|----------|-----------|
| 1 | AppContent (direct) | `src/App.tsx:72` |
| 2 | useUnsavedChanges (indirect) | `src/hooks/useUnsavedChanges.ts:9` |
| 3 | TopBar | `src/components/layout/TopBar.tsx:28` |
| 4 | ExportStep (on /builder step 7) | `src/components/builder/steps/ExportStep.tsx:23` |

Each instance creates independent `isSavingRef`, `saveTimeoutRef`, and `lastUpdatedAtRef`. The per-instance `isSavingRef` mutex does NOT protect across instances. On the `/quote` route, 3 instances race; on `/builder` at step 7, 3 instances race.

**Verdict: FULLY CONFIRMED** — Codex said "triple mount"; we found it is actually 3-4 depending on route.

---

### P0-3: Logistics Data Not Persisted to Store — CONFIRMED

**Codex said:** Shipping/logistics data entered in the UI is not saved.

**Our verification (WS-F-7):**
- `src/components/panels/LogisticsPanel.tsx:22-24` uses `useState` (local component state), not Zustand
- Container entries, shipping costs, and logistics calculations are **never written to the store**
- No corresponding fields exist in `useQuoteStore` for container allocation results
- The `CostsStep` in the builder manages clearing charges that DO persist, but these are a different data model
- The LogisticsPanel data is lost on any navigation or page refresh

**Verdict: FULLY CONFIRMED** — LogisticsPanel is a completely disconnected data island.

---

### P0-4: CRM Access Control Failures — CONFIRMED

**Codex said:** CRM pages lack role-based access control; all users see all data.

**Our verification (WS-D-2, D-3, D-4):**

**WS-D-2 — CustomerListPage defaults to showing all companies:**
- `src/components/crm/CustomerListPage.tsx:27` — `showMyAccounts` defaults to `false`
- No role-based initialization on mount
- A `sales_rep` sees every company in the CRM by default

**WS-D-3 — No ownership check on CustomerDetailPage:**
- `src/components/crm/CustomerDetailPage.tsx:28-33` — Loads any company by route ID with zero ownership verification
- A `sales_rep` can navigate directly to `/customers/:id` for any company

**WS-D-4 — CRM access control is UI-only:**
- `src/hooks/useCompanies.ts:9-16` calls `repo.list()` with no user filter
- `src/db/SupabaseAdapter.ts:800-817` fetches ALL companies with `select('*')`, no `assigned_to` filter
- Neither local nor cloud mode has repository-level access control

**Verdict: FULLY CONFIRMED** — Complete CRM data exposure to all authenticated users.

---

### P0-5: Backup/Restore Coverage Gaps — CONFIRMED

**Codex said:** Backup misses several database stores and has restore issues.

**Our verification (WS-D-5, D-6, D-7, H-8):**

**WS-D-5/H-8 — Missing stores (7 total):**
- Backup exports 13 of 20 Dexie stores
- Missing: `batteryModels`, `priceListSeries`, `telematicsPackages`, `containerMappings`, `notifications`, `forkliftModels`, `attachments`
- Evidence: `src/components/admin/backup/BackupRestore.tsx:60-71` vs `src/db/schema.ts:368-391`

**WS-D-6 — User restore handling:**
- Export replaces `passwordHash` with `'[EXCLUDED]'` (`BackupRestore.tsx:74-78`)
- Import silently skips users (`BackupRestore.tsx:255-256`) but shows user count in preview
- On fresh install + restore, no users = no login ability

**WS-D-7 — No schema version validation:**
- Backup version is hardcoded `'1.0.0'` (`BackupRestore.tsx:81`)
- Import only checks `data.version` for truthiness, not compatibility
- No migration path for old backups into newer schema

**Verdict: FULLY CONFIRMED** — 7 stores missing, misleading user restore UX, no version validation.

---

## P1 — High Risk

### P1-1: Legacy Battery Field Still Active — CONFIRMED

**Codex said:** `batteryId` is deprecated but still drives real logic.

**Our verification (WS-C-13):**
- `src/types/quote.ts:144` marks `batteryId` as deprecated
- But it is actively used in 5 files:
  - `src/store/useQuoteStore.ts:341,344` — battery chemistry lock logic
  - `src/components/panels/SpecsViewerPanel.tsx:39` — battery lookup
  - `src/hooks/useWorkflowProgress.ts:31` — workflow step completion
  - `src/pdf/generatePDF.tsx:70-73` — PDF generation

**Verdict: FULLY CONFIRMED** — Removing `batteryId` without migration would break 4 features.

---

### P1-2: Auth Seed Inconsistencies — CONFIRMED

**Codex said:** Default admin password handling has security issues.

**Our verification (WS-C-11, D-12):**
- `src/db/seed.ts:131-136` — When no env var set, generates random password and logs it to `console.warn` in plaintext
- The password is styled with colored CSS formatting, making it MORE visible in console
- Any browser extension, remote logging service, or shared screen could capture it
- bcrypt hash uses cost factor 10 (adequate but minimum)

**Verdict: FULLY CONFIRMED** — Plaintext admin password in console output.

---

### P1-3: ROE Mismatch (19.73 vs 20.60) — CONFIRMED

**Codex said:** Rate of Exchange values are inconsistent across code and documentation.

**Our verification (WS-C-9):**
Found **three different ROE values** across the codebase:

| Source | Value |
|--------|-------|
| Code (seed.ts:189-190, configStore:30-31) | **19.73** |
| Documentation (WHAT_THIS_TOOL_IS.md, CONFIGURATION.md, PHASE5) | **20.60** |
| builder.md (factoryROE) | **19.20** |
| Test fixture (serialization.test.ts:21) | **20.60** |

The test fixture validates a different ROE than what the system actually uses in production.

**Verdict: FULLY CONFIRMED** — Three divergent ROE values. Every pricing calculation depends on this.

---

### P1-4: Supabase Module-Level Throw — CONFIRMED

**Codex said:** `supabase.ts` throws at module evaluation time if env vars are missing, blocking local mode.

**Our verification (WS-H-1):**
- `src/lib/supabase.ts:16-30` — Module-level `throw new Error(...)` if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing
- **Import chain:** `DatabaseAdapter.ts` → `SupabaseAdapter.ts` → `supabase.ts` (static imports)
- Even in `VITE_APP_MODE=local`, the module is eagerly evaluated
- **Currently mitigated** by `.env.local` containing real Supabase credentials
- 13 files across `src/` directly import from `../lib/supabase`

**Verdict: CONFIRMED (mitigated by .env.local)** — Any new developer without `.env.local` gets an immediate crash.

---

### P1-5: Lint Errors Blocking CI — CONFIRMED

**Codex said:** 72 ESLint errors prevent clean CI.

**Our verification (validation snapshot):**
- Ran `npx eslint src/` — confirmed **72 errors, 553 warnings**
- Matches Codex's count exactly

**Verdict: FULLY CONFIRMED**

---

## P2 — Medium Risk

### P2-1: Serialization Edge Cases — CONFIRMED

**Codex said:** `quoteToStored`/`storedToQuote` round-trip has edge cases.

**Our verification (WS-C-2, C-3):**
- **WS-C-2:** `approvalChain` serialization inconsistent — serialize uses `|| []` (line 147), deserialize handles both string and array (line 231). v5 migration may store raw arrays instead of JSON strings.
- **WS-C-3:** Slots deserialization does NOT merge missing fields with defaults. If a slot was saved in an older version lacking newer fields (e.g., `telematicsPackageId`), those fields are `undefined`, causing NaN in calculations.
- **WS-C-4 (NEW):** Two divergent `createEmptySlot()` implementations with different defaults — serialization version uses `discountPct: 0`, store version uses `discountPct: 66`.

**Verdict: FULLY CONFIRMED** — Plus additional edge cases found.

---

### P2-2: Schema Migration Gaps — CONFIRMED

**Codex said:** V4 migration has name-splitting and quote-linking edge cases.

**Our verification (WS-C-5, C-6):**
- **WS-C-5:** Single-word names like "Sipho" produce `firstName: "Sipho"`, `lastName: ""` (`schema.ts:264-266`)
- **WS-C-6:** Quote-company matching uses exact string equality after lowercasing but no `.trim()` — trailing whitespace breaks linking (`schema.ts:284`)
- **WS-C-7 (NEW):** Customer address array fields (city, province, postal) are ALL set to empty strings even if the original address contained that data

**Verdict: FULLY CONFIRMED** — Plus additional migration issues found.

---

### P2-3: Presence Feature Partially Implemented — CONFIRMED

**Codex said:** `quote_presence` infrastructure exists but is guarded by feature flags.

**Our verification (WS-H-2, H-3):**
- **WS-H-2:** `usePresence.ts:31` has correct guards: `if (!user || !enabled || !isCloudMode() || !FEATURES.presence) return;`
- **WS-H-3:** `useQuoteLock.ts` has a full locking implementation but is **never imported** — zero call sites found. Orphaned cloud locks have no TTL or cleanup mechanism.
- The `quote_presence` SQL table IS properly defined in `SUPABASE_SCHEMA.sql:211-217`

**Verdict: FULLY CONFIRMED** — Presence has correct guards. Lock hook is fully dead code.

---

## P3 — Low Risk

### P3-1: Dead Code (useAuthStore.v2) — CONFIRMED

**Codex said:** `useAuthStore.v2.ts` is unused dead code.

**Our verification (WS-E-8):**
- `src/store/useAuthStore.v2.ts:1-7` — File contains only a re-export: `export { useAuthStore } from './useAuthStore';`
- Zero import matches for `useAuthStore.v2` across the entire `src/` directory
- All 17+ consumers import from `useAuthStore.ts` directly

**Verdict: FULLY CONFIRMED** — Safe to delete.

---

## Summary

| Status | Count |
|--------|-------|
| Fully Confirmed | 13 |
| Confirmed (mitigated) | 1 (P1-4) |
| Rejected | 0 |
| **Total** | **14/14 confirmed** |

Every single Codex finding was validated with independent code evidence. No findings were rejected.

---

*Generated by Claude Code (Opus 4.6) — Codex Confirmation Report*
