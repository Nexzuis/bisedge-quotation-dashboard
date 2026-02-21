# Front End Fix Final (Combined Codex + Claude)

Date: 2026-02-19
Project: Bisedge Quotation Dashboard

## Sources Compared

- Codex report: `codex/frontend go live frontend report.md`
- Claude report: `claude-audit/frontend-go-live-audit.md`

## Final Verdict

Both audits are directionally correct.

- Codex report is strong on go-live critical UX/wiring issues.
- Claude report is much broader and adds many valid hardening items.
- Several Claude P0 items are real issues but are better classified as P1 (important, not immediate release blocker).

Recommended approach:
- Use this file as the single execution list.
- Fix all P0 items before next deploy.
- Start P1 immediately after P0.

---

## Confirmed Overlap (Both Reports Agree)

1. Builder export route mismatch (`/` vs `/quote`)
- Evidence: `src/components/builder/steps/ExportStep.tsx:205`

2. Company picker "Create New" dead-end action
- Evidence: `src/components/crm/shared/CompanyPickerModal.tsx:107`

3. Shared Button missing explicit safe type default
- Evidence: `src/components/ui/Button.tsx:23`

4. SearchableSelect clear button missing explicit type
- Evidence: `src/components/ui/SearchableSelect.tsx:150`

5. CRM top nav active-state overlap logic
- Evidence: `src/components/crm/CrmTopBar.tsx:86`, `src/components/crm/CrmTopBar.tsx:88`

6. Quotes list sortable headers not keyboard-friendly
- Evidence: `src/components/quotes/QuotesListPage.tsx:152`, `src/components/quotes/QuotesListPage.tsx:154`

7. Icon-only buttons missing consistent `aria-label`
- Evidence examples: `src/components/crm/detail/ContactCard.tsx:32`, `src/components/shared/LoadQuoteModal.tsx:276`

8. New Lead modal close behavior is non-standard/inconsistent
- Evidence: `src/components/crm/CustomerListPage.tsx:246`

9. Very small text concentration in FleetBuilder panel
- Evidence: `src/components/panels/FleetBuilderPanel.tsx:147`

10. CRM kanban loading skeleton fixed 7-column layout
- Evidence: `src/components/crm/CustomerListPage.tsx:193`

11. LoadQuote row uses hardcoded widths in table-like layout
- Evidence: `src/components/shared/LoadQuoteModal.tsx:246`

12. Mixed raw `<button>` and shared `Button` usage causing style drift risk
- Evidence spread across components

---

## New Important Findings From Claude (Accepted)

1. Linked Quotes opens wrong quote context
- Evidence: `src/components/crm/detail/LinkedQuotes.tsx:46`
- Why it matters: click on one quote, app can load another recent quote (because no quote id passed).

2. Admin route-level permission guards missing in route definitions
- Evidence: `src/components/admin/AdminLayout.tsx:138`
- Supporting mismatch: sidebar hides links by permission, but direct URL routes still mount pages.
- Evidence: `src/components/admin/layout/AdminSidebar.tsx:21`

3. Approval dashboard swallows parsing/lookup errors silently
- Evidence: `src/components/admin/approvals/ApprovalDashboard.tsx:98`
- Why it matters: hidden corruption/format issues become invisible operational failures.

4. Notification action uses hash manipulation instead of router navigation
- Evidence: `src/hooks/useApprovalNotifications.tsx:181`

5. Validation hardening gaps on numeric inputs (negative/paste edge cases)
- Evidence: `src/components/builder/steps/QuoteSettingsStep.tsx:78`, `src/components/builder/steps/QuoteSettingsStep.tsx:91`, `src/components/builder/steps/QuoteSettingsStep.tsx:119`, `src/components/builder/steps/QuoteSettingsStep.tsx:133`

6. Modal stale-state risks on reopen
- Evidence:
  - `src/components/shared/LoadQuoteModal.tsx:23`
  - `src/components/shared/QuoteComparisonModal.tsx:55`

7. Unhandled promise path in CRM list user-name preload
- Evidence: `src/components/crm/CustomerListPage.tsx:42`

---

## Severity Calibration (Final)

### P0 (Must Fix Before Next Deploy)

### FEF-P0-1 Linked Quotes route opens wrong quote
- File: `src/components/crm/detail/LinkedQuotes.tsx:46`
- Fix: navigate with id (`/quote?id=${q.id}`) not plain `/quote`.

### FEF-P0-2 Builder export route mismatch
- File: `src/components/builder/steps/ExportStep.tsx:205`
- Fix: route to `/quote`; align button text with destination.

### FEF-P0-3 Company picker "Create New" is dead end
- File: `src/components/crm/shared/CompanyPickerModal.tsx:107`
- Fix: add real create callback flow from client step.

