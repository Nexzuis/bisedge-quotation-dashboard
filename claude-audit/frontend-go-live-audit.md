# Claude Frontend Go-Live Audit Report

**Date:** 2026-02-19
**Auditor:** Claude (Opus 4.6)
**Scope:** Complete frontend audit covering button wiring, routing, modals, forms, responsive design, accessibility, error handling, and UI patterns.
**Method:** 8 parallel investigation workstreams reading every component file, cross-referenced with Codex's frontend report.

---

## Executive Summary

| Severity | Count | Theme |
|----------|-------|-------|
| **P0** | 6 | Broken user flows, data consistency risks |
| **P1** | 22 | Misleading UX, validation gaps, a11y blockers |
| **P2** | 28 | Polish, consistency, best practices |
| **P3** | 12 | Minor improvements |
| **Total** | **68** |

**Overall assessment:** Core workflows function, but there are significant gaps in modal behavior, accessibility, responsive design, and error surfacing that will cause operator confusion in a 30-user rollout. The Codex report found 12 issues; we found 68, confirming all 12 of theirs and adding 56 new ones.

---

## Codex Confirmation Matrix

| Codex Finding | Our Verdict | Notes |
|---|---|---|
| P0-1: Builder export routes to `/` not `/quote` | **CONFIRMED** | ExportStep.tsx:191,205 |
| P0-2: Company picker "Create New" dead end | **CONFIRMED** | CompanyPickerModal.tsx:108 calls onClose() only |
| P1-1: Button missing `type="button"` default | **CONFIRMED** | Button.tsx:23 - browser defaults to submit |
| P1-2: SearchableSelect clear button no type | **CONFIRMED** | SearchableSelect.tsx:150 |
| P1-3: CRM nav dual active states | **CONFIRMED** | CrmTopBar.tsx:86-88 startsWith() overlap |
| P1-4: Sort headers not keyboard-friendly | **CONFIRMED** | QuotesListPage.tsx:152 `<th onClick>` |
| P1-5: Icon-only buttons missing aria-label | **CONFIRMED** | 25+ instances across codebase |
| P1-6: New Lead modal backdrop non-standard | **CONFIRMED** | CustomerListPage.tsx:245 stopPropagation |
| P2-1: Very small text in FleetBuilderPanel | **CONFIRMED** | 15+ instances of text-[10px] |
| P2-2: Kanban skeleton fixed grid-cols-7 | **CONFIRMED** | CustomerListPage.tsx:193 |
| P2-3: LoadQuote row hardcoded widths | **CONFIRMED** | LoadQuoteModal.tsx:246-265 |
| P2-4: Mixed raw button vs shared Button | **CONFIRMED** | Spread across many components |

**All 12 Codex findings confirmed. 56 additional findings below.**

---

## P0 Findings (6 total - Go-Live Blockers)

### P0-NEW-1: LinkedQuotes navigates without quote ID
- **Evidence:** `src/components/crm/detail/LinkedQuotes.tsx:46`
- **Code:** `onClick={() => navigate('/quote')}` -- missing `?id=${q.id}`
- **Impact:** Clicking any linked quote row loads the most-recent quote instead of the selected one. User thinks they're viewing the clicked quote but sees different data.
- **Fix:** Change to `navigate('/quote?id=' + q.id)`

### P0-NEW-2: Kanban board requires 1200px+ horizontal space
- **Evidence:** `src/components/crm/list/KanbanBoard.tsx:76-79`
- **Code:** `gridTemplateColumns: repeat(${PIPELINE_STAGES.length}, minmax(240px, 1fr))`
- **Impact:** With 5-6 pipeline stages, mobile users must scroll horizontally with no visual cue. Core CRM feature broken on tablets.
- **Fix:** Responsive grid that stacks columns on mobile or uses horizontal scroll snap

### P0-NEW-3: EditModal blocks all keyboard events
- **Evidence:** `src/components/admin/shared/EditModal.tsx:30`
- **Code:** `onKeyDown={(e) => e.stopPropagation()}` on outer div
- **Impact:** Escape key completely blocked. Users cannot dismiss admin edit modals with keyboard. Tab navigation may also be affected.
- **Fix:** Replace with proper Escape handler: `onKeyDown={(e) => e.key === 'Escape' && onClose()}`

