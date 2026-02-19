# 04 - Operations Runbook

Last Updated: 2026-02-19
Owner: Documentation Maintainers
Source of Truth Inputs: `package.json`, `scripts/start-dev.js`, `src/App.tsx`, `src/db/seed.ts`, `src/lib/supabase.ts`, `src/db/DatabaseAdapter.ts`, admin component surface under `src/components/admin/*`

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

## Runtime Modes

Configure in `.env.local`:
- `VITE_APP_MODE=local|cloud|hybrid`

Operational meaning:
- `local`: no cloud dependency for data operations
- `cloud`: Supabase-only persistence paths
- `hybrid`: local-first with background sync queue

## Authentication Operations

Local seed behavior:
- first seed creates local admin record if none exists
- email: `admin@bisedge.com`

Cloud/hybrid notes:
- Supabase session availability affects sync queue execution
- `/test-supabase` route can be used by admin for environment and policy checks
- In hybrid mode, quote sync enqueue is skipped until a Supabase session exists (local save still succeeds)

## Daily Operator Flow

1. Login
2. Work in CRM (`/#/customers`) and quote flows (`/#/quote`, `/#/builder`)
3. Monitor sync indicator in hybrid/cloud usage
4. Export documents from quote flows as needed
5. Use admin sections for configuration, users, templates, and backup/restore

## Backup and Restore

Use Admin > Backup & Restore UI for operational backups.

Runbook rule:
- Perform backup before major data imports or bulk edits.
- Validate restore in a controlled environment before production usage.

## Supabase Operations

When updating cloud schema/policies:
1. Use `Project documentation/SUPABASE_MASTER_CURRENT_STATE.sql` as the single source
2. Apply only the required section(s) for your migration/recovery operation
3. Validate through app test page and functional smoke checks

## Incident Triage Checklist

1. Confirm mode (`VITE_APP_MODE`)
2. Confirm env vars present for Supabase paths
3. Check browser console for Supabase/auth/sync errors
4. Inspect sync status and pending queue behavior
5. Confirm DB seed/config load completed on startup

## Known Sync Error Playbook

1. Error: `null value in column "created_by" ... violates not-null constraint` (`23502`)
- Meaning: quote payload reached cloud path without resolved creator identity
- Current expected behavior: queue should defer quote enqueue until authenticated session and inject session user as `created_by`
- Action: verify user is logged in and session is active; then trigger sync repair if needed

2. Error: `duplicate key value violates unique constraint "quotes_quote_ref_key"` (`23505`)
- Meaning: quote reference collision between local/cloud sequences
- Current expected behavior: treated as recoverable retry (not permanent blocklist), with automatic `quote_ref` regeneration before retry
- Action: verify hybrid quote ref generation is cloud-aware and allow retry loop; repair queue if legacy blocked entries exist

3. Warning: `Skipping sync — no authenticated Supabase session`
- Meaning: queue processor running before/without cloud auth
- Current expected behavior: no cloud sync attempted until session exists
- Action: complete login and recheck queue processing; duplicate/revision/repair enqueue paths should also remain deferred until session exists

## Documentation Operations

After each implementation session:
1. Append session summary in `06_SESSION_LOG.md`
2. Refresh current-state entries in `07_STATUS_BOARD.md`
3. Update topic docs affected by behavior/config/schema changes

## Validation Basis

Validated from scripts, adapter mode factory, Supabase client behavior, and route/admin surfaces.

## Out-of-Date Risk

Update when changing:
- npm scripts or startup command behavior
- adapter modes and env flags
- admin operational flows (backup/restore, users, templates)

## Related Docs

- `01_PROJECT_CONTEXT.md`
- `02_ARCHITECTURE_AND_DATA_MODEL.md`
- `03_SUPABASE_AND_SYNC.md`
- `05_TESTING_AND_RELEASE_CHECKLIST.md`
- `06_SESSION_LOG.md`
- `07_STATUS_BOARD.md`
