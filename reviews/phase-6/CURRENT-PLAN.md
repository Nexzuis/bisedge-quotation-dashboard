# CURRENT-PLAN.md — Phase 6: Pre-Launch Audit Fixes

Created: 2026-02-22
Sources: Full codebase audit by 4 specialized agents (state, data, logic, UI), verified by lead agent.

---

## Audit Summary

A comprehensive 4-agent codebase audit was performed across all layers:
- **State management & navigation** (9 reported bugs)
- **Data layer, Supabase, serialization** (10 reported bugs)
- **Business logic, calculations, approval workflow** (16 reported bugs)
- **UI components, forms, modals, UX flows** (22 reported bugs)

**Result:** 57 total reported issues. After rigorous verification against the actual codebase, **54 were false positives** — already fixed in Phases 1-5. Only **3 confirmed real issues** remain, all in a single area.

This is good news: Phases 1-5 were thorough and the codebase is in strong shape for launch. This phase addresses the remaining gaps.

---

## Confirmed Bugs

### BUG-1: `getMostRecentQuote()` has no ownership filter (HIGH)

**Where:** `src/db/SupabaseAdapter.ts:444-460`
**Root Cause:** Query selects `*` from `quotes` ordered by `updated_at` with no `created_by` or `assigned_to` filter. The RLS `quotes_select` policy is `USING (true)` (intentionally open for manager visibility), so the query returns ANY user's most recent quote.
**Impact:** User A logs in and sees User B's quote loaded automatically. Data leak + confusing UX. This was part of the "New Quote loads stale data" bug the user reported.
**Fix:** Filter by current authenticated user: `created_by = user.id OR assigned_to = user.id`.

### BUG-2: `DatabaseAdapter` interface missing ownership parameter (LOW)

**Where:** `src/db/DatabaseAdapter.ts:40`
**Root Cause:** `getMostRecentQuote()` interface takes no parameters. The implementation needs the user ID to filter.
**Impact:** Interface contract doesn't match the required fix.
**Fix:** The Supabase adapter already has access to `supabase.auth.getUser()` internally, so no interface change needed — the adapter can fetch the user ID itself, consistent with how `save()`, `saveCustomer()`, etc. already work.

### BUG-3: Quote dashboard fallback also calls `getMostRecentQuote()` without ownership (LOW)

**Where:** `src/Dashboard.tsx:51`
**Root Cause:** When no `quoteId` is in the URL, Dashboard falls back to `loadMostRecent()`, which hits the same unfiltered query.
**Impact:** Same as BUG-1 — shows wrong user's quote on the quote dashboard page.
**Fix:** Resolved automatically when BUG-1 is fixed (same code path).

---

## Fix Plan

### Wave 1: Ownership-Filtered Quote Loading (BUG-1, BUG-2, BUG-3)

**Goal:** Ensure `getMostRecentQuote()` only returns quotes belonging to the authenticated user.

| Step | File | Change |
|------|------|--------|
| 1a | `SupabaseAdapter.ts:444-460` | Add `supabase.auth.getUser()` call, then filter query with `.or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)` |
| 1b | Verify `Dashboard.tsx:51` | Confirm `loadMostRecent()` now returns user-scoped results (no code change needed — same underlying method) |
| 1c | Verify `App.tsx:125` | Confirm initial app load also uses the fixed path (no code change needed) |

---

## Testing Strategy

1. `npm run typecheck` — 0 errors
2. `npm run test` — all 178 tests pass
3. `npm run build` — succeeds
4. Manual browser test:
   - Log in as User A (louisenh270@gmail.com). Create a quote. Log out.
   - Log in as User B. Navigate to home/quote dashboard. Verify User A's quote does NOT load.
   - Log back in as User A. Verify User A's quote loads correctly.
   - Test "New Quote" flow still works (no stale data loaded).

---

## Risks

1. **Role-based visibility:** Managers/CEOs intentionally need to see all quotes in list views. This fix only affects the "load most recent" auto-load — list/search queries remain unfiltered (correct behavior for managers).
2. **No quotes scenario:** If a new user has never created a quote, `getMostRecentQuote()` already returns `null` — no change needed.

---

## Out of Scope

- Quote list visibility filtering by role (intentionally open for managers)
- RLS policy changes (SELECT open by design)
- All 54 false-positive findings from the audit (verified as already fixed in Phases 1-5)
