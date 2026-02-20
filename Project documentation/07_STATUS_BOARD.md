# 07 - Status Board

Last Updated: 2026-02-19
Owner: Documentation Maintainers
Source of Truth Inputs: `src/App.tsx`, `src/db/SupabaseAdapter.ts`, `src/db/DatabaseAdapter.ts`, `src/auth/permissions.ts`, `src/pdf/*`, `package.json`, test files

## Current System Snapshot

## Supabase-Only Hard Cutover (February 2026)

Status: Complete

Full migration from three-mode (local/hybrid/cloud) architecture to Supabase-only:
- Deleted 12 files (SyncQueue, ConflictResolver, HybridAdapter, LocalAdapter, IndexedDBRepository, useOnlineStatus, SyncStatusIndicator, migrateToSupabase, DataMigrationPanel, BackupRestore, seed, schema)
- Extended SupabaseAdapter with 14 new methods + guard rails
- Rewrote 7 repository factories as thin getDb() delegates
- Refactored 17 business flow files from db.* to adapter calls
- Replaced 12 useLiveQuery hooks with useState+useEffect
- Created company merge RPC function
- Removed dexie and dexie-react-hooks dependencies
- All grep gates pass, TypeScript compiles with 0 errors

## Go-Live Remediation Status (2026-02-19)

Status: Complete (addressed prior to hard cutover)

- Deep-link quote loading: fixed
- Autosave concurrency: fixed
- Financial basis: updated to landed-cost margin/IRR basis
- Permission overrides: explicit deny semantics implemented
- PDF line items: switched to current computed fields
- Logistics shipping persistence: persisted quote state with Supabase `shipping_entries` mapping
- CRM low-role visibility: restricted to assigned accounts
- Login throttling: progressive delay + temporary lockout + audit events

## Frontend Remediation Status (2026-02-19)

Status: Complete (2 low-priority items deferred)

- **P0 Blockers**: 5/5 completed
  - LinkedQuotes navigation, Builder export route, CompanyPicker create-new flow, Admin route authorization, Approval error logging
- **P1 High Priority**: 10/11 completed (FEF-P1-8 deferred - works correctly with HashRouter)
  - Button type safety, SearchableSelect type, CrmTopBar active state, sort header accessibility, aria-labels (12 buttons), ApprovalActionModal Escape, EditModal keyboard, numeric clamping, modal state reset, CRM preload error handling
- **P2 Polish**: 4/5 completed (FEF-P2-4 mostly deferred - style drift risk)
  - Kanban skeleton responsive, FleetBuilder text cleanup, LoadQuote table widths, modal backdrop close consistency
- **Remaining Risks**: None blocking. Deferred items are cosmetic/architectural preferences.

## Pre-Launch Defect Fixes (2026-02-19)

Status: Complete

All 5 defects (D-001 through D-005) identified during independent Claude and Codex audits have been resolved:

| ID | Severity | Fix Applied |
|----|----------|-------------|
| D-001 | P1 | `merge_companies` RPC updated with all 20 frontend fields (13 added) |
| D-002 | P1 | `isLockedByOther` now includes 1-hour stale lock timeout (`LOCK_STALE_MS`) |
| D-003 | P1 | `SupabaseTestPage` import and `/test-supabase` route removed from `App.tsx` |
| D-004 | P2 | `console.log/warn/error` migrated to `logger` in 7 priority hook/store files |
| D-005 | P2 | Extraneous `bcryptjs` and `@types/bcryptjs` removed via `npm prune` |

## Post-Launch Fixes (2026-02-19)

Status: Complete

| Fix | Description |
|-----|-------------|
| Supabase Data Seeding | Seeded `price_list_series` (81), `telematics_packages` (15), `container_mappings` (50), `settings` (9 defaults) via `scripts/seed-supabase-data.mjs` |
| Admin Defaults UI | Added Factory ROE, Discount %, Residual Truck % to `DefaultValuesEditor.tsx` + validators |
| Auto-Reload ErrorBoundary | `ErrorBoundary.tsx` auto-reloads on stale chunk errors after Vercel redeployments (prevents white-screen) |
| Quotes List Mapping | Fixed snake_case → camelCase mapping in `SupabaseAdapter.ts` for `listQuotes`, `searchQuotes`, `getQuotesByCompany`, `getQuoteRevisions` via `dbRowToStoredQuote()` |
| New Quote Stale Data | Fixed missing `await` on `createNewQuote()` in TopBar + set `lastSavedAt` baseline on quote load in `useAutoSave.ts`. Added dashboard reset, styled unsaved-changes modal, and builder NavigationGuard |

## Application and Routing

Status: Active

- SPA with `HashRouter`
- Protected route model with auth wrappers
- Admin route guard for admin-level roles
- Main business surfaces available: home, CRM, quotes, builder, admin, reports, notifications

## Data and Persistence

Status: Active (Cloud-Only)

- Supabase (PostgreSQL) is the single source of truth
- SupabaseAdapter is the sole database adapter
- Repository factories are thin delegates to getDb()
- No IndexedDB, no Dexie, no local storage for business data
- No mode switching (VITE_APP_MODE removed)

## Supabase Integration

Status: Active

- All CRUD operations execute directly against Supabase tables
- Supabase Auth is the only authentication path (no local bcrypt fallback)
- Company merge via Supabase RPC function
- Supabase connectivity testing utility available in local dev only (SupabaseTestPage; removed from production routes)
- Realtime and presence features available via feature flags

## Auth and Authorization

Status: Active