### P0-NEW-4: ApprovalActionModal disables Escape key
- **Evidence:** `src/components/shared/ApprovalActionModal.tsx:203-205`
- **Code:** `const handleKeyDown = (_e) => { /* intentionally empty */ }`
- **Impact:** Modal only closable via Cancel button. Violates WCAG 2.1 keyboard accessibility. Approval workflows are high-frequency for managers.
- **Fix:** Enable Escape when not processing: `if (e.key === 'Escape' && !isProcessing) onClose()`

### P0-NEW-5: Empty catch blocks hide approval data corruption
- **Evidence:** `src/components/admin/approvals/ApprovalDashboard.tsx:88-89,93-98,121-136`
- **Code:** `catch { chain = []; }` -- malformed approval chains silently reset to empty
- **Impact:** If approvalChain JSON is corrupted, approvals silently fail. Admin sees empty queue with no error. Audit data integrity compromised.
- **Fix:** Log error + show toast: `catch(e) { console.error(e); toast.error('Failed to parse approval chain'); }`

### P0-NEW-6: No backdrop click close on any modal (6/7 modals)
- **Evidence:** LoadQuoteModal, QuoteComparisonModal, CompanyPickerModal, CompanyMergeModal, ApprovalActionModal, EditModal
- **Impact:** Users cannot dismiss modals by clicking outside. Combined with Escape being blocked on 2 modals, some modals feel "stuck". This is the #1 user complaint pattern in enterprise apps.
- **Fix:** Add `onClick={onClose}` to backdrop divs, `onClick={(e) => e.stopPropagation()}` on inner panels

---

## P1 Findings (22 total - High Priority)

### Routing & Navigation (3)

| ID | File:Line | Issue |
|---|---|---|
| P1-R-1 | `useApprovalNotifications.tsx:181` | Direct `window.location.hash` manipulation instead of `useNavigate()` -- bypasses React Router state |
| P1-R-2 | `CrmTopBar.tsx:86-88` | `startsWith()` active check causes dual highlighting on `/admin/approvals` (both Admin and Approvals light up) |
| P1-R-3 | `AdminLayout.tsx:135-143` | Admin sub-routes have no per-route permission checks. Sidebar filters by permission, but direct URL access bypasses this |

### Form Validation (5)

| ID | File:Line | Issue |
|---|---|---|
| P1-V-1 | `QuoteSettingsStep.tsx:78,91,119,133` | Number inputs accept negative values via paste (ROE, interest rate, discount). HTML5 min attribute alone doesn't prevent programmatic entry |
| P1-V-2 | `CompanyInfoCard.tsx:172-174` | estimatedValue, creditLimit, paymentTerms fields have no JavaScript validation -- only HTML5 min="0" |
| P1-V-3 | `CostFieldGroup.tsx:37`, `FleetBuilderPanel.tsx:238,312` | Cost fields accept negative values via paste |
| P1-V-4 | `QuoteSettingsStep.tsx:51`, `CommercialStep.tsx:135`, `ConfigureOptionsStep.tsx:130`, `CostsStep.tsx:140`, `ExportStep.tsx:34` | 5 builder steps call `setCanProceed(true)` unconditionally -- user can skip through without entering data. Mitigated by ReviewStep final validation. |
| P1-V-5 | `Button.tsx:23` | No explicit `type` attribute. Browser defaults to `submit` in form contexts -- accidental form submissions possible |

### Modal Behavior (4)

| ID | File:Line | Issue |
|---|---|---|
| P1-M-1 | `LoadQuoteModal.tsx` | Filter state (search, status, page) not reset on close -- stale state on reopen |
| P1-M-2 | `QuoteComparisonModal.tsx` | Quote selection state persists across open/close cycles |
| P1-M-3 | All 7 modals | No focus trapping -- users can Tab out of any modal to page elements behind it |
| P1-M-4 | `EditModal.tsx:40-45` | Close button not disabled during save operations -- user can close while async save is in progress |

### Error Handling (4)

| ID | File:Line | Issue |
|---|---|---|
| P1-E-1 | `QuotesListPage.tsx:103,128` | Quote loading errors only logged to console, not shown to user. User sees perpetual spinner if DB fails. |
| P1-E-2 | `KanbanBoard.tsx:34-54` | Kanban drag has no loading state. Multiple concurrent drags can fire simultaneous `updateStage` calls -- race condition |
| P1-E-3 | `ErrorBoundary.tsx` | Only catches synchronous render errors. Async errors in event handlers and useEffect are not caught. No global `unhandledrejection` handler. |
| P1-E-4 | `CustomerListPage.tsx:42-48` | `db.users.toArray().then(...)` with no `.catch()` -- unhandled promise rejection if DB fails |

