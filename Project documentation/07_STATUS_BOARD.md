# 07 - Status Board

Last Updated: 2026-02-19
Owner: Documentation Maintainers
Source of Truth Inputs: `src/App.tsx`, `src/db/schema.ts`, `src/db/*Adapter.ts`, `src/sync/SyncQueue.ts`, `src/auth/permissions.ts`, `src/db/seed.ts`, `src/pdf/*`, `package.json`, test files

## Current System Snapshot

## Go-Live Remediation Status (2026-02-19)

Status: In Progress (major blockers addressed)

- Deep-link quote loading: fixed (`/quote?id=...` now id-aware, with explicit not-found handling)
- Autosave concurrency: fixed (single autosave instance via app-level context)
- Financial basis: updated to landed-cost margin/IRR basis, PMT invalid-term guard added
- Permission overrides: explicit deny semantics implemented (`override=false` now revokes)
- PDF line items: switched from deprecated monthly fields to current computed fields
- Logistics shipping persistence: moved from local component state to persisted quote state, including Supabase `shipping_entries` write/read mapping
- CRM low-role visibility: restricted to assigned accounts in hook and list UX
- Backup coverage: expanded table manifest + metadata compatibility checks
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

## Application and Routing

Status: Active

- SPA with `HashRouter`
- Protected route model with auth wrappers
- Admin route guard for admin-level roles
- Main business surfaces available: home, CRM, quotes, builder, admin, reports, notifications

## Data and Persistence

Status: Active

- IndexedDB database `BisedgeQuotationDB`
- Schema migrations up to v6
- Local repositories and adapter abstraction in place
- App mode switch supports local/cloud/hybrid behavior

## Sync and Cloud Integration

Status: Active

- Sync queue implemented with serialized processing
- Entity priority ordering implemented for parent-child dependencies
- Retry and permanent-failure handling implemented
- Supabase connectivity and RLS testing utility route available (`/test-supabase`)

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

## Automated Quality Gates

Status: Partially Green

- `typecheck`: available and expected to pass
- `test`: available with 4 current test files
- `build`: available and expected to pass
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

Update this board whenever feature availability, route surface, schema version, adapter mode behavior, or quality gate status changes.

## Related Docs

- `01_PROJECT_CONTEXT.md`
- `02_ARCHITECTURE_AND_DATA_MODEL.md`
- `03_SUPABASE_AND_SYNC.md`
- `04_OPERATIONS_RUNBOOK.md`
- `05_TESTING_AND_RELEASE_CHECKLIST.md`
- `06_SESSION_LOG.md`
