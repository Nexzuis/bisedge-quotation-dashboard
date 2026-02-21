# BUILD-REVIEW.md - Round 2 Verification

Date: 2026-02-21  
Latest commit reviewed: `e45cd67`  
Scope: Verify resolution of prior CRITICAL/IMPORTANT findings and detect regressions/new issues.

## Verdict
NOT APPROVED.

Round 2 fixed several issues from the previous review, but not all CRITICAL/IMPORTANT risks are closed.

## Resolution Check (Prior Findings)

### A. CRITICAL - Missing `users_update/users_delete` policies
Status: **Resolved**
- Policies now exist:
  - `supabase/migrations/001_rls_policies.sql:54`
  - `supabase/migrations/001_rls_policies.sql:58`

### B. IMPORTANT - Overly permissive CRM delete policies
Status: **Partially resolved**
- Deletes are tightened for companies/contacts/activities:
  - `supabase/migrations/001_rls_policies.sql:26`
  - `supabase/migrations/001_rls_policies.sql:34`
  - `supabase/migrations/001_rls_policies.sql:42`
- But updates are still globally open (`USING (true)`) for CRM core tables:
  - `supabase/migrations/001_rls_policies.sql:25`
  - `supabase/migrations/001_rls_policies.sql:33`
  - `supabase/migrations/001_rls_policies.sql:41`

### C. IMPORTANT - Approval false positives when `payload.old.status` is missing
Status: **Resolved**
- Notifications now skip when old status is unavailable:
  - `src/hooks/useApprovalNotifications.tsx:64`
  - `src/hooks/useApprovalNotifications.tsx:65`
  - `src/hooks/useApprovalNotifications.tsx:66`

### D. IMPORTANT - SPEC inaccuracies from prior review
Status: **Mostly resolved**
- Prior stale caveats were corrected.
- New inconsistency remains: SPEC still lists `auth.signUp` in active API auth methods:
  - `Project documentation/SPEC.md:266`
- But the implementation now uses edge function user creation:
  - `src/components/admin/users/UserManagement.tsx:217`
  - `Project documentation/SPEC.md:456`

### Previous Important Gap (still open): manual DB types generation
Status: **Not resolved**
- `database.types.ts` is still hand-maintained:
  - `src/lib/database.types.ts:5`

## Remaining / New Issues

### 1. CRITICAL - Users can self-elevate role via `users_update` RLS policy
Evidence:
- Self-update condition is explicitly allowed:
  - `supabase/migrations/001_rls_policies.sql:56`
- No column-level guard or `WITH CHECK` restriction prevents changing privileged fields (`role`, `permission_overrides`, `is_active`).

Why this is critical:
- Any authenticated user can update their own `public.users` row and set `role='system_admin'`.
- App auth state reads role directly from `public.users`:
  - `src/store/useAuthStore.ts:257`
- Route/permission checks then trust that role:
  - `src/components/admin/AdminLayout.tsx:157`
  - `src/auth/permissions.ts:90`

Impact:
- Privilege escalation from normal user to admin-level UI/actions is possible at DB policy level.

### 2. IMPORTANT - RLS grants broader user-management authority than app permission model
Evidence:
- `users_update/users_delete` policy grants CEO/local_leader/system_admin:
  - `supabase/migrations/001_rls_policies.sql:55`
  - `supabase/migrations/001_rls_policies.sql:59`
- App-level `admin:users` is scoped to system admin role permissions:
  - `src/auth/permissions.ts:90`

Impact:
- Direct API access can bypass app-level intent and perform user management outside expected role boundaries.

### 3. IMPORTANT - Notification correctness now depends on external DB setting not enforced in repo
Evidence:
- Hook requires populated `payload.old.status` and skips otherwise:
  - `src/hooks/useApprovalNotifications.tsx:62`
  - `src/hooks/useApprovalNotifications.tsx:66`
- No migration in repo sets replica identity to ensure old row values for `quotes` updates.

Impact:
- In environments without full replica identity for `quotes`, approval notifications will silently not fire.

### 4. IMPORTANT - `database.types.ts` generation remains unresolved
Evidence:
- Still manual with TODO:
  - `src/lib/database.types.ts:5`

Impact:
- Schema drift risk remains, which was a prior important concern.

## Summary
- Round 2 materially improved policy coverage and notification safety logic.
- Approval cannot be granted yet due unresolved CRITICAL privilege-escalation risk in `users_update` policy and remaining IMPORTANT gaps.