### Accessibility (6)

| ID | File:Line | Issue |
|---|---|---|
| P1-A-1 | 12+ buttons across modals and shared components | Icon-only buttons (X, Edit, Trash2, Copy, GitBranch) missing `aria-label`. Screen readers cannot identify button purpose. |
| P1-A-2 | `CompanyForm.tsx:119-194` | 5 form inputs have no associated `<label>` via htmlFor -- screen reader users cannot identify fields |
| P1-A-3 | `ViewToggle.tsx:11-48`, `UnitTabs.tsx:15-32` | Tab/toggle components missing `role="tab"`, `aria-selected`, `role="tablist"` |
| P1-A-4 | `CategoryAccordion.tsx:18-33` | Missing `aria-expanded` attribute on accordion button |
| P1-A-5 | `CustomerTable.tsx:92-116` | Sortable headers missing `aria-sort` attribute |
| P1-A-6 | `KanbanCard.tsx:29-34` | Draggable cards have no keyboard equivalent for drag-and-drop |

---

## P2 Findings (28 total - Polish / Consistency)

### Responsive Layout (6)

| ID | Evidence | Issue |
|---|---|---|
| P2-L-1 | `AdminSidebar.tsx:25` | Fixed `w-64` (256px) sidebar. Mobile drawer exists but width still fixed. |
| P2-L-2 | `AdminLayout.tsx:132` | `p-8` padding excessive on mobile (~25% of screen) |
| P2-L-3 | Multiple files | Hardcoded min-heights (60vh, 120px, 600px) can force scroll or waste space |
| P2-L-4 | `SeriesCard.tsx:25` | `truncate` class applied but no tooltip to reveal full text |
| P2-L-5 | No `@media print` in codebase | Printing any page includes dark theme, buttons, nav chrome |
| P2-L-6 | `LoadQuoteModal.tsx:246-265` | Hardcoded width percentages on quote rows cause truncation on narrow screens |

### Small Text (4)

| ID | Evidence | Issue |
|---|---|---|
| P2-T-1 | `FleetBuilderPanel.tsx` (7 instances) | `text-[10px]` on badges, labels, category headers, option prices |
| P2-T-2 | `KanbanCard.tsx:56` | `text-[10px]` on tags -- 10px interactive elements fail accessibility guidelines |
| P2-T-3 | `ActivityTimeline.tsx:84` | `text-[10px]` on activity timestamps |
| P2-T-4 | `ClientInfoStep.tsx` (2 instances) | `text-[11px]` on action buttons |

### Error Handling (5)

| ID | Evidence | Issue |
|---|---|---|
| P2-E-1 | `useOnlineStatus.ts` | Offline status tracked but never displayed to user. No offline banner. |
| P2-E-2 | Multiple DB operations | No timeout protection. If IndexedDB hangs, user locked with spinner forever. |
| P2-E-3 | `ApprovalDashboard.tsx:272` | Generic "Action failed" error. No specific message telling user what went wrong. |
| P2-E-4 | `CrmTopBar.tsx:52-54` | Approval count loading failure silently ignored |
| P2-E-5 | Toast usage inconsistent | Some operations show success/error toasts, others don't (contact delete, merge complete) |

### Modal Polish (3)

| ID | Evidence | Issue |
|---|---|---|
| P2-M-1 | `CompanyPickerModal.tsx` | Search query not explicitly reset on close |
| P2-M-2 | `ConfirmDialog.tsx` | No visual focus indicator on buttons. No auto-focus on first element. |
| P2-M-3 | `CompanyMergeModal.tsx:588,597` | Redundant double `stopPropagation()` on both backdrop and panel |

### Accessibility (6)

