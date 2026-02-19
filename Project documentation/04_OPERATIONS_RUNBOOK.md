# 04 - Operations Runbook

Last Updated: 2026-02-19
Owner: Documentation Maintainers
Source of Truth Inputs: `package.json`, `src/App.tsx`, `src/lib/supabase.ts`, `src/db/DatabaseAdapter.ts`, `src/db/SupabaseAdapter.ts`, admin component surface under `src/components/admin/*`

## Local Development Startup

1. Install dependencies:
```bash
npm install
```
2. Start dev server:
```bash
npm run dev
```
3. Open:
- `http://localhost:5173`

## Runtime Mode

The application operates in cloud-only mode. Supabase is the single source of truth for all data.

Required in `.env.local`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The `VITE_APP_MODE` environment variable has been removed. There is no local or hybrid mode.

## Authentication Operations

Authentication is handled exclusively by Supabase Auth (no local password fallback).

- Users are managed in Supabase Auth + `public.users` table
- The Supabase test page (`SupabaseTestPage.tsx`) is available only in local dev builds (`npm run dev`); it is excluded from production routes
- All data operations require an active Supabase session

## Daily Operator Flow

1. Login (Supabase Auth)
2. Work in CRM (`/#/customers`) and quote flows (`/#/quote`, `/#/builder`)
3. All changes persist directly to Supabase
4. Export documents from quote flows as needed
5. Use admin sections for configuration, users, templates, and operational management

## Backup and Restore

Backups are managed through Supabase dashboard and project settings.

Runbook rule:
- Use Supabase's built-in backup capabilities for data protection.
- Validate restore in a controlled environment before production usage.

## Supabase Operations

When updating cloud schema/policies:
1. Use `Project documentation/SUPABASE_MASTER_CURRENT_STATE.sql` as the single source
2. Apply only the required section(s) for your migration/recovery operation
3. Validate through app test page and functional smoke checks

## Incident Triage Checklist

1. Confirm Supabase env vars are present and correct (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
2. Check browser console for Supabase/auth errors
3. Verify user has an active Supabase auth session
4. In local dev, use the Supabase test page to check connectivity and RLS policy status
5. Confirm config load completed on startup
6. Check Supabase dashboard for service status, quota limits, and error logs

## Documentation Operations

After each implementation session:
1. Append session summary in `06_SESSION_LOG.md`
2. Refresh current-state entries in `07_STATUS_BOARD.md`
3. Update topic docs affected by behavior/config/schema changes

## Validation Basis

Validated from scripts, SupabaseAdapter behavior, Supabase client initialization, and route/admin surfaces.

## Out-of-Date Risk

Update when changing:
- npm scripts or startup command behavior
- Supabase env requirements or feature flags
- admin operational flows (users, templates)
- Supabase schema or RPC functions

## Related Docs

- `01_PROJECT_CONTEXT.md`
- `02_ARCHITECTURE_AND_DATA_MODEL.md`
- `03_SUPABASE_AND_SYNC.md`
- `05_TESTING_AND_RELEASE_CHECKLIST.md`
- `06_SESSION_LOG.md`
- `07_STATUS_BOARD.md`
