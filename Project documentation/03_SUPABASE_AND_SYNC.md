# 03 - Supabase and Sync

Last Updated: 2026-02-19
Owner: Documentation Maintainers
Source of Truth Inputs: `src/lib/supabase.ts`, `src/store/useAuthStore.ts`, `src/db/SupabaseAdapter.ts`, `.env.example`, `Project documentation/SUPABASE_MASTER_CURRENT_STATE.sql`

## Environment Variables

Required by `src/lib/supabase.ts`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Feature flags:
- `VITE_ENABLE_REALTIME`
- `VITE_ENABLE_PRESENCE`
- `VITE_PRESENCE_HEARTBEAT_MS`

Removed flags (February 2026 hard cutover):
- `VITE_APP_MODE` -- removed (no mode switching)
- `VITE_ENABLE_OFFLINE` -- removed (no offline support)
- `VITE_SYNC_INTERVAL_MS` -- removed (no sync queue)

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

Auth logic is centralized through auth store/context. Supabase Auth is the only authentication path (no local bcrypt fallback).

Key points:
- Supabase auth session is required for all data operations (RLS-enforced).
- User role/permissions are mapped from `public.users` table in Supabase.
- Login/logout paths update app-local auth state and related cache data.

## Live Snapshot Alignment (2026-02-19)

The canonical master SQL has been aligned to the current Supabase state you provided:
- Base schema and legacy 5-role definitions exist in historical chain.
- Role migration to 6-role model is applied in V2 migration section.
- CRM and supporting tables (`companies`, `contacts`, `activities`, `notifications`, `templates`, `settings`, `price_list_series`, `telematics_packages`, `container_mappings`, `configuration_matrices`) are included.
- `company_id` linkage on `quotes` is included.
- Current admin bootstrap upsert for `nexzuis@gmail.com` is included as an optional section.

## Adapter Behavior

Cloud-only architecture (since February 2026 hard cutover):
- `SupabaseAdapter` is the sole adapter implementation
- All CRUD operations execute directly against Supabase tables
- No local persistence layer, no sync queue, no offline fallback
- All React data hooks use `useState` + `useEffect` patterns (no `useLiveQuery`)

Removed components:
- `LocalAdapter.ts`, `HybridAdapter.ts` -- deleted
- `SyncQueue.ts`, `ConflictResolver.ts` -- deleted
- IndexedDB/Dexie layer -- removed entirely
- Mode switching (`VITE_APP_MODE`) -- removed

Quotes shipping detail:
- `src/db/SupabaseAdapter.ts` reads and writes `quotes.shipping_entries`
- `shipping_entries` is serialized from `quote.shippingEntries`
- Read-path handles both text (`JSON.parse`) and JSONB array return shapes

Company merge:
- Implemented via Supabase RPC function for atomic merge operations

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

1. Keep Supabase schema and RLS policies in sync with app adapter expectations.
2. Confirm Supabase auth session is available before data operations.
3. Monitor Supabase dashboard for query performance and error rates.
4. Test CRUD operations against protected tables under each role.

## Validation Basis

Validated by reading Supabase client initialization, SupabaseAdapter implementation, auth store cloud integration, and RPC function definitions.

## Out-of-Date Risk

Update this document when any of these change:
- `src/lib/supabase.ts` env requirements or feature flags
- `src/db/SupabaseAdapter.ts` table usage or method surface
- SQL source files adopted as active baseline
- Supabase RPC functions added or modified

## Related Docs

- `01_PROJECT_CONTEXT.md`
- `02_ARCHITECTURE_AND_DATA_MODEL.md`
- `04_OPERATIONS_RUNBOOK.md`
- `05_TESTING_AND_RELEASE_CHECKLIST.md`
- `06_SESSION_LOG.md`
- `07_STATUS_BOARD.md`
