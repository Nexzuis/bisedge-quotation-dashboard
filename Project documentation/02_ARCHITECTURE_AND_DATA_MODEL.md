# 02 - Architecture and Data Model

Last Updated: 2026-02-19
Owner: Documentation Maintainers
Source of Truth Inputs: `src/main.tsx`, `src/App.tsx`, `src/db/DatabaseAdapter.ts`, `src/db/SupabaseAdapter.ts`, `src/store/*`

## Application Shell

Entrypoint:
- `src/main.tsx` mounts `<App />`

App shell:
- `src/App.tsx`
- providers: auth context, toast provider, global search, error boundary
- startup sequence:
1. config load (`useConfigStore`)
2. load most recent quote after authentication

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
- `SupabaseDatabaseAdapter` -- the only adapter (cloud-only architecture)

The adapter interface (`DatabaseAdapter`) defines the contract. `SupabaseAdapter` (`src/db/SupabaseAdapter.ts`) is the sole implementation, executing all CRUD operations directly against Supabase tables.

Removed components (February 2026 hard cutover):
- `LocalAdapter.ts`, `HybridAdapter.ts`, `IndexedDBRepository.ts` -- deleted
- `SyncQueue.ts`, `ConflictResolver.ts` -- deleted
- `schema.ts` (Dexie IndexedDB schema), `seed.ts` (local seed) -- deleted
- `VITE_APP_MODE` environment variable -- removed
- Dexie and dexie-react-hooks dependencies -- removed

Repository factories (`src/db/repositories/`) are thin delegates that call `getDb()` to obtain the `SupabaseAdapter` instance and forward method calls.

Repository/contracts:
- `src/db/interfaces.ts`

## Supabase Table Surface

Tables managed via Supabase (PostgreSQL):
- `quotes`
- `customers`
- `audit_log`
- `templates`
- `settings`
- `forklift_models`
- `battery_models`
- `approval_tiers`
- `commission_tiers`
- `residual_curves`
- `attachments`
- `configuration_matrices`
- `users`
- `price_list_series`
- `telematics_packages`
- `container_mappings`
- `companies`
- `contacts`
- `activities`
- `notifications`
- `quote_presence` (presence features)

Schema is managed in Supabase directly. See `Project documentation/SUPABASE_MASTER_CURRENT_STATE.sql` for the canonical SQL.

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
- Supabase schema (tables, columns, RPC functions)
- adapter interface or `SupabaseAdapter` method surface
- major feature module additions/removals under `src/components`

## Related Docs

- `01_PROJECT_CONTEXT.md`
- `03_SUPABASE_AND_SYNC.md`
- `04_OPERATIONS_RUNBOOK.md`
- `05_TESTING_AND_RELEASE_CHECKLIST.md`
- `06_SESSION_LOG.md`
- `07_STATUS_BOARD.md`