### FEF-P0-4 Admin direct-route authorization gap
- File: `src/components/admin/AdminLayout.tsx:138`
- Fix: add per-route guards based on `hasPermission(...)`, not only sidebar filtering.

### FEF-P0-5 Approval queue error swallowing on critical parse path
- File: `src/components/admin/approvals/ApprovalDashboard.tsx:98`
- Fix: replace empty catch with logged + surfaced error path.

### P1 (High Priority, Immediate Next Wave)

### FEF-P1-1 Shared Button default type safety
- File: `src/components/ui/Button.tsx:23`
- Fix: default `type="button"`.

### FEF-P1-2 SearchableSelect clear button type safety
- File: `src/components/ui/SearchableSelect.tsx:150`
- Fix: add `type="button"`.

### FEF-P1-3 CRM top nav double active-state logic
- File: `src/components/crm/CrmTopBar.tsx:86`
- Fix: exact/pattern route matching so only one nav item is active.

### FEF-P1-4 Quotes sort header accessibility
- File: `src/components/quotes/QuotesListPage.tsx:152`
- Fix: use button inside header + `aria-sort`.

### FEF-P1-5 Icon-only controls need `aria-label`
- Files: e.g. `src/components/crm/detail/ContactCard.tsx:32`, `src/components/shared/LoadQuoteModal.tsx:276`
- Fix: add explicit accessible names.

### FEF-P1-6 ApprovalActionModal keyboard handling intentionally disabled
- File: `src/components/shared/ApprovalActionModal.tsx:202`
- Fix: restore Escape close behavior (unless processing state forbids).

### FEF-P1-7 EditModal blocks keyboard propagation globally
- File: `src/components/admin/shared/EditModal.tsx:30`
- Fix: remove blanket stopPropagation; handle only specific keys if needed.

### FEF-P1-8 Notification action should use router-safe navigation
- File: `src/hooks/useApprovalNotifications.tsx:181`
- Fix: use navigation abstraction rather than direct hash mutation.

### FEF-P1-9 Numeric input clamp/validation hardening
- File: `src/components/builder/steps/QuoteSettingsStep.tsx:78`
- Fix: enforce min/max in change handlers, not only HTML attributes.

### FEF-P1-10 Modal state reset on close/reopen
- Files:
  - `src/components/shared/LoadQuoteModal.tsx:23`
  - `src/components/shared/QuoteComparisonModal.tsx:55`
- Fix: reset filters/selections on close.

### FEF-P1-11 Add missing promise error handling in CRM preload
- File: `src/components/crm/CustomerListPage.tsx:42`
- Fix: add `.catch` with safe fallback.

### P2 (Polish / Consistency)

### FEF-P2-1 Kanban layout and loading responsiveness
- Files:
  - `src/components/crm/list/KanbanBoard.tsx:79`
  - `src/components/crm/CustomerListPage.tsx:193`

### FEF-P2-2 FleetBuilder very small text cleanup
- File: `src/components/panels/FleetBuilderPanel.tsx:147`

### FEF-P2-3 LoadQuote table width hardcoding cleanup
- File: `src/components/shared/LoadQuoteModal.tsx:246`

### FEF-P2-4 Standardize button patterns across app
- Scope: broad (raw button replacement where appropriate)

### FEF-P2-5 Modal UX consistency standard (backdrop, focus, Esc)
- Scope: all app modals

---

## Severity Differences vs Claude (Final Position)

Downgraded from Claude P0 to P1/P2:

1. Kanban width requirement
- Reason: has horizontal scroll fallback already (`overflow-x-auto`), so not a hard blocker.

2. "No backdrop close on all modals"
- Reason: important UX consistency issue, but not universally a blocker if close buttons/Escape exist.

3. EditModal and ApprovalActionModal keyboard behaviors
- Reason: serious usability/a11y issues, but operationally better classified as P1.

---

## Combined Fix Waves

### Wave 0 (Today - Blockers)
1. FEF-P0-1
2. FEF-P0-2
3. FEF-P0-3
4. FEF-P0-4
5. FEF-P0-5

### Wave 1 (Immediately after Wave 0)
1. FEF-P1-1
2. FEF-P1-2
3. FEF-P1-3
4. FEF-P1-4
5. FEF-P1-5
6. FEF-P1-6
7. FEF-P1-7
8. FEF-P1-8
9. FEF-P1-9
10. FEF-P1-10
11. FEF-P1-11

### Wave 2 (Hardening / Polish)
1. FEF-P2-1
2. FEF-P2-2
3. FEF-P2-3
4. FEF-P2-4
5. FEF-P2-5

---

## Go-Live Readiness Rule

