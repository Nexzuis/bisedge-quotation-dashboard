# Production Readiness Audit Report (`codex/readiness-audit-report.md`)

## Executive Summary
The codebase is functional and deployable, but not yet hardened for a 30-user company rollout.

Validation snapshot:
- `typecheck`: pass
- `build`: pass
- `test`: pass (3 files, 90 tests)
- `lint`: fail (72 errors, 553 warnings)

Most critical gaps are wiring correctness, data integrity boundaries, and role enforcement consistency.

## Severity Key
- P0: release blocker / correctness or data safety risk
- P1: high risk for production operations
- P2: medium risk / scalability and maintainability issues
- P3: low risk / cleanup and consistency

## P0 Findings

### P0-1: Quote deep links (`/quote?id=...`) are not wired to load that quote
Evidence:
- Route exists: `src/App.tsx:218`
- App only auto-loads most recent quote after auth: `src/App.tsx:105`
- Multiple pages navigate with `?id=`:
  - `src/components/quotes/QuotesListPage.tsx:254`
  - `src/components/dashboard/widgets/MyQuotesWidget.tsx:87`
  - `src/components/notifications/NotificationBell.tsx:214`
  - `src/components/admin/approvals/ApprovalDashboard.tsx:326`
  - `src/components/dashboard/widgets/PendingApprovalsWidget.tsx:292`

Impact:
- User clicks a specific quote but dashboard can open with stale/current in-memory quote.
- Approval/review workflows can target wrong record.

Repro:
1. Open quotes list.
2. Click a non-most-recent quote.
3. Route changes to `/quote?id=<id>`.
4. Loaded quote is not guaranteed to match `<id>`.

Fix direction:
- Add query-param loader on `/quote` route mount.
- If `id` present, call `loadFromDB(id)` and fail with visible error if missing.

Acceptance test:
- Any navigation to `/quote?id=<id>` loads that exact quote (ID check visible in UI state).

---

### P0-2: Multiple autosave subscriptions can race and cause save conflicts
Evidence:
- `useAutoSave()` mounted in:
  - `src/App.tsx:72`
  - `src/components/layout/TopBar.tsx:28`
  - `src/hooks/useUnsavedChanges.ts:9`
  - `src/components/builder/steps/ExportStep.tsx:23`
- `useAutoSave` writes on `updatedAt` changes and calls repository save: `src/hooks/useAutoSave.ts:69`, `src/hooks/useAutoSave.ts:111`

Impact:
- Duplicate writes, unnecessary DB load, version conflict risk, noisy save states.

Repro:
1. Edit quote fields quickly.
2. Observe overlapping autosave state transitions and occasional conflict messaging/extra saves.

Fix direction:
- Make autosave singleton (provider-level service or store-managed background task).
- Consumers read status only; no per-component hook with independent timers.

Acceptance test:
- Exactly one save operation per debounce window, regardless of UI surface count.

---

### P0-3: Logistics shipping costs are local UI state only and not persisted in quote data
Evidence:
- Local component state used for container lines: `src/components/panels/LogisticsPanel.tsx:22`
- Totals computed only from local state: `src/components/panels/LogisticsPanel.tsx:47`
- Store API placeholder not implemented: `src/store/useQuoteStore.ts:497`

Impact:
- Shipping values entered by user do not persist to quote record.
- Reload, handoff, and PDF consistency are at risk.

Repro:
1. Enter shipping data in Logistics panel.
2. Save and reload quote.
3. Shipping entries are lost.

Fix direction:
- Introduce persisted shipping structure in `QuoteState`.
- Bind Logistics panel inputs directly to store actions.
- Include shipping values in pricing and PDF serialization.

Acceptance test:
- Shipping entries survive save/load/duplicate/revision and appear in generated outputs.

---

### P0-4: CRM access control does not enforce own-leads-only behavior for low roles
Evidence:
- `showMyAccounts` defaults to false: `src/components/crm/CustomerListPage.tsx:27`
- Filtering by assignee only happens when toggle enabled: `src/components/crm/CustomerListPage.tsx:112`
- Customer detail loads by route ID without ownership check: `src/components/crm/CustomerDetailPage.tsx:30`

Impact:
- `sales_rep` and `key_account` can view records beyond assigned accounts by default.
- Violates stated role policy.

Repro:
1. Login as low-privilege role.
2. Open `/customers` with default toggle state.
3. See unassigned/all records.

Fix direction:
- Enforce role-based filtering in repository/adapter and page load paths.
- Default to "my accounts" for low roles and remove bypass.
- Block direct `/customers/:id` access if not owner/assignee (unless manager+).

Acceptance test:
- Low roles can only list and open assigned companies.

---

### P0-5: Backup/restore does not cover all active DB stores
Evidence:
- Export tables are limited to a subset: `src/components/admin/backup/BackupRestore.tsx:60` to `src/components/admin/backup/BackupRestore.tsx:71`
- Replace-mode clear only clears subset: `src/components/admin/backup/BackupRestore.tsx:202` to `src/components/admin/backup/BackupRestore.tsx:213`
- Active schema includes additional stores, e.g. notifications and catalog tables:
  - `src/db/schema.ts:390` (notifications)
  - `src/db/schema.ts:382` (priceListSeries)
  - `src/db/schema.ts:383` (telematicsPackages)
  - `src/db/schema.ts:384` (containerMappings)
  - `src/db/schema.ts:375` (batteryModels)

