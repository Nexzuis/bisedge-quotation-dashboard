# MASSIVETEST - Pre-Launch Master Verification Plan (Supabase-Only)

- Last updated: 2026-02-19 18:56:46 +02:00
- Scope: Full pre-launch validation after Supabase-only hard cutover
- Inputs combined:
1. Claude migration execution plan and verification claims
2. Claude pre-launch verification plan
3. Codex independent verification outputs in `codex/verification-*.md` and `codex/supabase-live-verification-final-pass.md`

## 1. Launch Goal

Ship with high confidence that the app is fully cloud-only, stable, secure, and production-ready for live multi-user usage.

## 2. Non-Negotiable Acceptance Criteria

1. All business data reads/writes go through Supabase only.
2. Supabase Auth is the only auth path.
3. No local/hybrid/sync queue runtime path remains.
4. No Dexie business-data runtime access remains.
5. `merge_companies` is atomic and matches frontend merge payload fields.
6. No runtime crashes from malformed JSON or undefined numeric fields.
7. RLS and role visibility rules are enforced.
8. Build/test/typecheck and smoke tests pass.

## 3. Current Baseline (Already Verified)

## 3.1 Automated gates (fresh rerun)

1. `npm.cmd run typecheck` -> PASS (0 errors)
2. `npm.cmd run test` -> PASS (96/96)
3. `npm.cmd run build` -> PASS (clean build; non-blocking Vite chunk warnings only)

## 3.2 Grep hard-cutover gates (fresh rerun)

1. `SyncQueue|syncQueue` -> 0
2. `VITE_APP_MODE` -> 0
3. `isCloudMode|isLocalMode|isHybridMode` -> 0
4. `useLiveQuery` -> 0
5. `from '../db/schema'|from '../../db/schema'|from '../../../db/schema'` -> 0
6. `dexie-react-hooks` -> 0
7. `navigator.onLine` -> 0

## 3.3 Supabase live checks (already captured and passing)

1. 16 required tables present
2. Required columns present (`activities.quote_id`, `quotes.company_id`, `quotes.shipping_entries`)
3. `merge_companies` exists
4. RPC grants restricted (no `PUBLIC` or `anon`)
5. `quotes` and `users` RLS enabled and forced
6. `quotes` and `users` CRUD policies present

Reference: `codex/supabase-live-verification-final-pass.md`

## 4. Remaining Pre-Launch Work Plan (Combined Master Plan)

## Phase A - Critical Blockers (must close before launch)

1. Company merge parity check (frontend payload vs SQL function fields)
2. Stale quote lock behavior validation (lock aging + override behavior)
3. Production surface cleanup (`/test-supabase` should not be exposed in prod)
4. Runtime crash regression focus: the previous `toFixed` and malformed quote JSON path

### A1. Company merge parity validation and SQL script

Run this verification SQL:

```sql
select
  routine_schema,
  routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'merge_companies';
```

```sql
select pg_get_functiondef('public.merge_companies(uuid, uuid, jsonb)'::regprocedure);
```

If function definition is missing fields from frontend payload, apply this exact script:

```sql
create or replace function public.merge_companies(
  p_primary_id uuid,
  p_secondary_id uuid,
  p_merged_data jsonb
) returns void
language plpgsql
security definer
as $$
begin
  update public.companies
  set name = coalesce(p_merged_data->>'name', name),
      trading_name = coalesce(p_merged_data->>'trading_name', trading_name),
      registration_number = coalesce(p_merged_data->>'registration_number', registration_number),
      vat_number = coalesce(p_merged_data->>'vat_number', vat_number),
      industry = coalesce(p_merged_data->>'industry', industry),
      website = coalesce(p_merged_data->>'website', website),
      address = coalesce(p_merged_data->'address', address),
      city = coalesce(p_merged_data->>'city', city),
      province = coalesce(p_merged_data->>'province', province),
      postal_code = coalesce(p_merged_data->>'postal_code', postal_code),
      country = coalesce(p_merged_data->>'country', country),
      phone = coalesce(p_merged_data->>'phone', phone),
      email = coalesce(p_merged_data->>'email', email),
      pipeline_stage = coalesce(p_merged_data->>'pipeline_stage', pipeline_stage),
      assigned_to = coalesce((nullif(p_merged_data->>'assigned_to', ''))::uuid, assigned_to),
      estimated_value = coalesce((nullif(p_merged_data->>'estimated_value', ''))::numeric, estimated_value),
      credit_limit = coalesce((nullif(p_merged_data->>'credit_limit', ''))::numeric, credit_limit),
      payment_terms = coalesce((nullif(p_merged_data->>'payment_terms', ''))::integer, payment_terms),
      tags = coalesce(p_merged_data->'tags', tags),
      notes = coalesce(p_merged_data->>'notes', notes),
      updated_at = now()
  where id = p_primary_id;

  update public.contacts
  set company_id = p_primary_id,
      updated_at = now()
  where company_id = p_secondary_id;

  update public.activities
  set company_id = p_primary_id
  where company_id = p_secondary_id;

  update public.quotes
  set company_id = p_primary_id,
      client_name = coalesce(p_merged_data->>'name', client_name),
      updated_at = now()
  where company_id = p_secondary_id;

  delete from public.companies
  where id = p_secondary_id;
end;
$$;

revoke all on function public.merge_companies(uuid, uuid, jsonb) from public, anon;
grant execute on function public.merge_companies(uuid, uuid, jsonb) to authenticated, service_role, postgres;
```