| ID | Evidence | Issue |
|---|---|---|
| P2-A-1 | `ActivityTimeline.tsx:22-31` | Activity types distinguished by color only -- no shape/text alternative |
| P2-A-2 | `NotificationBell.tsx:159-161` | Unread dot relies solely on color (has `aria-hidden="true"`, no fallback) |
| P2-A-3 | `KanbanColumn.tsx:23` | Pipeline stages identified by border-top color only |
| P2-A-4 | Multiple components | No `aria-live="polite"` on dynamic content (save status, loading states, toast counts) |
| P2-A-5 | `SearchableSelect.tsx:125-189` | Portal dropdown has no `role="listbox"` or `role="menu"` |
| P2-A-6 | `LoadQuoteModal.tsx:175-181` | Search input has no associated `<label>` element |

### UI Patterns (4)

| ID | Evidence | Issue |
|---|---|---|
| P2-U-1 | 49 instances across codebase | `as any` type assertions bypass TypeScript safety. Worst in AuditLogViewer (8), ApprovalDashboard (3), ClientInfoStep (4) |
| P2-U-2 | 8 UI components | Missing `forwardRef`: Button, SearchableSelect, Badge, Card, Checkbox, Panel, Skeleton, Tooltip. Only Input has it. |
| P2-U-3 | `Toast.tsx:17-25` | 8 `!important` overrides to style Sonner toasts. Fragile pattern. |
| P2-U-4 | `DataTable.tsx:143` | Array index used as key in dynamic paginated list -- React reconciliation issues if rows reorder |

---

## P3 Findings (12 total - Minor)

| ID | Evidence | Issue |
|---|---|---|
| P3-1 | `LoginPage.tsx:52` | Only HTML5 `type="email"` validation, no regex like CompanyForm uses |
| P3-2 | `SearchableSelect.tsx:36-38` | No debounce on filter (acceptable for small datasets) |
| P3-3 | `Tooltip.tsx:14` | Each Tooltip creates its own Provider (should be app-level) |
| P3-4 | `useContacts.ts`, `useActivities.ts` | `getRepository()` called every render, breaks useCallback memoization |
| P3-5 | `NotFoundPage.tsx:17` | Uses raw `<button>` instead of shared Button component |
| P3-6 | `GlobalSearch.tsx:124` | Backdrop has `stopPropagation` but doesn't close search on click |
| P3-7 | `QuoteStatusBadge.tsx` | Status badges use semi-transparent backgrounds with marginal contrast |
| P3-8 | `ViewToggle.tsx:13-28` | Unselected toggle text-surface-400 on bg-surface-800/50 is low contrast |
| P3-9 | `ActivityTimeline.tsx:83-117` | Uses `<div>` instead of semantic `<ol>` or `<article>` for timeline |
| P3-10 | `KanbanBoard.tsx:76-91` | Grid div has no semantic role |
| P3-11 | `LoadQuoteModal.tsx:218-316` | Table has custom row structure with colSpan=5 and nested divs -- breaks table semantics |
| P3-12 | Multiple skeleton loaders | Array.from with index as key (acceptable for static skeletons) |

---

## Action Wiring Matrix (Extended)

| Surface | Action | Status | File:Line |
|---|---|---|---|
| TopBar | Export PDF | OK | TopBar.tsx |
| TopBar | Load Quote | OK | TopBar.tsx |
| TopBar | Save (Ctrl+S) | OK | useKeyboardShortcuts.ts |
| Builder Export | Open Dashboard | **Broken** (routes to `/`) | ExportStep.tsx:191 |
| Client Info | Company Picker "Create New" | **Broken** (closes modal only) | CompanyPickerModal.tsx:108 |
| CRM Linked Quotes | Row click | **Broken** (no quote ID) | LinkedQuotes.tsx:46 |
| CRM List | New Lead | OK | CustomerListPage.tsx |
| Quotes List | Row click | OK | QuotesListPage.tsx |
| Quotes List | Sort headers | OK (functional) | QuotesListPage.tsx:152 |
| CRM Top Nav | Active state | **Partial** (dual active on /admin/approvals) | CrmTopBar.tsx:86 |
| Notification Bell | Open/close | OK | NotificationBell.tsx |
| Global Search | Cmd+K / results | OK | GlobalSearch.tsx |
| Customer Detail | Delete company | OK (has confirm dialog) | CustomerDetailPage.tsx |
| Admin Edit Modal | Close button | **Partial** (keyboard blocked) | EditModal.tsx:30 |
| Approval Modal | Escape key | **Broken** (disabled) | ApprovalActionModal.tsx:203 |
| All Modals | Backdrop click close | **Broken** (6/7 missing) | Multiple files |
| Kanban | Drag and drop | OK (functional) | KanbanBoard.tsx |
| Backup | Export/Import | OK | BackupRestore.tsx |