Impact:
- Full backup claim is inaccurate.
- Restore can silently omit operational data.

Fix direction:
- Move backup scope to schema-driven table manifest.
- Include all runtime-critical stores and version metadata.
- Validate import compatibility with schema version.

Acceptance test:
- Round-trip backup+restore reproduces full store counts and sampled records across all stores.

## P1 Findings

### P1-1: Legacy model/battery field coupling causes workflow and specs inconsistencies
Evidence:
- Store writes `modelCode = modelName`: `src/store/useQuoteStore.ts:429`
- Workflow completion still checks `batteryId`: `src/hooks/useWorkflowProgress.ts:31`
- Specs panel resolves battery by `batteryId`: `src/components/panels/SpecsViewerPanel.tsx:39`

Impact:
- Progress step can remain incomplete despite configured local battery fields.
- Specs panel can show missing/inaccurate battery details.

Fix direction:
- Standardize canonical identifiers (`modelMaterialNumber`, separate display name).
- Replace legacy `batteryId` checks with active battery fields used by current flow.

---

### P1-2: Authentication and defaults are inconsistent with published operational context
Evidence:
- Seeded local admin user is `admin@bisedge.com`: `src/db/seed.ts:145`
- Seed can generate random admin password and only log it: `src/db/seed.ts:135`
- Project context documents different default account (`nexzuis@gmail.com`): `WHAT_THIS_TOOL_IS.md:170`

Impact:
- Onboarding and disaster recovery confusion.
- Offline-first login assumptions break on fresh environments.

Fix direction:
- Align seed credentials strategy with documented operational account model.
- Avoid random bootstrap credentials unless persisted through explicit setup flow.

---

### P1-3: Default ROE values in code differ from documented business defaults
Evidence:
- Code defaults: `19.73` (`src/store/useConfigStore.ts:30`, `src/store/useConfigStore.ts:31`)
- Documentation default: `20.60` (`WHAT_THIS_TOOL_IS.md:171`)

Impact:
- Financial outputs may diverge from expected business baseline.

Fix direction:
- Establish single source of truth for default settings.
- Enforce config checksum/version and display active defaults in admin.

---

### P1-4: Local mode startup still depends on Supabase env variables at module load
Evidence:
- Throws when URL/key missing: `src/lib/supabase.ts:18`, `src/lib/supabase.ts:26`

Impact:
- Local/offline deployments can fail hard if env vars are absent.

Fix direction:
- Lazy-init Supabase client only in cloud/hybrid execution paths.
- Allow true local mode bootstrap without Supabase env dependency.

---

### P1-5: Lint quality gate is currently broken at scale
Evidence:
- `npm run lint` -> 72 errors, 553 warnings.
- Rule concentration:
  - `no-console`: 370
  - `no-explicit-any`: 153
  - `no-unused-vars`: 50
  - `react-hooks/exhaustive-deps`: 29
  - `react-hooks/set-state-in-effect`: 10

Impact:
- High regression probability and weak maintainability under team growth.

Fix direction:
- Triage lint backlog in phases: correctness errors first, then hook safety, then typing and logging policy.

## P2 Findings

### P2-1: Sync queue persistence still uses localStorage temporary path
Evidence:
- Temporary comments + implementation:
  - `src/sync/SyncQueue.ts:424`
  - `src/sync/SyncQueue.ts:437`

Impact:
- Queue size and durability constraints under heavier usage.

Fix direction:
- Move queue and permanent-failure blocklist to IndexedDB store with retention policy.

---

### P2-2: Build output indicates heavy payload and ineffective split expectations
Evidence (build output):
- `assets/index-*.js` about 3.9 MB
- `assets/vendor-pdf-*.js` about 1.57 MB
- Dynamic/static import overlap warnings for key modules

Impact:
- Slower first load and higher memory pressure.

Fix direction:
- Route-level and feature-level lazy boundaries for heavy surfaces (PDF/admin/xlsx).
- Resolve mixed static/dynamic import patterns for intended chunking.

---

### P2-3: Test coverage is narrow relative to app surface
Evidence:
- Only 3 test files currently run.

Impact:
- Core workflows (routing, RBAC, CRM permissions, sync queue behavior, backup/restore) have low automated protection.

Fix direction:
- Add integration-level tests for route loading, RBAC, sync ordering, and backup completeness.

## P3 Findings

### P3-1: Documentation drift is significant and can mislead operations
Evidence:
- `WIRING_STATUS.md` claims save button has no click handler (`WIRING_STATUS.md:112`)
- Actual save wiring exists (`src/components/layout/TopBar.tsx:174`)

Impact:
- Engineers and operators lose confidence in docs and can make wrong assumptions.

Fix direction:
- Consolidate and retire stale docs.
- Maintain one living technical status file with last-reviewed date.

## What Is Missing for 30-User Readiness (Short List)
1. Reliable deep-link loading and deterministic quote context.
2. Single autosave orchestrator.
3. Persisted logistics/shipping model connected to quote totals and outputs.
4. Hard RBAC enforcement on CRM list/detail access.
5. Complete and verifiable backup/restore coverage.
6. Lint error remediation (at least all errors to zero).
7. Consistent seed/auth/default configuration strategy.
8. Expanded integration test suite on workflow-critical paths.

## Confidence and Limits
- High confidence on static wiring and quality-gate findings.
- Runtime behavior inferred from code where direct browser interaction was not executed in this audit session.
