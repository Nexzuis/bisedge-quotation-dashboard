# 01 - Project Context

Last Updated: 2026-02-19
Owner: Documentation Maintainers
Source of Truth Inputs: `src/App.tsx`, `src/auth/permissions.ts`, `src/db/DatabaseAdapter.ts`, `src/db/SupabaseAdapter.ts`, `package.json`, `.env.example`, `WHAT_THIS_TOOL_IS.md`

## Purpose

Bisedge Quotation Dashboard is a cloud-only quotation and CRM system for forklift sales/rental operations, with Supabase as the single source of truth.

Primary outcomes:
- Build and maintain quotes quickly
- Track CRM pipeline activity
- Real-time multi-user collaboration via Supabase

## Scope

In scope:
- Quotation lifecycle (create, revise, export)
- CRM entities (companies, contacts, activities)
- Admin configuration and templates
- Notifications and approval workflows

Out of scope:
- Server-side custom API layer (app talks directly to Supabase)
- Native mobile client
- Offline/local-first operation (removed in February 2026 hard cutover)

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
- Database: Supabase (PostgreSQL) -- single source of truth
- Cloud backend: Supabase (always required)

Architecture: Cloud-only with Supabase as single source of truth. No local database, no IndexedDB, no offline mode. The `VITE_APP_MODE` environment variable has been removed.

## Operational Baselines

Default configuration values (managed via Supabase `settings` table):
- `defaultROE`: 19.73
- `defaultFactoryROE`: 19.73
- `defaultInterestRate`: 9.5
- `defaultLeaseTerm`: 60
- `defaultOperatingHours`: 180

Admin user:
- Managed via Supabase Auth and `public.users` table
- No local seed file (removed in hard cutover)

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
- `src/auth/permissions.ts` (roles/permissions)
- `src/db/DatabaseAdapter.ts` (adapter behavior)
- `src/db/SupabaseAdapter.ts` (Supabase table/method surface)
- Supabase schema (tables, RLS policies, RPC functions)

## Related Docs

- `02_ARCHITECTURE_AND_DATA_MODEL.md`
- `03_SUPABASE_AND_SYNC.md`
- `04_OPERATIONS_RUNBOOK.md`
- `05_TESTING_AND_RELEASE_CHECKLIST.md`
- `06_SESSION_LOG.md`
- `07_STATUS_BOARD.md`
