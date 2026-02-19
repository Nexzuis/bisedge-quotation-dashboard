# Frontend Go-Live Audit Report

Date: 2026-02-19  
Scope: Frontend-only audit for UI wiring, button behavior, sizing/responsive consistency, and accessibility risks.

## Executive Summary

Overall status: **Needs targeted fixes before full confidence go-live**.

- P0 findings: 2
- P1 findings: 6
- P2 findings: 4

Good news:
- Core route wiring and most major actions are connected.
- No obvious empty `onClick` handlers were found in the main surfaces.
- Build/lint/typecheck gates are currently passing.

Main risk theme:
- A few visible UI actions are misleading or partially wired, and there are several consistency/accessibility issues that can create operator mistakes with a 30-user rollout.

## Audit Coverage

Reviewed key surfaces and shared primitives:
- `src/App.tsx`, `src/Dashboard.tsx`, `src/components/layout/*`
- Quote dashboard panels and builder steps
- CRM list/detail flows and modals
- Quotes list and load/revision modal
- Admin top-level nav/actions
- Shared UI primitives (`Button`, `Input`, `SearchableSelect`)

## P0 Findings (Urgent)

### P0-1: Builder export "Back to Dashboard" goes to wrong route
- Evidence: `src/components/builder/steps/ExportStep.tsx:191`, `src/components/builder/steps/ExportStep.tsx:205`
- Current behavior: button label says "Back to Dashboard" / "Open Dashboard" but route is `navigate('/')` (home dashboard), not quote workspace (`/quote`).
- Risk: user thinks they are returning to quote dashboard but lands on home; creates navigation confusion in final quote workflow.
- Fix direction:
  - Change route to `navigate('/quote')`.
  - Keep wording aligned with destination (Quote Dashboard vs Home Dashboard).

### P0-2: Company picker has a dead-end action ("Create New")
- Evidence: `src/components/crm/shared/CompanyPickerModal.tsx:108`
- Supporting wiring gap: `src/components/builder/steps/ClientInfoStep.tsx:262`
- Current behavior: clicking "Create New" only calls `onClose()` and does not open any create-company flow.
- Risk: users click a primary intent action and nothing useful happens; they can assume the system is broken.
- Fix direction:
  - Add `onCreateNew` callback to modal props.
  - Wire it from `ClientInfoStep` to open a company creation flow (inline modal or route state to `/customers` with `openNewLead`).
  - Update text if no creation flow is allowed in this context.

## P1 Findings (High Priority)

### P1-1: Shared `Button` has no safe default `type`
- Evidence: `src/components/ui/Button.tsx:23`
- Current behavior: internal `<button>` has no explicit `type`.
- Risk: in form contexts, browser default is `submit`; future usages can accidentally submit forms.
- Fix direction:
  - Set default `type="button"` in shared `Button` component.
  - Keep explicit `type="submit"` only where intended.

### P1-2: `SearchableSelect` clear button has no explicit type
- Evidence: `src/components/ui/SearchableSelect.tsx:150`
- Current behavior: clear button inside dropdown uses `<button>` without `type`.
- Risk: same accidental submit risk when component is used in form contexts.
- Fix direction:
  - Add `type="button"` to the clear button.

### P1-3: CRM top nav can show two active states on `/admin/approvals`
- Evidence: `src/components/crm/CrmTopBar.tsx:86`, `src/components/crm/CrmTopBar.tsx:88`, `src/components/crm/CrmTopBar.tsx:103`, `src/components/crm/CrmTopBar.tsx:143`, `src/components/crm/CrmTopBar.tsx:129`, `src/components/crm/CrmTopBar.tsx:153`
- Current behavior: `isActive` uses `startsWith(path)`, so `/admin/approvals` can activate both Admin and Approvals nav items; both use `layoutId="nav-active"`.
- Risk: flickering/incorrect active indicator and confusing nav emphasis.
- Fix direction:
  - Make route matching exact for `/admin` and explicit for `/admin/approvals`.
  - Ensure only one nav item can be active at a time.

### P1-4: Sort headers are clickable `<th>` elements (not keyboard-friendly controls)
- Evidence: `src/components/quotes/QuotesListPage.tsx:152`, `src/components/quotes/QuotesListPage.tsx:154`
- Current behavior: sorting is attached directly to `<th onClick>`.
- Risk: poorer keyboard and accessibility behavior vs `<button>` inside header.
- Fix direction:
  - Wrap sort action in a semantic `<button>` inside the header cell.
  - Add `aria-sort` metadata on active sorted column.

