# CURRENT-PLAN.md — Phase 3: UI & Mobile Responsiveness Upgrade

Generated: 2026-02-22
Revised: 2026-02-22 (incorporates PLAN-REVIEW.md findings, round 1 + round 2)
Sources: `SPEC.md`, `CLAUDE.md`, `PLAN.md`, `PLAN-REVIEW.md`, direct code verification, mobile device testing.

---

## Disposition Matrix (PLAN-REVIEW.md)

### CRITICAL

| # | Finding | Decision | Incorporation |
|---|---------|----------|---------------|
| 1 | Missing backend-safety regression coverage for TopBar action refactor | **Accepted** | Added TopBar Action Parity Checklist (Section 3B.2) and expanded verification to include save/load/new/export flow checks on both mobile and desktop. |
| 2 | No explicit frontend-only boundary to protect backend | **Accepted** | Added Backend Protection section with forbidden paths and pre-commit diff gate. |

### IMPORTANT

| # | Finding | Decision | Incorporation |
|---|---------|----------|---------------|
| 3 | Touch-target math does not meet 44px exit criteria | **Accepted** | WorkflowStepper corrected to `w-11 h-11` (44px). DataTable action buttons corrected to `min-h-[44px] min-w-[44px]`. |
| 4 | Global Button min-height has wide blast radius | **Accepted** | Button `min-h-[44px]` scoped to mobile only via `min-h-[44px] sm:min-h-0`. Desktop rendering unchanged. |
| 5 | CrmTopBar breakpoint inconsistency | **Accepted** | Exact breakpoint contract defined: `<md` = drawer, `>=md` = existing nav. AdminLayout pattern adapted from `lg` to `md`. Approval badge behavior explicitly preserved. |
| 6 | SearchableSelect bottom sheet lacks interaction contract | **Accepted** | Added full interaction contract: focus trap, Escape/backdrop close, body scroll lock. |
| 7 | TopBar parity requirements incomplete | **Accepted** | Added explicit TopBar Action Parity Checklist covering all existing states/behaviors. |

### MINOR

| # | Finding | Decision | Incorporation |
|---|---------|----------|---------------|
| 8 | Tooltip implementation note technically inaccurate | **Accepted** | Rewritten to describe desired accessibility outcomes rather than specific unsupported prop names. |

### Round 2 Findings

| # | Severity | Finding | Decision | Incorporation |
|---|----------|---------|----------|---------------|
| R2-1 | IMPORTANT | Pre-commit diff gate not PowerShell-safe | **Accepted** | Replaced with PowerShell-native `Select-String` check. |
| R2-2 | IMPORTANT | New mobile nav triggers (hamburger, drawer close, overflow "...") lack explicit 44px tap targets | **Accepted** | Added `min-h-[44px] min-w-[44px]` requirement to all new mobile-only trigger buttons in 3B. |
| R2-3 | MINOR | Date behavior inconsistent between description and parity table | **Accepted** | Resolved: date is hidden on mobile entirely (not in overflow). Parity table is source of truth. Description updated to match. |
| R2-4 | MINOR | "Focus trap" wording misleading for SearchableSelect | **Accepted** | Changed to "auto-focus + focus-return" — not a full focus trap. |

---

## Backend Protection

### Forbidden Paths (must NOT be modified in this phase)

- `src/db/**` — all database adapters, interfaces, repositories, serialization
- `src/lib/supabase.ts` — Supabase client init
- `src/lib/database.types.ts` — auto-generated DB types
- `src/engine/**` — all calculation/business logic engines
- `src/store/**` — all Zustand stores
- `src/hooks/**` — all custom hooks (data-fetching logic)
- `src/auth/**` — permission definitions
- `supabase/**` — Edge Functions, migrations, seed scripts

### Pre-Commit Diff Gate

Before every commit, run (PowerShell-safe):
```powershell
$forbidden = git diff --name-only HEAD | Select-String -Pattern '^(src/(db|lib|engine|store|hooks|auth)/|supabase/)'
if ($forbidden) { $forbidden.Line; throw "ERROR: Backend files modified" }
```
If any forbidden path appears in the diff, the commit must not proceed without explicit human approval and justification.

### Allowed Paths

Only these directories/files may be modified:
- `src/index.css`
- `src/components/**` (UI components only — no hook logic changes, no store changes)

---

## Context

Phase 1 is APPROVED and complete (all CRITICAL/IMPORTANT issues resolved, BUILD-REVIEW round 6 approved). The app works functionally but the frontend has significant mobile/responsive issues:

