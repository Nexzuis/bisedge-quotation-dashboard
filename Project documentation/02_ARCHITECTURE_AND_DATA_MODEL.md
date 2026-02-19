# 02 - Architecture and Data Model

Last Updated: 2026-02-19
Owner: Documentation Maintainers
Source of Truth Inputs: `src/main.tsx`, `src/App.tsx`, `src/db/schema.ts`, `src/db/DatabaseAdapter.ts`, `src/db/LocalAdapter.ts`, `src/db/HybridAdapter.ts`, `src/db/SupabaseAdapter.ts`, `src/store/*`, `src/sync/SyncQueue.ts`

## Application Shell

Entrypoint:
- `src/main.tsx` mounts `<App />`

App shell:
- `src/App.tsx`
- providers: auth context, toast provider, global search, error boundary
- startup sequence:
1. `seedDatabaseIfEmpty()`
2. config load (`useConfigStore`)
3. load most recent quote after authentication

## Route Map

Defined in `src/App.tsx`:
- `/login`
- `/test-supabase` (admin)
- `/` (home dashboard)
- `/crm`
- `/quotes`
- `/customers`
- `/customers/:id`
- `/crm/reports`
- `/quote`
- `/builder`
- `/admin/*`
- `/notifications`
- `*` (not found)

## Data Layer Model

Adapter abstraction (`src/db/DatabaseAdapter.ts`):
- `LocalDatabaseAdapter`
- `SupabaseDatabaseAdapter`
- `HybridDatabaseAdapter`

Selection:
- `VITE_APP_MODE=local|cloud|hybrid`

Repository/contracts:
- `src/db/interfaces.ts`
- `src/db/IndexedDBRepository.ts`

## IndexedDB Schema (Dexie)

Database:
- Name: `BisedgeQuotationDB`
- Migrations: v1 to v6 (`src/db/schema.ts`)

Stores in v6:
- `quotes`
- `customers`
- `auditLog`
- `templates`
- `settings`
- `forkliftModels`
- `batteryModels`
- `approvalTiers`
- `commissionTiers`
- `residualCurves`
- `attachments`
- `configurationMatrices`
- `users`
- `priceListSeries`
- `telematicsPackages`
- `containerMappings`
- `companies`
- `contacts`
- `activities`
- `notifications`

Notable schema evolution points:
- v2: approval/commission index fixes and user email index
- v3: catalog stores (`priceListSeries`, `telematicsPackages`, `containerMappings`)
- v4: CRM stores (`companies`, `contacts`, `activities`) and customer migration
- v5: approval-chain related quote fields and role migration
- v6: notifications store

## Domain Model Highlights

Quote flow:
- `QuoteState` persisted via serialization layer (`src/db/serialization.ts`)
- `slots` serialized for storage and rehydrated on load

Core state engines:
- quote state: `src/store/useQuoteStore.ts`
- config state: `src/store/useConfigStore.ts`
- calculations: `src/engine/calculationEngine.ts`
- validation: `src/engine/validators.ts`

## UI Module Topology

Major modules:
- CRM pages: `src/components/crm/*`
- quote builder: `src/components/builder/*`
- quote dashboard panels: `src/components/panels/*`
- admin section: `src/components/admin/*`
- PDF generation: `src/pdf/*`

## Validation Basis

Validated by inspecting route declarations, DB schema migrations, adapter factory behavior, and main feature module directories.

## Out-of-Date Risk

Update this file when any of these change:
- route definitions in `src/App.tsx`
- schema version/store list in `src/db/schema.ts`
- adapter mode behavior in `src/db/DatabaseAdapter.ts`
- major feature module additions/removals under `src/components`

## Related Docs

- `01_PROJECT_CONTEXT.md`
- `03_SUPABASE_AND_SYNC.md`
- `04_OPERATIONS_RUNBOOK.md`
- `05_TESTING_AND_RELEASE_CHECKLIST.md`
- `06_SESSION_LOG.md`
- `07_STATUS_BOARD.md`
