# PLAN-REVIEW.md - Review of CURRENT-PLAN.md (Phase 3 UI/Mobile)

Generated: 2026-02-22
Reviewer: Codex (independent review)
Reviewed documents: `WORKFLOW.md`, `Project documentation/CURRENT-PLAN.md`, `Project documentation/SPEC.md`, `CLAUDE.md`, and referenced source files.

## Verdict

REQUIRES REVISION before build.

The phase is correctly aimed at frontend/mobile improvements, but the current plan does not yet include enough safeguards to ensure backend-impacting flows remain intact.

## Findings (ordered by severity)

### CRITICAL

1. Missing backend-safety regression coverage for TopBar action refactor
- The plan rewires the TopBar action surface (`Project documentation/CURRENT-PLAN.md:102`) and moves most actions into an overflow menu (`Project documentation/CURRENT-PLAN.md:105`).
- Those actions are not cosmetic. They trigger quote create/load/save/export flows in `src/components/layout/TopBar.tsx:192`, `src/components/layout/TopBar.tsx:195`, `src/components/layout/TopBar.tsx:201`, and `src/components/layout/TopBar.tsx:215`.
- Verification currently checks responsive behavior, build, and tests, but not these core flows (`Project documentation/CURRENT-PLAN.md:123`).
- Required plan fix: add explicit mobile and desktop checks for Save, Load, New, Save-and-New modal path, and Export.

2. No explicit frontend-only boundary to protect backend
- Your constraint is frontend improvements without breaking backend.
- The plan lists files to edit, but it does not declare hard forbidden backend paths.
- Required plan fix: add a "must-not-touch" boundary (for example: `src/db/**`, `src/lib/supabase.ts`, `src/lib/database.types.ts`, `supabase/**`) and a pre-commit diff check against that boundary.

### IMPORTANT

3. Touch-target math does not meet the plan's own 44px exit criteria
- The plan claims 44px targets in exit criteria (`Project documentation/CURRENT-PLAN.md:229`).
- Proposed step circle change `w-10 h-10` is 40px, not 44px (`Project documentation/CURRENT-PLAN.md:114`).
- Proposed DataTable change `p-1` to `p-2` still produces ~32px click area with `w-4 h-4` icons (`Project documentation/CURRENT-PLAN.md:158`, `src/components/admin/shared/DataTable.tsx:161`).
- Required plan fix: use explicit `min-h-[44px] min-w-[44px]` (or `w-11 h-11`) on mobile touch targets.

4. Global `Button` min-height change has wide blast radius and can violate "desktop unchanged"
- Plan proposes base button sizing change (`Project documentation/CURRENT-PLAN.md:139`) while also requiring no desktop regressions (`Project documentation/CURRENT-PLAN.md:233`).
- `Button` is shared across many modules (`src/components/ui/Button.tsx:25`).
- Required plan fix: apply touch sizing as mobile-only or opt-in variant, not global for all breakpoints.

5. CrmTopBar breakpoint guidance is internally inconsistent
- The plan says mobile behavior below `md` (`Project documentation/CURRENT-PLAN.md:95`) but references AdminLayout's `lg:hidden` drawer pattern (`Project documentation/CURRENT-PLAN.md:99`, `src/components/admin/AdminLayout.tsx:100`).
- Risk: unintended behavior on tablet/desktop widths.
- Required plan fix: define exact breakpoint contract (`<md drawer`, `>=md existing nav`) and preserve approval badge behavior parity (`src/components/crm/CrmTopBar.tsx:128`).

6. SearchableSelect mobile bottom sheet lacks interaction contract
- The current component uses portal-based fixed positioning (`src/components/ui/SearchableSelect.tsx:124`).
- Planned bottom sheet does not define focus management, escape/backdrop close behavior, or body scroll lock (`Project documentation/CURRENT-PLAN.md:150`).
- Required plan fix: specify these rules before implementation to avoid regressions in builder/cost workflows.

7. TopBar parity requirements are incomplete
- Current TopBar includes read-only save gating and save-status indicators (`src/components/layout/TopBar.tsx:177`, `src/components/layout/TopBar.tsx:208`).
- The mobile overflow redesign does not explicitly require preserving this behavior (`Project documentation/CURRENT-PLAN.md:105`).
- Required plan fix: add a parity checklist for all existing TopBar actions/states.

### MINOR

8. Tooltip implementation note is technically inaccurate
- Plan suggests `trigger="focus"` (`Project documentation/CURRENT-PLAN.md:144`), but the current Radix setup already uses `Trigger asChild` (`src/components/ui/Tooltip.tsx:16`), and this prop guidance is not aligned with the existing component API.
- Required plan fix: express desired accessibility outcomes instead of specific unsupported prop wording.

## Required Plan Amendments Before Build

1. Add a "Backend Protection" section with explicit forbidden paths and a diff gate.
2. Expand verification to include quote save/load/new/export parity checks on mobile and desktop.
3. Correct touch-target specifications to true 44px minimum.
4. Scope shared-component sizing changes to mobile or opt-in variants.
5. Define exact CrmTopBar/TopBar breakpoint and behavior parity rules.

## Approval Status

NOT APPROVED yet. Approve after the above plan edits are incorporated.