- **White blocks on sides and bottom on mobile** — horizontal overflow with no `overflow-x: hidden`, elements exceed viewport width
- **TopBar buttons don't fit on mobile** — 6-7 buttons (Builder, Admin, New, Load, Save, Export PDF) overflow on small screens
- **CrmTopBar nav items overflow** — 7-8 navigation items in a single row
- **No mobile navigation** — only Admin pages have a hamburger menu/drawer; the main app has none
- **Touch targets too small** — buttons ~32px, table action icons ~16px (recommended minimum: 44px)
- **Fixed padding** — cards/panels use p-6 everywhere (too much on mobile)
- **Tables not mobile-friendly** — horizontal scroll with no card-based fallback

---

## Approach

Split into **3 sub-phases** to keep changes reviewable and avoid breaking the working app:

- **3A**: Fix viewport overflow + global responsive foundation (CSS-level, zero component logic changes)
- **3B**: Responsive navigation + TopBar/CrmTopBar mobile redesign (layout components only)
- **3C**: Panel/form/table mobile optimization + touch targets (component-level improvements)

---

## Sub-Phase 3A — Fix Viewport Overflow + Global Responsive Foundation

**Goal**: Eliminate the white blocks on sides/bottom and establish responsive CSS primitives.

### Changes

#### 1. Fix viewport overflow (ROOT CAUSE of white blocks)
- **File**: `src/index.css` (lines 8-17, body styles)
- **Action**: Add `overflow-x: hidden` to `html` and `body` in the `@layer base` block
- **Why**: Elements exceeding viewport width create horizontal scroll. The gradient bg doesn't cover the overflow area, showing default white. This is the #1 user-reported issue.
```css
html {
  @apply overflow-x-hidden;
}
body {
  @apply overflow-x-hidden;
  /* existing styles unchanged */
}
```

#### 2. Add responsive padding to global component classes
- **File**: `src/index.css`
- **Classes to update**:
  - `.card`: Change `p-6` to `p-4 sm:p-5 md:p-6`
  - `.panel`: Change `p-6` to `p-4 sm:p-5 md:p-6`
  - `.panel-header`: Change `mb-4` to `mb-3 sm:mb-4`
  - `.panel-footer`: Change `mt-6 pt-4` to `mt-4 pt-3 sm:mt-6 sm:pt-4`
  - `.btn`: Change `px-4 py-2` to `px-3 py-2 sm:px-4` (keep py-2 for touch targets)
- **Why**: Fixed padding wastes space on mobile (320px screen with 24px padding = 272px usable)

#### 3. Add `prefers-reduced-motion` support
- **File**: `src/index.css`
- **Action**: Add at the end:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Files Modified
- `src/index.css`

### Verification
1. `npx tsc --noEmit` — 0 errors (CSS-only changes)
2. `npx vitest run` — all tests pass
3. `npx vite build` — succeeds
4. **Manual**: Open in browser DevTools mobile emulation (iPhone SE 375px, iPhone 14 390px) — no horizontal scroll, no white blocks

---

## Sub-Phase 3B — Responsive Navigation + TopBar Mobile Redesign

**Goal**: Make navigation usable on mobile. Fix the TopBar button overflow. Add hamburger/drawer nav to the main app.

### Breakpoint Contract

| Breakpoint | CrmTopBar | TopBar |
|------------|-----------|--------|
| `<md` (< 768px) | Hamburger icon + slide-in drawer with full nav list. Notification bell + user avatar always visible in top-right. | Quote ref + status inline. Save button always visible. All other actions in "..." overflow dropdown. Date/ROE hidden. |
| `>=md` (768px+) | Existing horizontal nav bar — completely unchanged. | Existing button row — completely unchanged. |

### Changes

