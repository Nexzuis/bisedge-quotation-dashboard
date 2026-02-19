# Go-Live Decision: Supabase-Only Cutover

- Timestamp: 2026-02-19 17:49:03 +02:00
- Verifier: Codex
- Commit: `df1e273`

## Decision

GO (Supabase cutover gates passed).

Reason:

Code-level, build/test, and live Supabase DB/RLS/RPC validation are now all complete and passing.

## What Passed

1. All targeted local/hybrid files removed.
2. All grep gates passed (zero forbidden patterns in `src/`).
3. Adapter/repository/auth refactors are in place.
4. Typecheck passed.
5. Tests passed (96/96).
6. Production build passed.
7. Company merge RPC SQL file exists and hook calls RPC.

## Blocking Items (P0)

None remaining from cutover verification gates.

## Non-Blocking Items

## P1

1. Build has non-blocking dynamic/static import warnings.

## P2

1. Stale comments in `src/hooks/useCompanyMerge.ts` still mention Dexie transactions.

## Final Notes

1. Supabase verification evidence is recorded in `codex/verification-supabase-checks.md`.
2. Recommended final manual smoke pass (app-level, role-based flows) should still be completed immediately before production deployment.
