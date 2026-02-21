# CURRENT-PLAN.md - Review-Driven Execution Plan

Generated: 2026-02-21
Sources: `SPEC.md`, `PLAN.md`, `PLAN-REVIEW.md`, direct code verification.

---

## Objective
Turn the review feedback into an executable current-phase plan with explicit dispositions:
- `Accepted`: incorporated into workstream and task list.
- `Considered but rejected`: not adopted as written, with rationale.

---

## Disposition Matrix (PLAN-REVIEW.md)

### 1. Contradictions With Spec

| Review point | Decision | Incorporation |
|---|---|---|
| 1.1 HEAD scope understated | Accepted | Expand count-query remediation to all 11 known `head: true` call sites, not just 3 files. |
| 1.2 `verifyRequiredRpcs` mischaracterized | Accepted (with severity wording adjustment) | Remove startup RPC probes; no runtime quote-ref sequence probing during adapter init. |
| 1.3 “Validated as addressed” claims are uneven | Accepted | Replace blanket claims with file-specific status notes (home dashboard vs CRM/Leads pages). |

### 2. Missing Edge Cases

| Review point | Decision | Incorporation |
|---|---|---|
| 2.1 `setCustomerInfo` can overwrite whole quote state | Accepted | Reclassify as security-sensitive integrity issue; replace `Object.assign` with field whitelist update path. |
| 2.2 `approval_actions` doubly dead (no writes, listener unused) | Accepted | Add explicit decision gate: either implement writes+imports or delete dead notification path. |
| 2.3 Dead code scope understated | Accepted (partial) | Expand dead-code audit beyond initial list; verify each candidate before removal. |

### 3. Security Concerns

| Review point | Decision | Incorporation |
|---|---|---|
| 3.1 RLS work is too late in sequence | Accepted | Move RLS verification/enforcement to Phase 0 (first track). |
| 3.2 Missing security items (auth tamper window, IDOR risk, weak password policy, wildcard sanitization gap, clickjacking headers) | Accepted | Add dedicated security tasks for each item with verification-first wording where runtime state is external (Supabase/Vercel). |
| 3.3 Client-side user creation severity understated | Accepted | Elevate to Phase 0 blocker; move to server-side admin user operations (Edge Function/service role). |
| 3.4 Seed scripts fallback to anon key not covered | Accepted | Add script hardening task: fail fast when service key missing for privileged seed paths. |

### 4. Performance Issues

| Review point | Decision | Incorporation |
|---|---|---|
| 4.1 Major perf gaps missing | Accepted | Add dedicated performance track: unbounded fetches, whole-store subscriptions, expensive recomputation, N+1, and search behavior. |
| 4.2 Existing perf item is least impactful | Accepted | Re-prioritize to address render churn and unbounded query patterns before dashboard dedupe refinements. |

### 5. Simpler Approaches

| Review point | Decision | Incorporation |
|---|---|---|
| 5.1 Auto-generate `database.types.ts` as root fix | Accepted | Add as first schema task before hand-fixing drift items. |
| 5.2 Simpler approval notification path | Accepted (decision required) | Add architecture decision task: keep `approval_actions` as source, or collapse onto `quotes.approval_chain` and remove dead listener path. |
| 5.3 Use automated unused-export tooling | Accepted | Add `knip`/`ts-prune` pass before manual dead-code removals. |

### 6. Unverified Assumptions

| Review point | Decision | Incorporation |
|---|---|---|
| 6.1/6.2 Live schema assumptions not verified | Accepted | Add live-schema verification step before applying column-level migrations/refactors. |
| 6.3 RPC fallback semantics need care | Accepted | Define fallback policy explicitly: no degraded writes that bypass optimistic locking guarantees. |
| 6.4 “already addressed” claims need proof | Accepted | Keep proof-based checklist only (file + behavior evidence). |

### 7. Missing DB Indexes/Constraints

| Review point | Decision | Incorporation |
|---|---|---|
| 7.1 Missing FK discussion | Accepted | Add FK/relationship audit task (including staged rollout plan for existing data). |
| 7.2 Missing index discussion | Accepted | Add query-pattern index design + migration plan. |
| 7.3 Missing uniqueness constraints | Accepted | Add uniqueness review (`quote_ref`, `users.email` in public profile table, company identifiers as policy-driven). |

### 8. API Endpoints / Spec Alignment

| Review point | Decision | Incorporation |
|---|---|---|
| 8.1 `approval_actions` spec/implementation mismatch | Accepted | Resolve source-of-truth and update docs + code accordingly. |
| 8.2 `quote_versions` unused | Accepted | Add keep-or-delete decision with owner and migration impact. |
| 8.3 `quote_collaborators` unused | Accepted | Add keep-or-delete decision with owner and migration impact. |

### 9. Items Absent From PLAN

| Review point | Decision | Incorporation |
|---|---|---|
| 9 (Critical + Important list) | Accepted (prioritized subset in current phase) | Promote high-risk security/perf items into current phase; queue lower-risk technical debt with owners/dates. |

### 10. Recommendations

| Review point | Decision | Incorporation |
|---|---|---|
| Re-phase plan with security foundation first | Accepted | Current phase starts with Security + Schema + Reliability foundations. |
| Add missing items to plan | Accepted | Included in task list below. |
| Fix “Validated As Already Addressed” phrasing | Accepted | Replaced with explicit, evidence-based status language. |