#### 1. CrmTopBar — mobile hamburger + drawer
- **File**: `src/components/crm/CrmTopBar.tsx`
- **Breakpoint**: `<md` = drawer, `>=md` = existing nav (adapted from AdminLayout's `lg` to `md`)
- **Action**:
  - Add `useState` for `mobileMenuOpen`
  - Below `md` breakpoint: show hamburger icon (Menu from lucide) on the left, hide nav items
  - Hamburger trigger button: `min-h-[44px] min-w-[44px]` for touch target compliance
  - On click: open a slide-in drawer (adapted from `AdminLayout.tsx` lines 91-148, changed from `lg:hidden` to `md:hidden`) with full nav list
  - Drawer close button (X icon): `min-h-[44px] min-w-[44px]` for touch target compliance
  - Keep notification bell + user avatar visible in top-right at all sizes
  - Desktop (md+): completely unchanged — current horizontal nav
- **Parity requirements**:
  - All nav items from `allNavItems` must appear in drawer
  - Approval badge with `pendingApprovalCount` must display in drawer (preserving `src/components/crm/CrmTopBar.tsx:128` behavior)
  - Active route highlighting must work in drawer
  - Drawer closes on nav item click and on backdrop click
- **Why**: 7-8 nav items don't fit on mobile. Icons-only mode (current `hidden sm:inline`) still overflows on iPhone SE (375px) with 8 items x ~44px each = 352px, barely fits without padding

#### 2. TopBar (quote workspace) — overflow menu for action buttons
- **File**: `src/components/layout/TopBar.tsx`
- **Breakpoint**: `<md` = overflow menu, `>=md` = existing button row
- **Action**:
  - **Mobile (<md)**: Show quote ref + status on one line. Show Save button always visible. Collapse all other action buttons (Builder, Admin, New, Load, Export PDF) into a "..." overflow menu triggered by a MoreVertical icon button (`min-h-[44px] min-w-[44px]` for touch target compliance, dropdown positioned right-aligned below trigger)
  - **Desktop (md+)**: completely unchanged — current button row
  - Date divider hidden on mobile (accessible in Settings panel, not in overflow). ROE badge shown in overflow dropdown.
  - Overflow dropdown: use click-outside-to-close pattern from CrmTopBar user menu
- **Why**: 6 buttons x ~100px each = 600px minimum. On a 375px screen, even wrapping creates 2-3 rows of buttons.

#### TopBar Action Parity Checklist

Every existing TopBar action/state must work identically in the mobile overflow menu:

| Action/State | Desktop Location | Mobile Location | Behavior Must Match |
|---|---|---|---|
| Save button | Right side, always visible | Right side, always visible (NOT in overflow) | `saveNow()` call, `loading={saveStatus === 'saving'}`, `disabled={isReadOnly}` |
| Save status indicator | Right side, text | Below quote ref, text | Shows "Saving...", "Saved at [time]", "Save failed" |
| Builder button | Right side | Overflow dropdown | `navigate('/builder')` |
| Admin button | Right side (admin only) | Overflow dropdown (admin only) | `navigate('/admin')`, only renders when `isAdmin` |
| New button | Right side | Overflow dropdown | `handleNewQuote()` — triggers unsaved-changes modal if needed |
| Load button | Right side | Overflow dropdown | `setShowLoadModal(true)` |
| Export PDF button | Right side | Overflow dropdown | `handleExportPDF()`, `loading={isExporting}`, `disabled={isExporting}` |
| ROE badge | Right side | Overflow dropdown | Read-only display of `customerROE.toFixed(2)` |
| Quote ref | Left side | Left side (always visible) | Display of `quoteRef` |
| Status badge | Left side | Left side (always visible) | Display of `status` with correct variant coloring |
| Date display | Left side | Hidden on mobile (accessible in Settings panel) | Display of `formatDate(quoteDate)` |
| Unsaved changes modal | Portal overlay | Portal overlay (unchanged) | `showNewQuoteModal` state, Save & New / Discard & New / Cancel |
| Load quote modal | Rendered in TopBar | Rendered in TopBar (unchanged) | `showLoadModal` state |

#### 3. WorkflowStepper — larger touch targets
- **File**: `src/components/layout/WorkflowStepper.tsx`
- **Action**:
  - Increase step circles from `w-8 h-8` to `w-11 h-11 sm:w-8 sm:h-8` (44px on mobile, 32px on desktop)
  - Inner icon/number sized proportionally
- **Why**: 32px circles fail the 44px touch target minimum. `w-11` = 44px exactly.

### Files Modified
- `src/components/crm/CrmTopBar.tsx`
- `src/components/layout/TopBar.tsx`
- `src/components/layout/WorkflowStepper.tsx`

### Verification
1. `npx tsc --noEmit` — 0 errors
2. `npx vitest run` — all tests pass
3. `npx vite build` — succeeds
4. **Manual mobile (375px)**:
   - CrmTopBar: hamburger opens drawer, all nav items listed, approval badge visible, drawer closes on item click
   - TopBar: quote ref + status visible, Save button works, "..." opens dropdown with Builder/Admin/New/Load/Export, each action fires correctly
   - WorkflowStepper: step circles tappable at 44px
5. **Manual desktop (1280px+)**:
   - CrmTopBar: horizontal nav unchanged, no hamburger visible
   - TopBar: all buttons visible in row, no overflow menu visible
6. **Action flow checks (both mobile and desktop)**:
   - Save → triggers save, shows status
   - New → shows unsaved-changes modal if dirty, creates new quote if clean
   - Load → opens load modal
   - Export PDF → generates PDF, shows toast
   - Builder → navigates to /builder
   - Admin → navigates to /admin (admin users only)

---

## Sub-Phase 3C — Panel/Form/Table/Touch Optimization

**Goal**: Make panels, forms, tables, and interactive elements work well on mobile.

### Changes

#### 1. Button component — mobile-only touch-friendly sizing
- **File**: `src/components/ui/Button.tsx`
- **Action**: Add `min-h-[44px] sm:min-h-0` to the button base class. This enforces 44px minimum height on mobile (<640px) only. On `sm` and above, `min-h-0` removes the constraint, preserving exact current desktop rendering.
- **Why**: Current buttons are ~32-36px tall. Apple/Android guidelines require 44px minimum. Mobile-only scoping prevents desktop layout regression.

#### 2. Tooltip — improved accessibility
- **File**: `src/components/ui/Tooltip.tsx`
- **Desired outcome**: Tooltip content must be accessible to keyboard and touch users, not just mouse hover. On touch devices, tapping the trigger element should show the tooltip.
- **Action**: Reduce `delayDuration` from 300 to 0 on the Provider. The existing Radix `Trigger asChild` already supports focus-based triggering. No prop changes needed beyond delay — Radix handles touch/focus natively when `delayDuration` is 0.
- **Why**: 300ms delay + hover-only makes tooltips inaccessible on mobile.

#### 3. Toast position — mobile-optimized
- **File**: `src/components/ui/Toast.tsx`
- **Action**: Change Sonner `position` from `"top-right"` to `"top-center"`. This centers toasts on all viewports. On desktop, centered toasts are equally visible; on mobile, they avoid being clipped by the right edge.
- **Why**: `top-right` can be partially hidden on narrow mobile viewports.

#### 4. SearchableSelect — mobile bottom sheet with interaction contract
- **File**: `src/components/ui/SearchableSelect.tsx`
- **Trigger**: Viewport width < 640px (checked via `window.innerWidth` or `matchMedia`)
- **Action**: On small screens, render dropdown as a bottom sheet (full-width, pinned to bottom of viewport) instead of positioned below trigger.
- **Interaction contract**:
  - **Auto-focus**: Search input auto-focused when sheet opens (already implemented for dropdown)
  - **Focus return**: When sheet closes, focus returns to the trigger button
  - **Escape key**: Closes sheet (already implemented via `handleKeyDown`)
  - **Backdrop click**: Closes sheet (dark overlay behind sheet, same as existing click-outside handler)
  - **Body scroll lock**: Add `overflow: hidden` to `document.body` while sheet is open, restore on close
  - **Selection**: Selecting an option closes sheet (already implemented via `handleSelect`)
  - **Max height**: Bottom sheet limited to `max-h-[60vh]` to keep trigger visible
  - Note: This is auto-focus + focus-return, not a full focus trap. A full trap is unnecessary for a single-input sheet.
- **Why**: Fixed-position dropdown can render off-screen on mobile. Bottom sheet is the standard mobile pattern.

#### 5. DataTable — responsive improvements
- **File**: `src/components/admin/shared/DataTable.tsx`
- **Action**:
  - Wrap table in a container with `relative overflow-x-auto` and add a right-edge gradient fade indicator (via `::after` pseudo-element or sibling div) to signal horizontal scroll
  - Increase action button touch targets: change `p-1` to `p-2 min-h-[44px] min-w-[44px] flex items-center justify-center` on mobile. This ensures 44px minimum tap area.
  - Pagination buttons: add `min-h-[44px]` for mobile touch targets
- **Why**: 16-24px action buttons fail touch target guidelines. Gradient fade signals scrollable content.

#### 6. DashboardLayout — responsive panel padding
- **File**: `src/components/layout/DashboardLayout.tsx`
- **Action**: Change container `p-4` to `p-2 sm:p-4` to give more room on small screens
- **Why**: On 375px, `p-4` (16px each side) = 343px usable. `p-2` (8px each side) = 359px usable.

#### 7. HomeDashboard — widget spacing
- **File**: `src/components/dashboard/HomeDashboard.tsx`
- **Action**: Change `space-y-4` to `space-y-3 sm:space-y-4` on the main container and `gap-4` to `gap-3 sm:gap-4` on any grid containers
- **Why**: Tighter spacing on mobile gives more room for content.

### Files Modified
- `src/components/ui/Button.tsx`
- `src/components/ui/Tooltip.tsx`
- `src/components/ui/Toast.tsx`
- `src/components/ui/SearchableSelect.tsx`
- `src/components/admin/shared/DataTable.tsx`
- `src/components/layout/DashboardLayout.tsx`
- `src/components/dashboard/HomeDashboard.tsx`

### Verification
1. `npx tsc --noEmit` — 0 errors
2. `npx vitest run` — all tests pass
3. `npx vite build` — succeeds
4. **Manual**: Full mobile walkthrough — home, quotes, builder, CRM, admin. Verify:
   - All buttons meet 44px minimum height on mobile
   - SearchableSelect opens as bottom sheet on mobile, closes on Escape/backdrop/selection
   - DataTable shows scroll hint, action buttons are tappable
   - Toasts centered and fully visible on mobile
   - Desktop layout and behavior completely unchanged

---

## Complete File Change List

| File | Sub-Phase | Change Type |
|------|-----------|-------------|
| `src/index.css` | 3A | CSS: overflow fix, responsive padding, reduced-motion |
| `src/components/crm/CrmTopBar.tsx` | 3B | Add: mobile hamburger + slide-in drawer nav |
| `src/components/layout/TopBar.tsx` | 3B | Add: overflow menu for mobile, responsive info layout |
| `src/components/layout/WorkflowStepper.tsx` | 3B | Modify: larger touch targets on mobile (44px) |
| `src/components/ui/Button.tsx` | 3C | Modify: mobile-only min-h-[44px] for touch targets |
| `src/components/ui/Tooltip.tsx` | 3C | Modify: reduced delay for touch/focus accessibility |
| `src/components/ui/Toast.tsx` | 3C | Modify: top-center positioning |
| `src/components/ui/SearchableSelect.tsx` | 3C | Modify: bottom sheet on mobile with full interaction contract |
| `src/components/admin/shared/DataTable.tsx` | 3C | Modify: scroll hint, 44px action buttons on mobile |
| `src/components/layout/DashboardLayout.tsx` | 3C | Modify: responsive padding |
| `src/components/dashboard/HomeDashboard.tsx` | 3C | Modify: responsive spacing |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CSS overflow-x-hidden hides intentional scrollable content | Low | Only applied to html/body, not inner containers. Scrollable tables use their own overflow-x-auto. |
| CrmTopBar drawer breaks navigation | Medium | Copy proven pattern from AdminLayout.tsx, adapted to `md` breakpoint. Desktop layout unchanged. All nav items + approval badge parity verified. |
| TopBar overflow menu breaks action flows | Medium | Full parity checklist verified. Every action handler passed through unchanged — only the container (visible vs dropdown) changes. |
| SearchableSelect bottom sheet breaks in modals | Medium | Interaction contract defined: auto-focus, focus-return, Escape close, backdrop close, scroll lock, max-height. Only triggers on viewport < 640px. |
| Button min-height changes desktop layout | Low | Scoped to mobile only via `min-h-[44px] sm:min-h-0`. Desktop rendering mathematically unchanged. |
| Responsive padding changes break existing layouts | Low | Changes are mobile-first (smaller padding on mobile, desktop padding unchanged at original values). |
| Backend files accidentally modified | Low | Forbidden paths defined. Pre-commit diff gate catches violations. |

---

## Document Updates (after all 3 sub-phases built and approved)

- **CLAUDE.md**: Add Phase 3 to "Working" status, document responsive patterns
- **SPEC.md**: Update section 5 (Frontend pages/routes) with mobile navigation behavior
- **PLAN.md**: Mark Phase 3 UI/Mobile tasks as addressed
- **TECH-DEBT.md**: Mark any addressed items

---

## Exit Criteria

1. **Zero horizontal overflow** on mobile viewports (375px, 390px, 414px)
2. **All navigation accessible** on mobile via hamburger/drawer (CRM) and overflow menu (TopBar)
3. **Touch targets >= 44px** on all interactive elements (buttons, stepper circles, table actions) on mobile
4. **Action parity**: Save/Load/New/Export/Builder/Admin all function identically on mobile and desktop
5. **TypeScript**: `npx tsc --noEmit` — 0 errors
6. **Tests**: `npx vitest run` — all pass
7. **Build**: `npx vite build` — succeeds
8. **No regressions**: Desktop layout and behavior unchanged
9. **Backend protection**: Zero modifications to forbidden paths (`src/db/`, `src/lib/`, `src/engine/`, `src/store/`, `src/hooks/`, `src/auth/`, `supabase/`)

---

End of current plan.
