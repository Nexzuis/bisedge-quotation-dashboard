# BUILD-REVIEW.md - Round 5 Verification

Date: 2026-02-22  
Latest commit reviewed: `51c5efb`  
Additional scope reviewed: current Round 5 working-tree changes (not yet committed) in `src/lib/database.types.ts`, `supabase/migrations/001_rls_policies.sql`, `Project documentation/TECH-DEBT.md`, and `CLAUDE.md`.

## Verdict
NOT APPROVED.

## Prior CRITICAL/IMPORTANT Blockers

### 1. CRITICAL - `users_update` self-escalation path
Status: **Resolved**

Evidence:
- Policy requires privileged authority (`system_admin` or `can_manage_users`), not generic self-update.
- `supabase/migrations/001_rls_policies.sql:62`
- `supabase/migrations/001_rls_policies.sql:68`

### 2. IMPORTANT - RLS authority broader than app permission model
Status: **Resolved**

Evidence:
- `users_update/users_delete` now align to app authority gate:
  - `supabase/migrations/001_rls_policies.sql:68`
  - `supabase/migrations/001_rls_policies.sql:78`
- App permission mapping:
  - `src/auth/permissions.ts:90`
  - `src/auth/permissions.ts:172`

### 3. IMPORTANT - Approval notifications depended on unmanaged replica identity
Status: **Resolved**

Evidence:
- Migration enforces replica identity:
  - `supabase/migrations/001_rls_policies.sql:98`
- Notification guard remains in place:
  - `src/hooks/useApprovalNotifications.tsx:62`
  - `src/hooks/useApprovalNotifications.tsx:64`
  - `src/hooks/useApprovalNotifications.tsx:66`

### 4. IMPORTANT - `database.types.ts` was hand-maintained
Status: **Resolved**

Evidence:
- File is now Supabase-generated format (includes `__InternalSupabase`, relationship metadata, helper generics).
- `src/lib/database.types.ts:8`
- `src/lib/database.types.ts:1453`
- Prior TODO removed.
- `TECH-DEBT` items marked resolved:
  - `Project documentation/TECH-DEBT.md:305`
  - `Project documentation/TECH-DEBT.md:311`

## Remaining / New Concerns

### IMPORTANT - User management still writes/filters by `username`, but generated live schema types for `public.users` do not include a `username` column
Evidence:
- Generated `users` table shape has no `username` field:
  - `src/lib/database.types.ts:1245`
  - `src/lib/database.types.ts:1258`
- User management still depends on `username` in DB queries/updates:
  - `src/components/admin/users/UserManagement.tsx:166`
  - `src/components/admin/users/UserManagement.tsx:192`

Risk:
- If live schema truly has no `public.users.username`, user save flows can fail at runtime with PostgREST column errors.

### MINOR - No new commit for Round 5 yet
Evidence:
- `HEAD` is still `51c5efb`; Round 5 changes are present in working tree only.

Risk:
- Review cannot pin results to an immutable commit hash until changes are committed.

## Validation Run In This Review
- `npx tsc --noEmit`: pass.
- `npx vitest run src/auth/__tests__/permissions.test.ts`: pass.

## Final Assessment
- All previously listed CRITICAL/IMPORTANT blockers are now resolved.
- One additional IMPORTANT runtime-schema concern remains (`username` usage vs generated schema shape).
- Approval status: **NOT APPROVED**.
