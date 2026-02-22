# PLAN-REVIEW.md

Review date: 2026-02-22  
Reviewer: Codex  
Plan reviewed: `CURRENT-PLAN.md` (v2, updated 2026-02-22)

## Findings

### IMPORTANT

1. Stale-lock bypass condition needs explicit null handling for `locked_at`.
- Where: `CURRENT-PLAN.md:134`
- Problem: Wave 3 proposes rejecting saves only when another user holds a lock and `locked_at > NOW() - INTERVAL '1 hour'`. If `locked_at` is `NULL` (legacy/corrupt/manual data), SQL three-valued logic can treat the condition as not true and incorrectly allow writes.
- Required change: In the migration spec, define null behavior explicitly. Recommended: treat `NULL locked_at` as active/fresh lock (reject), e.g. use `COALESCE(locked_at, NOW()) > NOW() - INTERVAL '1 hour'`.

### MINOR

2. “Verified in migrations” statement for `audit_log.user_id` FK is not evidenced by repo migrations.
- Where: `CURRENT-PLAN.md:17`, `CURRENT-PLAN.md:172`
- Problem: Current migration files include RLS/policies/indexes for `audit_log`, but not table DDL showing FK constraints.
- Required change: Reword to “verified in database schema” (or add explicit evidence source in notes), not “verified in migrations.”

## What Improved vs v1

- Recursion-safe cross-tab logout flow is now concretely designed (`CURRENT-PLAN.md:92-114`).
- Documentation-only stale-lock fix was replaced with concrete SQL/RPC implementation work (`CURRENT-PLAN.md:134`).
- Wave 2 scope now correctly treats adapter slot parsing as defensive hardening, not primary fix (`CURRENT-PLAN.md:116-124`).
- H1 is correctly moved out of in-scope commitments (`CURRENT-PLAN.md:129`, `CURRENT-PLAN.md:217`).
- Lock threshold and manual test timing are aligned to the 1-hour strategy (`CURRENT-PLAN.md:127`, `CURRENT-PLAN.md:198`).
- Redundant H7/sort step removed.

## Verdict

`CURRENT-PLAN.md` is **conditionally approved** pending the 1 IMPORTANT amendment above.  
After that wording/logic tweak, plan is ready for implementation.

