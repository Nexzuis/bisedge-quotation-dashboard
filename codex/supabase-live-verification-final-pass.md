# Supabase Live Verification Final Pass

- Timestamp: 2026-02-19 18:26:51 +02:00
- Scope: Live Supabase validation after cloud-only cutover
- Status: PASS

## What was checked

1. Required tables exist.
2. Required columns exist.
3. `merge_companies` RPC exists.
4. RPC execute grants are restricted.
5. `quotes` and `users` RLS is enabled and forced.
6. `quotes` and `users` policies exist for CRUD paths.

## Live results captured

## 1) Required tables

PASS. Present:

1. `activities`
2. `attachments`
3. `audit_log`
4. `commission_tiers`
5. `companies`
6. `configuration_matrices`
7. `contacts`
8. `container_mappings`
9. `notifications`
10. `price_list_series`
11. `quotes`
12. `residual_curves`
13. `settings`
14. `telematics_packages`
15. `templates`
16. `users`

## 2) Required columns

PASS. Present:

1. `activities.quote_id` (`uuid`)
2. `quotes.company_id` (`uuid`)
3. `quotes.shipping_entries` (`jsonb`)

## 3) RPC function existence

PASS.

1. `public.merge_companies` exists.

## 4) RPC grants

PASS.

Allowed:

1. `authenticated` EXECUTE
2. `service_role` EXECUTE
3. `postgres` EXECUTE

Not allowed:

1. `PUBLIC`
2. `anon`

## 5) Policies on `quotes` and `users`

PASS.

Policies present:

1. `quotes_select`
2. `quotes_insert`
3. `quotes_update`
4. `quotes_delete`
5. `users_select`
6. `users_insert`
7. `users_update`
8. `users_delete`

## 6) RLS enablement

PASS.

1. `quotes`: `rls_enabled = true`, `rls_forced = true`
2. `users`: `rls_enabled = true`, `rls_forced = true`

## Actions completed during this validation

1. Applied `Project documentation/sql/company_merge_rpc.sql`.
2. Tightened RPC grants (removed `PUBLIC` and `anon` execute).
3. Enabled and forced RLS on `quotes` and `users`.
4. Added `quotes` and `users` CRUD policies.

## Final conclusion

Supabase live verification gates for the cutover are complete and passing.

Database-side blocker status: CLEARED.
