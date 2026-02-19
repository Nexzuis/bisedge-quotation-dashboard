# PROJECT CONTEXT - Bisedge Quotation Dashboard

Read this file at the start of every session.

## What This Tool Is

The Bisedge Quotation Dashboard is an offline-first CRM and quotation platform for forklift rental and sales operations in South Africa.

Primary goals:
- Manage companies, contacts, and activities (CRM flow)
- Build professional forklift rental and lease quotations
- Work reliably without internet using IndexedDB as primary storage
- Sync to Supabase when online (hybrid/cloud operation)

For complete operational documentation, use the canonical docs in:
- `Project documentation/`

## Current Runtime Model

- Frontend: React + TypeScript + Vite (SPA)
- Routing: `HashRouter`
- Local DB: Dexie IndexedDB (`BisedgeQuotationDB`, schema v6)
- Remote DB: Supabase PostgreSQL
- Modes: `local`, `cloud`, `hybrid` (`VITE_APP_MODE`)

Startup behavior:
1. Seed local DB if needed (`seedDatabaseIfEmpty()`)
2. Load config (`useConfigStore.loadConfig()`)
3. If authenticated, load most recent quote

## Core Route Surface

- `/#/login`
- `/#/`
- `/#/quote`
- `/#/builder`
- `/#/quotes`
- `/#/customers`
- `/#/customers/:id`
- `/#/crm/reports`
- `/#/admin/*`
- `/#/notifications`
- `/#/test-supabase` (admin test page)

## Data and Business Baselines

From current code and seed defaults:
- IndexedDB schema version: 6
- Default ROE: 19.73
- Default factory ROE: 19.73
- Default interest rate: 9.5
- Default lease term: 60 months
- Default operating hours: 180

Auth and roles:
- Roles: `sales_rep`, `key_account`, `sales_manager`, `local_leader`, `ceo`, `system_admin`
- Seeded admin user: `admin@bisedge.com` with username `admin`
- Admin password: from `VITE_DEFAULT_ADMIN_PASSWORD` when set, otherwise generated during first seed

## Operating Principles

1. Offline-first: local writes must remain reliable without internet.
2. Sync safety: parent entities must sync before dependent entities.
3. No silent failure: sync or persistence failures must be visible.
4. ZAR-first pricing output for business users and customer documents.
5. Keep documentation current after each session in `Project documentation/06_SESSION_LOG.md` and `Project documentation/07_STATUS_BOARD.md`.