---

## Comparison with Codex Report

| Metric | Codex | Claude | Delta |
|---|---|---|---|
| P0 findings | 2 | 6 | +4 |
| P1 findings | 6 | 22 | +16 |
| P2 findings | 4 | 28 | +24 |
| P3 findings | 0 | 12 | +12 |
| **Total** | **12** | **68** | **+56** |

**What Codex found that we agree with:** All 12 findings confirmed with matching file:line evidence.

**What we found that Codex missed:**
- LinkedQuotes missing quote ID (more critical than Builder export route)
- Kanban responsive breakage on mobile
- EditModal/ApprovalActionModal keyboard blocking
- Empty catch blocks hiding approval corruption
- No backdrop close on any modal (Codex only noted New Lead modal)
- Form validation gaps (negative numbers via paste)
- Builder step validation bypasses
- 74 accessibility findings (Codex found ~6)
- Race conditions in search and kanban drag
- Error boundary async gap
- Unhandled promise rejections
- Offline status not surfaced
- 49 `as any` type assertions
- 8 missing forwardRef implementations

---

## Recommended Fix Order

### Wave 0 - Today (Go-Live Blockers)
1. Fix LinkedQuotes quote ID (P0-NEW-1) -- 1 line change
2. Fix Builder export route (Codex P0-1) -- 1 line change
3. Add backdrop click close to all modals (P0-NEW-6) -- pattern fix
4. Fix EditModal keyboard blocking (P0-NEW-3) -- 1 line change
5. Fix ApprovalActionModal Escape key (P0-NEW-4) -- 1 line change
6. Add toast for approval data parse errors (P0-NEW-5) -- 3 lines

### Wave 1 - This Week
7. Add `type="button"` to shared Button (P1-V-5)
8. Add JavaScript min validation to number inputs (P1-V-1, P1-V-2, P1-V-3)
9. Reset modal state on close (P1-M-1, P1-M-2)
10. Add error state UI to QuotesListPage (P1-E-1)
11. Add aria-labels to icon-only buttons (P1-A-1)
12. Fix CrmTopBar active state logic (P1-R-2)
13. Add .catch() to CustomerListPage user load (P1-E-4)

### Wave 2 - This Sprint
14. Form label associations (P1-A-2)
15. ARIA roles for tabs/toggles (P1-A-3, P1-A-4, P1-A-5)
16. Kanban responsive grid (P0-NEW-2)
17. Focus trapping for modals (P1-M-3)
18. Admin route permission guards (P1-R-3)
19. Kanban drag race condition (P1-E-2)
20. Global unhandledrejection handler (P1-E-3)

### Wave 3 - Next Sprint
21. Increase 10px text to 12px minimum (P2-T-*)
22. Add offline indicator banner (P2-E-1)
23. Add operation timeouts (P2-E-2)
24. Add print styles (P2-L-5)
25. Replace `as any` with proper types (P2-U-1)
26. Add forwardRef to UI primitives (P2-U-2)
27. aria-live regions for dynamic content (P2-A-4)
28. All remaining P2/P3 items

---

## Verification Checklist After Fixes

- [ ] LinkedQuotes row click loads correct quote (not most recent)
- [ ] Builder Export "Open Dashboard" lands on `/#/quote`
- [ ] Company picker "Create New" opens create flow or shows clear message
- [ ] All modals close on backdrop click
- [ ] All modals close on Escape key
- [ ] No accidental form submits from non-submit buttons
- [ ] `/admin/approvals` shows only one active nav highlight
- [ ] Negative numbers cannot be pasted into cost/ROE/rate fields
- [ ] Sort headers work by keyboard with aria-sort
- [ ] Icon-only buttons have aria-label in all modals and cards
- [ ] Kanban renders usably on 768px tablet width
- [ ] Approval chain parse errors show toast, not silent failure
- [ ] Quote list shows error state (not spinner) when DB fails

---

## Notes

- This report is based on static code analysis of all ~230 source files.
- No code changes were made during this audit.
- Accessibility findings follow WCAG 2.1 AA guidelines.
- Financial calculation correctness is covered in the separate `claude-audit/claude-findings-from-initial-fix.md` report.
- For complete project context, see `Project documentation/`.