- Do not push final go-live release until all P0 items are complete and manually verified on desktop + mobile viewport.
- P1 can be parallelized but should be scheduled immediately after P0 before expanding user count.

---

## Implementation Result (Post-Fix)

Date: 2026-02-19

| Fix ID | Status | Files Changed | Notes |
|---|---|---|---|
| FEF-P0-1 | Completed | `LinkedQuotes.tsx` | Navigate with `q.id` |
| FEF-P0-2 | Completed | `ExportStep.tsx` | Route to `/quote`, label "Back to Quote" |
| FEF-P0-3 | Completed | `CompanyPickerModal.tsx`, `ClientInfoStep.tsx` | `onCreateNew` prop wired to `/customers` |
| FEF-P0-4 | Completed | `AdminLayout.tsx` | `RequirePermission` wrapper per route |
| FEF-P0-5 | Completed | `ApprovalDashboard.tsx` | 4 catch blocks now log errors |
| FEF-P1-1 | Completed | `Button.tsx` | Default `type="button"` |
| FEF-P1-2 | Completed | `SearchableSelect.tsx` | `type="button"` + `aria-label` |
| FEF-P1-3 | Completed | `CrmTopBar.tsx` | Exact path + child matching |
| FEF-P1-4 | Completed | `QuotesListPage.tsx` | `<button>` with `aria-sort` |
| FEF-P1-5 | Completed | 7 files | 12 `aria-label` attributes added |
| FEF-P1-6 | Completed | `ApprovalActionModal.tsx` | Escape closes when not processing |
| FEF-P1-7 | Completed | `EditModal.tsx` | Escape only, no stopPropagation |
| FEF-P1-8 | Deferred | — | Works correctly with HashRouter |
| FEF-P1-9 | Completed | `QuoteSettingsStep.tsx` | `Math.max/min` clamping |
| FEF-P1-10 | Completed | `LoadQuoteModal.tsx`, `QuoteComparisonModal.tsx` | useEffect reset on close |
| FEF-P1-11 | Completed | `CustomerListPage.tsx` | `.catch()` on user preload |
| FEF-P2-1 | Completed | `CustomerListPage.tsx` | Responsive grid classes |
| FEF-P2-2 | Completed | `FleetBuilderPanel.tsx` | `text-[10px]` -> `text-xs` globally |
| FEF-P2-3 | Completed | `LoadQuoteModal.tsx` | Tailwind width classes |
| FEF-P2-4 | Deferred | — | Wide-reaching, low functional risk |
| FEF-P2-5 | Completed | 6 modal files | Backdrop click-to-close |

### Validation
- `npx tsc --noEmit`: 0 errors
- `npx vitest run`: 96/96 passed
- `npx vite build`: Clean build

---

## Bug Fix Sprint — Round 2 Corrective Fixes (2026-02-21)

After code review of the initial 17-bug fix pass, 9 corrective fixes were applied to address partial fixes and regressions.

### Files Modified

| File | Bugs Fixed | Change Summary |
|------|-----------|----------------|
| `src/store/useQuoteStore.ts` | #2, #3 | Added `_lastSavedAt` field + `markSaved()` action; deep-merge slots by `slotIndex` in `loadQuote()` |
| `src/hooks/useRealtimeQuote.ts` | #3 | Replaced broken epoch heuristic with `updatedAt > _lastSavedAt` |
| `src/hooks/useAutoSave.ts` | #3 | Call `markSaved()` after successful save |
| `src/hooks/usePriceList.ts` | #27 | `requestIdRef` in `useSeriesData`, `useSeriesModels`, `useModelOptions` |
| `src/engine/commissionEngine.ts` | #9 | Half-open `[min, max)` with last-tier fallback (3 callsites) |
| `src/engine/formatters.ts` | #18 | `Number.isFinite()` guard on `formatNumber` and `formatCompact` |
| `src/components/GlobalSearch.tsx` | #20 | `stopImmediatePropagation()` on Escape |
| `src/store/useAuthStore.ts` | #6 | `resetDbAdapter()` on logout |
| `src/hooks/useQuoteLock.ts` | #4 | Removed `lockedBy` from main effect deps |
| `src/engine/containerOptimizer.ts` | #22 | Added `containerHeight > 0` check |
| `src/engine/approvalEngine.ts` | #23 | `getNextStatus` returns `null` for invalid transitions |
| `src/hooks/useApprovalActions.ts` | #23 | Check `null` return, show error toast |
| `src/components/admin/approvals/ApprovalDashboard.tsx` | #23 | Check `null` return, show error toast |
| `src/components/dashboard/widgets/PendingApprovalsWidget.tsx` | #23 | Check `null` return, show error toast |

### Validation (Post Round 2)
- `npx tsc --noEmit`: 0 errors
- `npx vitest run`: 122/122 passed