---

## Considered But Rejected (As Written)

1. `PLAN-REVIEW 1.2` wording: “data corruption” from sequence gaps.
Reason: sequence gaps are undesirable but not data corruption; references can remain unique and valid. The issue is startup side effects/noise and operational confusion, not record corruption.

2. `PLAN-REVIEW 3.1/3.3` absolute claims that any authenticated user can read/write/delete any record.
Reason: live Supabase RLS state is external to repo and unverified here. We treat this as a critical *verification-first* risk, not a confirmed runtime fact.

3. `PLAN-REVIEW 4.1` claim that `GlobalSearch` hits backend “on every keystroke”.
Reason: `GlobalSearch` does debounce (200ms). The core issue is still heavy `listCompanies()` usage and unbounded reads; wording adjusted.

4. `PLAN-REVIEW 4.2` “zero performance issues covered”.
Reason: prior `PLAN.md` had one performance item (`3.3`). The review point is directionally right (coverage insufficient), but literal phrasing is inaccurate.

5. `PLAN-REVIEW 2.3` list marks some functions/actions as dead without qualification.
Reason: some candidates are not referenced broadly but require verification before deletion (e.g., store reset paths). We will use automated detection + reference checks before removal.

6. `PLAN-REVIEW 3.2` “SQL injection” wording for unsanitized `customerName` ilike.
Reason: risk is wildcard/query-shape abuse and inconsistent sanitization in PostgREST filter construction; we will fix sanitization but avoid overstating as direct SQL injection.

---

## Current Phase Work Plan

## Track A - Security Foundation (Blockers)

1. Verify and document live RLS status for all sensitive tables (`quotes`, `companies`, `contacts`, `activities`, `leads`, `notifications`, `users`, `audit_log`).
2. If missing/incomplete, implement and migrate RLS policies; commit SQL migration artifacts to repo.
3. Move admin user creation and privileged password operations to server-side (Edge Function/service role).
4. Remove privileged seed-script anon-key fallback for writes; fail fast without service key.
5. Add clickjacking protections in deployment config (`X-Frame-Options` / CSP `frame-ancestors`) where host supports it.
6. Tighten password policy consistency (create/reset paths align to a single policy).
7. Close role tamper window by hard-gating privileged UI/actions on verified server-backed session/role state.
8. Add explicit entity access controls in client + API usage assumptions, but rely on RLS as true enforcement layer.

## Track B - Schema Correctness and Data Integrity

1. Generate `src/lib/database.types.ts` from live Supabase schema.
2. Reconcile adapter/interface drift (`commission_tiers`, `residual_curves`, `users.username`, `audit_log` mappings).
3. Replace `setCustomerInfo` mass assignment with strict whitelist updates.
4. Define/verify DB constraints strategy:
5. FK coverage for logical relationships.
6. Uniqueness constraints for business keys (`quote_ref`, policy-driven user/company identifiers).
7. Add index plan based on actual query patterns (approval counts, ownership filters, lead status, notifications, audit lookups).

## Track C - Reliability and Spec Alignment

1. Replace all known `head: true` count calls with one robust counting strategy.
2. Remove `verifyRequiredRpcs` startup probes that touch runtime RPCs.
3. Define quote-save outage behavior: no fallback path that bypasses optimistic-lock guarantees.
4. Resolve `approval_actions` architecture:
5. Option A: write `approval_actions` and wire notification hooks into app.
6. Option B: remove dead table listener path and use `quotes.approval_chain` updates.
7. Resolve unused schema surfaces (`quote_versions`, `quote_collaborators`) with keep/remove decisions.
8. Fix invalid quote ID behavior (`/quote?id=...`) so failed loads cannot render an editable shell.

## Track D - Performance Stabilization

1. Reduce unbounded reads (`listCompanies`, `listUsers`, large quote list limits).
2. Move ownership/status filtering server-side where possible.
3. Replace whole-store Zustand subscriptions with selectors.
4. Add memoization to expensive computed usage paths (`getQuoteTotals`, `getSlotPricing` consumers).
5. Address N+1 in pending approvals and related user lookup flows.
6. Normalize search behavior (debounce + bounded server queries + pagination strategy).

## Track E - Dead Code and Observability

1. Run unused export analysis (`knip` or equivalent) and produce verified delete list.
2. Remove confirmed dead files/exports (including notification helper path if unused by design).
3. Replace ad-hoc `console.*` noise in critical paths with structured logger usage.
4. Expand regression tests for high-risk flows (save conflict path, approval flow, invalid quote route, security-critical auth/admin paths).

---

## Exit Criteria For Current Phase

1. Security: RLS state verified and documented; privileged admin operations no longer browser-only.
2. Schema: generated types committed; drift issues resolved without `as unknown as` masking.
3. Reliability: no startup RPC side effects; count queries resilient; invalid quote ID safe behavior enforced.
4. Performance: major unbounded reads and whole-store subscriptions materially reduced.
5. Documentation: spec/plan alignment updated after architecture decisions (`approval_actions`, version/collab tables).

---

End of current plan.
