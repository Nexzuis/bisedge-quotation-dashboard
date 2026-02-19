# Phase 0: Baseline Evidence

**Tester**: Claude (Opus 4.6)
**Date**: 2026-02-19
**Environment**: Local development (bisedge-quotation-dashboard)
**Commit Hash**: `df1e273` (HEAD of main)
**Commit Message**: "Hybrid sync hardening: session guards, quote-ref conflict remediation, pre-auth autosave"

---

## 1. Release Candidate Commit

| Item | Value |
|------|-------|
| Branch | `main` |
| Commit | `df1e273` |
| Parent commits | `0d88b22`, `c448c1c`, `d66b075`, `eb0b7d6` |
| Status | Dirty working tree (migration changes not yet committed) |

**NOTE**: The working tree has uncommitted migration changes (Supabase-only migration). These changes are the release candidate but have not been committed yet.

## 2. Build Status (Pre-Fix Baseline)

| Gate | Result | Details |
|------|--------|---------|
| `npx tsc --noEmit` | **PASS** | 0 errors, exit code 0 |
| `npm run test` (vitest) | **PASS** | 96/96 tests pass (4 test files, 1.35s) |
| `npx vite build` | **PASS** | Built in 12.29s, 2676 modules transformed |

## 3. Test Suite Breakdown

| Test File | Tests | Status |
|-----------|-------|--------|
| `src/auth/__tests__/permissions.test.ts` | 4 | PASS |
| `src/db/__tests__/serialization.test.ts` | 13 | PASS |
| `src/engine/__tests__/calculationEngine.test.ts` | 50 | PASS |
| `src/engine/__tests__/formatters.test.ts` | 29 | PASS |
| **Total** | **96** | **ALL PASS** |

## 4. Supabase Backup

- **Status**: NOT CONFIRMED by automated check
- **Action Required**: User must confirm Supabase backup snapshot exists and is timestamped before write tests begin

## 5. Test Users

| Role | Available | Notes |
|------|-----------|-------|
| `system_admin` | TBC | Must verify in Supabase `users` table |
| `sales_manager` | TBC | Must verify in Supabase `users` table |
| `sales_rep` | TBC | Must verify in Supabase `users` table |

## 6. Prerequisite Fixes Status

All 4 prerequisite fixes identified in the plan are **NOT YET APPLIED** (report-only mode):

| Fix | Description | Status | Severity |
|-----|-------------|--------|----------|
| A | `merge_companies` RPC missing 13 fields | **DEFECT - NOT FIXED** | P1 |
| B | Stale lock timeout missing in `isLockedByOther` | **DEFECT - NOT FIXED** | P1 |
| C | SupabaseTestPage exposed in production | **DEFECT - NOT FIXED** | P1 |
| D | Console.log noise in production (7+ files) | **DEFECT - NOT FIXED** | P2 |

See `14-defects.md` for full defect details.

---

## Phase 0 Verdict: **CONDITIONAL PASS**

Build gates pass. 4 prerequisite defects documented but not applied (per instruction: report only, no code changes).
