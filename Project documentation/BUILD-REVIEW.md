# BUILD-REVIEW.md - Round 3 Verification

Date: 2026-02-21  
Latest commit reviewed: `9032f3b`  
Scope: Verify the 4 listed blockers and flag any remaining/new concerns.

## Verdict
NOT APPROVED.

## Blocker Status

### 1. CRITICAL - `users_update` allowed self-updates (role escalation risk)
Status: **Resolved**

Evidence:
- Self-update clause was removed from users update policy.
- `supabase/migrations/001_rls_policies.sql:61`
- `supabase/migrations/001_rls_policies.sql:62`

Assessment:
- The direct self-escalation path from the previous review is closed.

### 2. IMPORTANT - User-management authority in RLS broader than app permission model
Status: **Not resolved**

Evidence:
- RLS still allows `users_update/users_delete` for `system_admin`, `ceo`, `local_leader`:
  - `supabase/migrations/001_rls_policies.sql:62`
  - `supabase/migrations/001_rls_policies.sql:65`
- App permission model exposes `admin:users` in role permissions only for `system_admin`:
  - `src/auth/permissions.ts:90`
  - `src/components/admin/AdminLayout.tsx:157`
- Default overrides for `ceo`/`local_leader` do not include `can_manage_users`:
  - `src/auth/permissions.ts:58`
  - `src/auth/permissions.ts:59`

Assessment:
- The mismatch remains. Direct API usage under RLS is broader than app-level authorization by default.

### 3. IMPORTANT - Approval notifications depended on replica identity but migration did not enforce it
Status: **Resolved**

Evidence:
- Migration now enforces replica identity for quotes:
  - `supabase/migrations/001_rls_policies.sql:85`
- Notification logic requires old status and safely skips otherwise:
  - `src/hooks/useApprovalNotifications.tsx:64`
  - `src/hooks/useApprovalNotifications.tsx:65`

Assessment:
- Infra dependency is now represented in repo migration state.

### 4. IMPORTANT - `database.types.ts` still hand-maintained
Status: **Not resolved**

Evidence:
- Manual-types TODO remains:
  - `src/lib/database.types.ts:5`
- SPEC still documents manual type file:
  - `Project documentation/SPEC.md:109`

Assessment:
- Schema drift risk remains open. This is still technical debt, not fixed implementation.

## Additional Checks

### SPEC alignment update
Status: **Improved, but still not sufficient for approval**

What improved:
- `auth.signUp` removed from auth methods list.
- Edge Function user creation documented.
- `Project documentation/SPEC.md:266`
- `Project documentation/SPEC.md:267`
- `Project documentation/SPEC.md:457`

No new regressions were found in the files changed by `9032f3b` beyond the unresolved IMPORTANT items above.

## Final Assessment
- CRITICAL issues: resolved in this round.
- IMPORTANT issues: not fully resolved (`#2`, `#4` remain open).
- Overall: do not approve yet.

