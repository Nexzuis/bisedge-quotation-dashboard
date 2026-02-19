# Claude Code Deep Audit — Bisedge Quotation Dashboard

> Independent deep codebase audit performed by Claude Code (Opus 4.6)
> Date: 2026-02-19

---

## Validation Snapshot

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run test` | PASS (90/90 tests) |
| `npm run lint` | FAIL — 72 errors, 553 warnings |

These results match the Codex audit snapshot exactly.

---

## Scope

- **Codebase:** ~230 source files, React 19 + TypeScript + Vite SPA
- **Architecture:** Offline-first hybrid (Dexie/IndexedDB local, Supabase cloud sync)
- **State:** Zustand 5 with Immer middleware (4 stores)
- **Database:** Dexie 4, 6 schema versions, ~20 tables
- **Audit method:** 8 parallel investigation workstreams reading every relevant file

---

## Findings Summary

### Codex Confirmation

All **14 Codex findings confirmed** with independent code evidence:

| Codex ID | Title | Our Verdict |
|----------|-------|-------------|
| P0-1 | Quote deep links broken | CONFIRMED (WS-A-1) |
| P0-2 | Autosave race condition | CONFIRMED (WS-A-2) |
| P0-3 | Logistics data not persisted | CONFIRMED (WS-F-7) |
| P0-4 | CRM access control failures | CONFIRMED (WS-D-2, D-3, D-4) |
| P0-5 | Backup/restore coverage gaps | CONFIRMED (WS-D-5, D-6, D-7, H-8) |
| P1-1 | Legacy battery field still active | CONFIRMED (WS-C-13) |
| P1-2 | Auth seed inconsistencies | CONFIRMED (WS-C-11, D-12) |
| P1-3 | ROE mismatch (19.73 vs 20.60) | CONFIRMED (WS-C-9) |
| P1-4 | Supabase module-level throw | CONFIRMED (WS-H-1) |
| P1-5 | Lint errors blocking CI | CONFIRMED (validation snapshot) |
| P2-1 | Serialization edge cases | CONFIRMED (WS-C-2, C-3) |
| P2-2 | Schema migration gaps | CONFIRMED (WS-C-5, C-6) |
| P2-3 | Presence feature partially implemented | CONFIRMED (WS-H-2, H-3) |
| P3-1 | Dead code (useAuthStore.v2) | CONFIRMED (WS-E-8) |

### New Findings by Claude

| Severity | Count | Examples |
|----------|-------|---------|
| **P0** | 6 | IRR uses wrong cost basis, margins inflated 2-3x, PDF shows wrong costs |
| **P1** | 23 | Commission overpayment, PMT division-by-zero, admin route bypass, no login rate limiting |
| **P2** | 52 | Container optimizer is 1D not 3D, ROE changes not propagated, clearing charges frozen, full-store subscriptions causing render storms |
| **P3** | 17 | Dead code, informational, minor UX issues |
| **Total** | **98 new findings** | |

### Grand Total: 112 findings (14 confirmed + 98 new)

---

## Report Files

| # | File | Purpose |
|---|------|---------|
| 1 | [`codex-confirmation-report.md`](./codex-confirmation-report.md) | Item-by-item confirmation of all 14 Codex findings |
| 2 | [`new-findings-report.md`](./new-findings-report.md) | All 98 NEW issues (P0–P3) with evidence, impact, fix direction |
| 3 | [`architecture-deep-dive.md`](./architecture-deep-dive.md) | Full architecture analysis — layers, data flow, patterns |
| 4 | [`remediation-plan.md`](./remediation-plan.md) | Prioritized fix plan: Wave 0 (same-day), Wave 1 (72h), Wave 2 (1–2 weeks) |

---

## Reading Order

1. **Start here** (this file) for the executive summary
2. **`codex-confirmation-report.md`** to verify all Codex findings were validated
3. **`new-findings-report.md`** for the full list of new issues — start with P0s
4. **`architecture-deep-dive.md`** for background context on how the system works
5. **`remediation-plan.md`** for the prioritized fix plan and execution order

---

## Critical Path — What to Fix First

The **most impactful bugs** that should be addressed before any production use:

1. **Financial calculations are fundamentally wrong** — Margins use `factoryCostZAR` instead of `landedCostZAR`, inflating reported margins by 2-3x. IRR uses the same wrong cost basis. Commission tiers cascade from inflated margins, potentially overpaying salespeople by thousands of ZAR per deal. (WS-B-2, B-3, B-5)

2. **PDF output is unreliable** — The customer-facing PDF uses deprecated zero-value fields for cost breakdown, always defaults to "rental" type regardless of user selection, and shows "John Smith" as signatory. (WS-G-1, F-8, F-9, G-16)

3. **Quote navigation is broken** — 8 navigation sites generate `/quote?id=<uuid>` links that are silently ignored. Users always get their most recent quote instead. (WS-A-1)

4. **Triple autosave race** — 3-4 concurrent autosave instances cause version conflicts and spurious "modified in another tab" warnings. (WS-A-2, E-3)

5. **CRM data is wide open** — All companies visible to all users regardless of role. No ownership checks on detail pages. Admin routes accessible to sales_manager. (WS-D-2, D-3, D-4, D-8)

---

## Workstream Index

| WS | Focus Area | Findings |
|----|-----------|----------|
| A | Routing, Deep Links, Autosave | 8 findings (2 P0, 3 P1, 3 P2) |
| B | Financial Calculations | 18 findings (2 P0, 3 P1, 7 P2, 6 P3) |
| C | Data Integrity — Serialization, Migration, Seed | 18 findings (0 P0, 3 P1, 11 P2, 4 P3) |
| D | Security — Auth, RBAC, Injection | 20 findings (3 P0, 10 P1, 6 P2, 1 P3) |
| E | State Management — Zustand Races, Memory | 14 findings (0 P0, 2 P1, 10 P2, 2 P3) |
| F | Quote Builder Wizard | 17 findings (0 P0, 5 P1, 8 P2, 4 P3) |
| G | PDF Generation | 18 findings (1 P0, 2 P1, 9 P2, 6 P3) |
| H | Realtime, Sync, Error Handling | 11 findings (1 P0, 1 P1, 7 P2, 2 P3) |

---

*Generated by Claude Code (Opus 4.6) — Deep Codebase Audit*
