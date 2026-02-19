# 03 - Supabase and Sync

Last Updated: 2026-02-19
Owner: Documentation Maintainers
Source of Truth Inputs: `src/lib/supabase.ts`, `src/store/useAuthStore.ts`, `src/db/SupabaseAdapter.ts`, `src/db/HybridAdapter.ts`, `src/sync/SyncQueue.ts`, `.env.example`, `Project documentation/SUPABASE_MASTER_CURRENT_STATE.sql`

## Environment Variables

Required by `src/lib/supabase.ts`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Mode and feature flags:
- `VITE_APP_MODE=local|cloud|hybrid`
- `VITE_ENABLE_OFFLINE`
- `VITE_ENABLE_REALTIME`
- `VITE_ENABLE_PRESENCE`
- `VITE_PRESENCE_HEARTBEAT_MS`
- `VITE_SYNC_INTERVAL_MS`

Important behavior:
- Supabase client module validates URL/key at module load and throws if missing.
- This affects startup paths that import Supabase utilities directly.

## Active SQL Artifact

Use this as the canonical Supabase SQL source:
- `Project documentation/SUPABASE_MASTER_CURRENT_STATE.sql`

Archived legacy Supabase SQL files are in:
- `legacy documents/2026-02-doc-consolidation/sql/`

The master SQL includes the previously applied chain:
- `SUPABASE_SCHEMA.sql` (base schema)
- `SUPABASE_DISABLE_RLS_TEMP.sql` (temporary historical step)
- `SUPABASE_SCHEMA_V2.sql` (role + CRM + catalog + notifications migration)
- bootstrap upsert for current system admin user

## Auth Model

Auth logic is centralized through auth store/context and may use both cloud and local behavior depending on mode.

Key points:
- Supabase auth session is required for RLS-protected sync operations.
- User role/permissions are mapped from app user records (`public.users` in cloud paths and local `users` store in local paths).
- Login/logout paths update app-local auth state and related cache data.

## Live Snapshot Alignment (2026-02-19)

The canonical master SQL has been aligned to the current Supabase state you provided:
- Base schema and legacy 5-role definitions exist in historical chain.
- Role migration to 6-role model is applied in V2 migration section.
- CRM and supporting tables (`companies`, `contacts`, `activities`, `notifications`, `templates`, `settings`, `price_list_series`, `telematics_packages`, `container_mappings`, `configuration_matrices`) are included.
- `company_id` linkage on `quotes` is included.
- Current admin bootstrap upsert for `nexzuis@gmail.com` is included as an optional section.

## Adapter Behavior

`local` mode:
- IndexedDB only

`cloud` mode:
- Supabase adapter executes CRUD directly against Supabase tables

`hybrid` mode:
- Save locally first, queue cloud sync in background
- Reads prioritize local cache with cloud refresh patterns depending on method

Quotes shipping sync detail:
- `src/db/SupabaseAdapter.ts` now reads and writes `quotes.shipping_entries`.
- Expected payload behavior: `shipping_entries` is serialized from `quote.shippingEntries`.
- Read-path compatibility: adapter handles both text (`JSON.parse`) and JSONB array return shapes.
- Without this column/payload mapping, shipping data persists only locally and is lost on cloud-only restore/new-device scenarios.

## Sync Queue Model (`src/sync/SyncQueue.ts`)

Queue storage:
- localStorage key: `bisedge_sync_queue`
- permanent-failure key: `bisedge_sync_permanent_failures`

Processing:
- serialized processing chain prevents concurrent queue runs
- queue only processes when online and authenticated session exists

Entity priority (parent first):
1. `company` / `user`
2. `contact` / `customer`
3. `activity` / `notification`
4. `quote`

Retry/error behavior:
- FK violation (`23503`): retried up to 10 attempts
- transient failures: retried up to 5 attempts
- permanent error code blocklist: `23505`, `42703`, `42P01`
- permanent failures are blocklisted from re-enqueue until cleared

## Supabase Table Surface Used in Code

Frequently used tables include:
- `quotes`
- `customers`
- `users`
- `companies`
- `contacts`
- `activities`
- `notifications`
- `templates`
- `audit_log`
- `commission_tiers`
- `residual_curves`
- `quote_presence` (presence features)

## Operational Guardrails

1. Keep schema and RLS files in sync with app adapter expectations.
2. Confirm auth session availability before expecting sync processing.
3. When debugging sync issues, inspect queue entries and permanent failure blocklist.
4. For hybrid mode validation, test create/update/delete in offline then online transition.

## Validation Basis

Validated by reading Supabase client initialization, adapter implementations, auth store cloud integration, and queue implementation details.

## Out-of-Date Risk

Update this document when any of these change:
- `src/lib/supabase.ts` env requirements or mode flags
- `src/sync/SyncQueue.ts` priority/retry logic
- `src/db/SupabaseAdapter.ts` table usage
- SQL source files adopted as active baseline

## Related Docs

- `01_PROJECT_CONTEXT.md`
- `02_ARCHITECTURE_AND_DATA_MODEL.md`
- `04_OPERATIONS_RUNBOOK.md`
- `05_TESTING_AND_RELEASE_CHECKLIST.md`
- `06_SESSION_LOG.md`
- `07_STATUS_BOARD.md`
