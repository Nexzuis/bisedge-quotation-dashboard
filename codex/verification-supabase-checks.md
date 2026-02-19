# Supabase Verification Checks (Post-Cutover)

- Timestamp: 2026-02-19 18:26:51 +02:00
- Verifier: Codex + User (live Supabase execution)
- Commit: `df1e273`

## Repository-Level Verification

1. RPC SQL file exists:
   - `Project documentation/sql/company_merge_rpc.sql`
2. Company merge hook uses RPC:
   - `src/hooks/useCompanyMerge.ts` calls `supabase.rpc('merge_companies', ...)`.
3. Adapter includes JSON safety + numeric normalization guards.

Status: PASS

## Live Supabase Verification Results (Executed)

## 1) Required tables

Result: PASS

Validated tables present:

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

Result: PASS

Validated columns:

1. `activities.quote_id` (`uuid`)
2. `quotes.company_id` (`uuid`)
3. `quotes.shipping_entries` (`jsonb`)

## 3) RPC function `merge_companies`

Initial check: not present.

Action taken: applied `Project documentation/sql/company_merge_rpc.sql`.

Final result: PASS

Observed:

1. `public.merge_companies` exists.

## 4) RPC grants

Final result: PASS

Observed grants:

1. `authenticated` EXECUTE
2. `postgres` EXECUTE
3. `service_role` EXECUTE

Confirmed removed:

1. `PUBLIC`
2. `anon`

## 5) RLS policies and RLS enablement (`quotes`, `users`)

Final result: PASS

Observed:

1. `quotes` policies exist for `SELECT/INSERT/UPDATE/DELETE` (authenticated)
2. `users` policies exist for `SELECT/INSERT/UPDATE/DELETE` (authenticated)
3. `quotes` RLS enabled and forced (`true/true`)
4. `users` RLS enabled and forced (`true/true`)

## Live Verification Conclusion

All live Supabase verification checks passed.