- Role model includes 6 roles (`sales_rep` through `system_admin`)
- Role hierarchy and permission matrix implemented
- Permission override mechanism implemented

## Quotation and Pricing Flow

Status: Active

- Quote dashboard and builder flows are present
- Calculation engine and validation modules are present
- Quote persistence, duplication, and revision workflows are present

## CRM Flow

Status: Active

- Company list/detail workflows present
- Contacts and activities workflows present
- Reports route present

## Admin Surface

Status: Active

- Admin layout and sections for users, approvals, templates, pricing, backup/restore, and audit are present

## PDF Output

Status: Active

- PDF generation pipeline exists under `src/pdf/*`
- Export workflows available from quote-related UI surfaces

## Shipping Auto-Suggestion Engine (2026-02-19)

Status: Complete

- Shipping suggestions calculated from fleet composition + container mappings + factory ROE
- Pure `generateShippingSuggestion()` function (no side effects, fully testable)
- `matchSeriesCode()` prefix-matcher extracted as standalone pure function
- ShippingEntry extended with `source` ('manual' | 'suggested'), `seriesCodes`, `suggestedAt`
- Stale detection: signature-based comparison (series+qty+ROE), not timestamp-based
- Per-series fit warnings and config-driven global logistics warnings
- Old quotes without new fields auto-default safely on hydration
- Data parity verification script: `scripts/verify-parity.mjs`

## QA Round 1 Fixes (2026-02-20)

Status: Complete

10 bugs fixed from Opus browser QA audit. 4 false positives rejected after code analysis.

| Bug | Fix | Priority |
|-----|-----|----------|
| BUG-005/006/007 | UserManagement snake_case→camelCase mapping | P0 |
| BUG-004 | Minimum margin validation gate (blocks 0% markup) | P0 |
| BUG-003 | SpecsViewerPanel multi-strategy model lookup | P1 |
| BUG-008 | AuditLogViewer user name resolution | P1 |
| BUG-013 | Cost field max-value constraints — **fully closed in Round 1.5** | P1 |
| BUG-002 | Reduced polling/page sizes — **fully closed in Round 1.5** | P1 |
| BUG-016 | Kanban empty state renders columns | P2 |
| BUG-019 | Sent/Expired status action buttons on ExportStep | P2 |
| BUG-014/015 | Page title + favicon | P3 |
| BUG-001 | getTableCounts HEAD request fallback | P2 |

False positives rejected: BUG-009 (revision numbering), BUG-010 (bell works), BUG-012 (RLS enforces roles), BUG-020 (sync queue deleted)

## QA Round 1.5 — Full Close (2026-02-20)

Status: Complete

Fully closed BUG-013 and BUG-002 after Codex review identified incomplete coverage.

| Area | What Was Done |
|------|---------------|
| **BUG-013: Cost clamps** | Defense-in-depth at 2 layers. UI: CostFieldGroup `max` prop + `isFinite` guard (12 fields), CommercialStep `numField` per-field max (11 fields). Store: `COMMERCIAL_MAX` map in `setCommercialField`, ceiling in `setClearingCharge`/`setLocalCost`. FleetBuilderPanel's 11 calls auto-protected by store. |
| **BUG-002: Polling/dedup** | Visibility-aware polling in all 3 interval hooks (useNotifications, usePresence, CrmTopBar→useApprovalCount). New shared `useApprovalCount` hook deduplicates CrmTopBar + PendingApprovalsWidget. All intervals pause when tab hidden, resume with immediate fetch on return. |

## TypeScript Strict-Mode Cleanup (2026-02-19)

Status: Complete (0 errors)

Eliminated all 114 TypeScript strict-mode errors:
- Root cause: `Relationships: []` missing from all 24 Supabase table definitions in `database.types.ts` (caused 65 `never` type errors)
- Framer Motion variant objects needed `as const` narrowing (42 errors)
- Unused imports/variables removed (19 errors)
- SupabaseAdapter type mismatches resolved (10 errors)
- Various hook/component type fixes (remaining errors)
- Zero runtime behavior changes; all fixes are type-annotation-only

## Automated Quality Gates

Status: Green

- `typecheck`: passing (0 errors with `strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- `test`: passing (122/122 tests across 6 test files)
- `build`: passing (clean production build)
- `lint`: available; current codebase may produce warnings/errors depending on branch state

## Documentation Status

Status: Canonicalized

- Canonical docs are in `Project documentation/`
- Canonical Supabase SQL is `Project documentation/SUPABASE_MASTER_CURRENT_STATE.sql`
- Historical markdown moved to `legacy documents/2026-02-doc-consolidation/`
- Historical Supabase SQL moved to `legacy documents/2026-02-doc-consolidation/sql/`
- `codex/` retained as remediation/audit context
- `claude-audit/` retained as additional historical audit context (non-canonical)
- `public/CONFIGURATION.md` retained for legacy compatibility; canonical truth is in `Project documentation/`

## Validation Basis

Status entries are based on direct codebase inspection and command-driven inventory checks during the current session.

## Out-of-Date Risk

Update this board whenever feature availability, route surface, Supabase schema, adapter method surface, or quality gate status changes.

## Related Docs

- `01_PROJECT_CONTEXT.md`
- `02_ARCHITECTURE_AND_DATA_MODEL.md`
- `03_SUPABASE_AND_SYNC.md`
- `04_OPERATIONS_RUNBOOK.md`
- `05_TESTING_AND_RELEASE_CHECKLIST.md`
- `06_SESSION_LOG.md`