Pass criteria:

1. Function exists and updates all expected merge fields.
2. Grants are restricted to `authenticated`, `service_role`, `postgres`.
3. Manual merge test confirms all selected fields persist.

### A2. Stale lock validation

Test cases:

1. User A acquires lock, force close browser, wait stale threshold, User B can edit.
2. User B cannot edit while lock is fresh.
3. Lock release occurs on normal unmount/navigation.

Pass criteria:

1. No permanent dead-lock on quote editing.
2. Lock status is accurate across two active sessions.

### A3. Remove test-only production route exposure

Checks:

1. `src/App.tsx` does not expose `/test-supabase` in production path.
2. If retained, it is strictly `import.meta.env.DEV` gated.

Pass criteria:

1. No admin diagnostics route publicly routable in prod build.

## Phase B - Automated Regression Suite (must pass)

Run:

```powershell
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

Run grep gate audit:

```powershell
rg -n "SyncQueue|syncQueue" src
rg -n "VITE_APP_MODE" src
rg -n "isCloudMode|isLocalMode|isHybridMode" src
rg -n "useLiveQuery" src
rg -n "from '../db/schema'|from '../../db/schema'|from '../../../db/schema'" src
rg -n "dexie-react-hooks" src
rg -n "navigator\.onLine" src
```

Pass criteria:

1. Typecheck/test/build all pass.
2. All grep gates return zero matches.

## Phase C - Full Functional E2E (12 Groups)

## C1 Authentication

1. Valid login
2. Invalid login
3. Logout
4. Session persistence on refresh
5. Protected route denial for non-authorized roles

## C2 Quote Builder (step-by-step)

1. Client info validation
2. Commercial settings
3. Unit selection
4. Options/configuration
5. Costs and charges
6. Markup/residual/maintenance
7. Summary totals/margins/IRR rendering
8. Save/PDF/submit for approval
9. Back/forward no data loss
10. Auto-save persistence

## C3 Quote CRUD

1. Create
2. Search
3. Duplicate
4. Revision
5. Delete draft

## C4 Approval Workflow

1. Submit
2. Approve
3. Reject (reason required)
4. Escalate
5. Return for changes
6. Comment-only action

## C5 CRM Companies

1. Create/edit/search/delete
2. Pipeline stage update
3. Merge companies (all merged fields validate)

## C6 Contacts/Activities

1. Add contact
2. Set primary contact
3. Log activity types
4. Timeline visibility

## C7 Notifications

1. Notification creation on workflow action
2. Bell count updates
3. Mark read / mark all read
4. `/notifications` page load

## C8 Document Export

1. PDF generation with expected sections
2. Excel export from CRM list

## C9 Admin Panels

1. Users CRUD + role + deactivate + reset password
2. Pricing configs persistence
3. Template management
4. Audit log listing/filtering
5. Configuration matrix load/import

## C10 Dashboard Widgets

1. Sales rep dashboard
2. Manager dashboard
3. Admin system health

## C11 Realtime/Presence/Locking (if enabled)

1. Multi-user quote presence
2. Lock behavior across sessions
3. Realtime list/detail updates
4. Notification realtime update

## C12 Role-based access

Validate permissions matrix across:

1. `sales_rep`
2. `key_account`
3. `sales_manager`
4. `local_leader`
5. `ceo`
6. `system_admin`

## Phase D - Security and RLS Verification

Run:

```sql
select tablename, rowsecurity as rls_enabled, forcerowsecurity as rls_forced
from pg_tables
where schemaname = 'public'
order by tablename;
```

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

```sql
select routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema='public'
  and routine_name='merge_companies'
order by grantee;
```

Role smoke test:

1. Each role only sees allowed quote/user rows.
2. Writes blocked when policy disallows.
3. `merge_companies` callable only by authenticated users with expected app permissions.

## Phase E - Reliability and Negative Testing

1. Simulate malformed JSON fields in quote payload; UI must not crash.
2. Simulate null/undefined numeric fields for financial display; no `toFixed` crashes.
3. Disable network mid-edit; app should degrade gracefully without crash loops.
4. Session expiry mid-save; user receives clear action message and no silent data corruption.
5. High-latency test (>500ms DB responses) on critical screens.

## Phase F - Release Readiness and Rollback

Pre-release checklist:

1. Freeze deploy window
2. Confirm Supabase backup/snapshot timestamp
3. Confirm environment variables are production-correct
4. Confirm observability dashboard and alerting
5. Final smoke in production-like env

Rollback plan:

1. Keep pre-cutover git tag and Supabase snapshot id
2. If severe issue, redeploy previous stable tag
3. If data integrity issue, restore snapshot per runbook
4. Communicate incident status and suspend new writes until resolved

## 5. Execution Tracker Template

Use this table during execution:

| Area | Owner | Start | End | Result | Evidence Link |
|---|---|---|---|---|---|
| Phase A blockers |  |  |  |  |  |
| Phase B automated |  |  |  |  |  |
| Phase C E2E |  |  |  |  |  |
| Phase D security |  |  |  |  |  |
| Phase E reliability |  |  |  |  |  |
| Phase F release |  |  |  |  |  |

## 6. Go/No-Go Rule

Go live only when:

1. All Phase A blockers are closed.
2. Automated gates are all green.
3. Critical workflows in Phase C pass for at least two roles (`sales_rep`, `system_admin`) and one approver role.
4. Security checks in Phase D are green.
5. No P0/P1 open defects remain.

If any of the above fail -> NO-GO.