### P1-5: Icon-only action buttons missing explicit accessible names
- Evidence examples:
  - `src/components/crm/detail/ContactCard.tsx:32`
  - `src/components/crm/detail/ContactCard.tsx:35`
  - `src/components/shared/LoadQuoteModal.tsx:276`
  - `src/components/shared/LoadQuoteModal.tsx:283`
  - `src/components/shared/LoadQuoteModal.tsx:290`
  - `src/components/crm/shared/CompanyPickerModal.tsx:55`
- Current behavior: several icon-only buttons rely only on visuals or `title`.
- Risk: screen reader ambiguity and weaker accessibility compliance.
- Fix direction:
  - Add `aria-label` for all icon-only buttons.

### P1-6: New Lead modal backdrop behavior is non-standard and can feel stuck
- Evidence: `src/components/crm/CustomerListPage.tsx:245`, `src/components/crm/CustomerListPage.tsx:246`
- Current behavior: backdrop click handler uses `stopPropagation`, so outside click does not close.
- Risk: users may think modal is unresponsive if they expect backdrop-close behavior.
- Fix direction:
  - Either implement deliberate backdrop close or make intent explicit (close button + helper text).

## P2 Findings (Polish / Consistency)

### P2-1: Very small text usage in dense fleet panel
- Evidence: `src/components/panels/FleetBuilderPanel.tsx:147`, `src/components/panels/FleetBuilderPanel.tsx:191`, `src/components/panels/FleetBuilderPanel.tsx:515`
- Current behavior: many controls/labels use `text-[10px]`.
- Risk: readability strain for frequent operational use.
- Fix direction:
  - Raise key controls to at least `text-xs` for interactive readability.

### P2-2: Loading skeleton for CRM kanban forces 7 columns on small screens
- Evidence: `src/components/crm/CustomerListPage.tsx:193`
- Current behavior: loading state uses fixed `grid-cols-7`.
- Risk: cramped/unstable layout on mobile widths during load.
- Fix direction:
  - Use responsive column strategy (stack + horizontal scroll where needed).

### P2-3: Load Quote row layout relies on hardcoded width percentages
- Evidence: `src/components/shared/LoadQuoteModal.tsx:246`, `src/components/shared/LoadQuoteModal.tsx:258`, `src/components/shared/LoadQuoteModal.tsx:262`, `src/components/shared/LoadQuoteModal.tsx:265`
- Current behavior: mixed fixed width percentages + action cluster.
- Risk: truncation/crowding under narrow widths.
- Fix direction:
  - Convert to responsive table/card layout at small breakpoints.

### P2-4: Mixed raw button styling vs shared button primitive
- Evidence spread across many components (e.g. `src/components/quotes/QuotesListPage.tsx:176`, `src/components/admin/layout/AdminTopBar.tsx:18`)
- Current behavior: both shared `Button` and many custom raw buttons coexist.
- Risk: style drift over time (size/hover/focus inconsistencies).
- Fix direction:
  - Standardize primary/secondary action patterns on shared `Button` where practical.

## Action Wiring Matrix (Key Flows)

| Surface | Action | Status | Notes |
|---|---|---|---|
| TopBar | Export PDF | OK | Properly wired to PDF generator. |
| TopBar | Load Quote | OK | Opens load modal and loads selected quote. |
| Builder Export | Open Dashboard | **Broken/Misleading** | Routes to `/` instead of `/quote`. |
| Client Info Company Picker | Create New | **Broken** | Closes modal only; no create flow. |
| Client Info Company Picker | Skip (no company) | Partial | Does not actively clear existing linked company when invoked from linked context. |
| CRM List | New Lead | OK | Opens create lead modal. |
| Quotes List | Row click | OK | Loads quote via `/quote?id=...`. |
| CRM Top Nav | Admin vs Approvals active state | Partial | Can show dual-active highlight conflict. |
| Load Quote Modal | Compare/Duplicate/Delete | OK (functional) | Accessibility naming needs hardening. |

## Recommended Fix Order (Today)

1. Fix P0-1 and P0-2 first.
2. Apply P1-1 and P1-2 immediately (safe, low-risk correctness hardening).
3. Fix P1-3 and P1-4 next (navigation clarity + keyboard/a11y).
4. Patch P1-5 and P1-6 for operator UX consistency.
5. Batch P2 items as a focused UI polish pass.

## Verification Checklist After Fixes

- Builder Export "Open Dashboard" lands on `/#/quote`.
- Company picker "Create New" opens a real create-company path.
- No accidental form submits from non-submit buttons.
- `/admin/approvals` shows only one active nav highlight.
- Quotes sort works by keyboard and announces sort state.
- Icon-only buttons have `aria-label` in quote/crm modals and cards.
- CRM New Lead modal close behavior is consistent and predictable.

## Notes

This report is based on static frontend code audit with line-level verification and go-live priority filtering. It is intentionally focused on workflow correctness and operator-risk reduction, not visual redesign.
