# 01 - Project Context

Last Updated: 2026-02-19
Owner: Documentation Maintainers
Source of Truth Inputs: `src/App.tsx`, `src/db/schema.ts`, `src/db/seed.ts`, `src/auth/permissions.ts`, `src/db/DatabaseAdapter.ts`, `package.json`, `.env.example`, `WHAT_THIS_TOOL_IS.md`

## Purpose

Bisedge Quotation Dashboard is a local-first quotation and CRM system for forklift sales/rental operations, with optional cloud synchronization to Supabase.

Primary outcomes:
- Build and maintain quotes quickly
- Track CRM pipeline activity
- Preserve operation in offline conditions
- Sync safely when internet/auth are available

## Scope

In scope:
- Quotation lifecycle (create, revise, export)
- CRM entities (companies, contacts, activities)
- Admin configuration and templates
- Notifications and approval workflows

Out of scope:
- Server-side custom API layer (app talks directly to Supabase in cloud/hybrid modes)
- Native mobile client

## Users and Roles

Active role model (`src/auth/permissions.ts`):
- `sales_rep`
- `key_account`
- `sales_manager`
- `local_leader`
- `ceo`
- `system_admin`

Role permissions combine:
- role-based resource policies
- optional per-user permission overrides

## Runtime Environment

- Framework: React 19 + TypeScript + Vite
- Router: HashRouter
- Local database: Dexie IndexedDB, DB name `BisedgeQuotationDB`
- Schema migration level: version 6
- Cloud backend: Supabase (optional by mode)

Adapter mode (`VITE_APP_MODE`):
- `local`: IndexedDB only
- `cloud`: Supabase adapter
- `hybrid`: local-first plus sync queue

## Operational Baselines

Current seed defaults (`src/db/seed.ts`):
- `defaultROE`: 19.73
- `defaultFactoryROE`: 19.73
- `defaultInterestRate`: 9.5
- `defaultLeaseTerm`: 60
- `defaultOperatingHours`: 180

Seeded admin behavior:
- local admin record uses email `admin@bisedge.com`
- password comes from `VITE_DEFAULT_ADMIN_PASSWORD` or is generated at first seed

## Documentation Policy

Canonical project documentation lives in `Project documentation/`.

Update discipline after each coding session:
1. Append change notes in `06_SESSION_LOG.md`
2. Refresh current-state snapshot in `07_STATUS_BOARD.md`
3. If runtime behavior changed, update affected topic docs in this folder

## Validation Basis

Validated from direct code inspection of entrypoints, schema migrations, auth roles, adapter factory, and seed defaults.

## Out-of-Date Risk

Refresh this document when any of these change:
- `src/db/schema.ts` (new stores/migrations)
- `src/auth/permissions.ts` (roles/permissions)
- `src/db/seed.ts` (defaults or bootstrap users)
- `src/db/DatabaseAdapter.ts` (mode behavior)

## Related Docs

- `02_ARCHITECTURE_AND_DATA_MODEL.md`
- `03_SUPABASE_AND_SYNC.md`
- `04_OPERATIONS_RUNBOOK.md`
- `05_TESTING_AND_RELEASE_CHECKLIST.md`
- `06_SESSION_LOG.md`
- `07_STATUS_BOARD.md`
