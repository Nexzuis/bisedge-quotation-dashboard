# CLAUDE.md — BIS Edge Quotation Dashboard

## 1. Project Overview

React SPA for forklift fleet quotation management at Bisedge (Linde MH dealership). Handles quote building, financial modelling (lease pricing, margins, IRR/NPV, commission), CRM, lead management, role-based approval workflows, audit logging, and client-side PDF generation.

**No custom backend.** Frontend talks directly to Supabase (Auth, PostgREST, Realtime, RPC). Vercel serves the static build.

Key documents:
- `Project documentation/SPEC.md` — full specification of what is implemented
- `Project documentation/PLAN.md` — 4-phase stabilise/improve/new-features plan
- `Project documentation/TECH-DEBT.md` — 75-item tech debt audit across 10 categories

---

## 2. Tech Stack

| Layer | Tech | Version |
|-------|------|---------|
| Framework | React | 19.2 |
| Language | TypeScript | 5.9 |
| Build | Vite | 7.3 |
| Router | react-router-dom (HashRouter) | 7.13 |
| State | Zustand + Immer | 5.0.11 / 11.1.4 |
| Backend | Supabase (Auth, PostgREST, Realtime, RPC) | 2.95.3 |
| Styling | Tailwind CSS | 3.4.19 |
| Animation | Framer Motion | 12.34 |
| Icons | Lucide React | 0.564 |
| PDF | @react-pdf/renderer | 4.3.2 |
| Charts | Recharts | 3.7 |
| DnD | @dnd-kit | core 6.3 / sortable 10.0 |
| Excel | xlsx | 0.18.5 |
| Test | Vitest + Testing Library | 4.0.18 |
| Hosting | Vercel | static SPA |

### Scripts

```
npm run dev          # node scripts/start-dev.js (port 5173)
npm run dev:simple   # vite --port 5173
npm run build        # vite build
npm run lint         # eslint .
npm run lint:fix     # eslint . --fix
npm run typecheck    # tsc --noEmit
npm run test         # vitest run
npm run test:watch   # vitest
```

---

## 3. Rules & Conventions

### File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase `.tsx` | `ClientInfoStep.tsx` |
| Hooks | camelCase `use*.ts` | `useQuoteDB.ts` |
| Stores | camelCase `use*Store.ts` | `useQuoteStore.ts` |
| Engine/utils | camelCase `.ts` | `calculationEngine.ts` |
| Types | camelCase `.ts` | `quote.ts`, `crm.ts` |
| Data | kebab-case `.json` | `batteries-li-ion.json` |
| Tests | `__tests__/<module>.test.ts` | `calculationEngine.test.ts` |
| Config | camelCase `.ts` | `stageConfig.ts` |

### Exports

- **Named exports** for everything. `export function ComponentName()`.
- **Default exports** only for lazy-loaded route pages (required by `React.lazy()`).
- **No barrel exports** except `src/pdf/components/index.ts`.

### Imports

Order (observed consistently):
1. React (`useState`, `useEffect`, `useCallback`)
2. Third-party libraries (`react-router-dom`, `framer-motion`, `lucide-react`)
3. Stores (`../store/useQuoteStore`)
4. Hooks (`../hooks/useCompanies`)
5. Components (`../ui/Input`, `../../ui/Card`)
6. Engine/utils (`../../engine/formatters`, `../utils/logger`)
7. Types (`import type { ... }` — always use `import type` for type-only imports)

**No path aliases.** All imports are relative paths.

### Component Structure

```typescript
// 1. Imports
import { useState, useCallback } from 'react';
import { useQuoteStore } from '../store/useQuoteStore';
import type { SomeType } from '../types/quote';

// 2. Props interface — co-located, named <Component>Props
interface MyComponentProps {
  value: string;
  className?: string;  // always include, default to ''
}

// 3. Named export function
export function MyComponent({ value, className = '' }: MyComponentProps) {
  // 4. Store selectors — granular, one per field
  const clientName = useQuoteStore((s) => s.clientName);

  // 5. Local state
  const [loading, setLoading] = useState(false);

  // 6. Effects
  // 7. Handlers
  // 8. Return JSX
}
```

### Props Conventions

- Always include `className?: string` with default `''` on wrapper components.
- `children: ReactNode` for wrapper components.
- `variant` props use string literal unions: `'primary' | 'secondary' | 'ghost' | 'danger'`.
- Icon props typed as `icon?: LucideIcon`.
- Extend native HTML attrs when appropriate: `extends ButtonHTMLAttributes<HTMLButtonElement>`.

### State Management

- **Zustand stores** for all shared state. No React Context for state (only for auto-save and read-only flags).
- **Immer middleware** only on `useQuoteStore` (deeply nested slot state). Other stores use plain setters.
- **`persist` middleware** for auth (`auth-storage`), CRM UI prefs (`crm-ui-storage`), lead UI prefs (`lead-ui-storage`).
- **Granular selectors** to avoid re-renders: `useQuoteStore((s) => s.fieldName)`, not `useQuoteStore()`.
- **Outside-React access**: `useQuoteStore.getState()` for reading state in non-component code.

### Constants

UPPER_SNAKE_CASE: `LOCK_STALE_MS`, `MAX_FAILED_ATTEMPTS`, `ROLE_HIERARCHY`, `ALL_ROLES`.

### Error Handling

- Wrap all async DB calls in try/catch.
- Use `logger.error()` (from `src/utils/logger.ts`), not raw `console.error()`. Logger silences `debug` and `info` in production.
- Return safe fallbacks: `false`, `null`, `[]`, `0`.
- Display errors via Sonner toasts (`toast.error()`), not alert().
- Login errors use local `useState` error string + animated banner.

### Styling

- **Tailwind utilities** + custom CSS component classes defined in `src/index.css` using `@layer components`.
- Custom palette: `surface-50..950` (grays), `brand-50..900` (cyan), `feature-50..900` (blue), plus `success`, `warning`, `danger`, `info`.
- Glassmorphism: `.glass`, `.glass-brand`, `.glass-feature`, `.glass-hover`.
- Component classes: `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.input`, `.card`, `.panel`.
- Text hierarchy: `text-surface-50` (primary) > `text-surface-300` (secondary) > `text-surface-400` (tertiary) > `text-surface-500` (muted).
- Fonts: DM Sans (sans), JetBrains Mono (mono).
- **No CSS modules. No styled-components. No component-level CSS files.**

### Testing

- Vitest with jsdom environment.
- Tests co-located in `__tests__/` directories next to source.
- Only pure logic tested (engines, formatters, permissions, serialization). No component tests despite Testing Library being installed.
- Use `.toBeCloseTo()` for float comparisons.
- Edge cases: always cover zero, null, negative, overflow.

---

## 4. Architecture Decisions

### HashRouter over BrowserRouter
HashRouter chosen for deployment compatibility across static hosts. The `NavigationGuard` in `QuoteBuilder.tsx` hooks into `hashchange` events — switching to BrowserRouter requires refactoring it to use `popstate` or React Router's blocker API.

### Repository Pattern (partially applied)
Data flows: `Component -> Hook -> Repository -> DatabaseAdapter -> SupabaseAdapter -> Supabase`.

`IDatabaseAdapter` is a single interface with ~60 methods. `repositories.ts` provides thin per-domain wrappers (`getQuoteRepository()`, `getCompanyRepository()`, etc.).

**Bypassed in 7+ files** — these call `supabase` directly:
- `usePriceList.ts` — all price list / telematics / container queries
- `useApprovalCount.ts` — polls quotes table
- `usePresence.ts` — quote_presence CRUD + realtime
- `useQuoteLock.ts` — quotes.locked_by/locked_at updates
- `useCompanyMerge.ts` — direct multi-table queries + RPC
- `UserManagement.tsx` — calls Edge Function for create, direct Supabase for list/update
- `ApprovalDashboard.tsx`, `PendingApprovalsWidget.tsx` — direct queries

### Zustand + Immer over Redux
- Zustand: selector-based subscriptions prevent re-renders; stores accessible outside React via `.getState()`.
- Immer: only on `useQuoteStore` for deeply nested slot mutations (6 slots, each with clearing charges, local costs, configuration maps).
- No Redux boilerplate needed since all async work happens in hooks, not store middleware.

### Quote Builder: 8-step wizard
Steps: Client Info → Quote Settings → Select Units → Configure Options → Costs → Commercial → Review → Export. Managed by `BuilderContext` with `currentStep`, `direction` (animation), `completedSteps`. Steps rendered via `STEPS[currentStep]` array lookup.

### RBAC: two-layer enforcement
1. Route-level: `RequireAdmin` (hardcoded role list) blocks non-admin roles from `/admin/*`.
2. Component-level: `RequirePermission` checks `hasPermission(role, resource, action, overrides)`.
3. 6 roles: `sales_rep(1)`, `key_account(1)`, `sales_manager(2)`, `local_leader(3)`, `ceo(4)`, `system_admin(5)`.
4. 10 per-user permission overrides stored in `users.permission_overrides` JSONB.

### Code Splitting
All route-level components use `React.lazy()` with `<Suspense>`. Vite `manualChunks` isolates: react, zustand, supabase, PDF renderer, recharts, framer-motion, xlsx.

### Approval Workflow: chain-based multi-level
Status lifecycle: `draft → pending-approval → approved | rejected | in-review | changes-requested`. Each action appends to `quotes.approval_chain` JSONB array. `currentAssigneeId` tracks the active reviewer.

### Optimistic Locking
`save_quote_if_version` RPC acquires `FOR UPDATE` row lock, checks version match, applies auth/ownership checks, increments version on success.

### Pessimistic Locking
`locked_by`/`locked_at` fields on quotes. 1-hour stale timeout. Client acquires via atomic `.update().or('locked_by.is.null,locked_by.eq.${userId}')`.

---

## 5. Known Issues

> Full details in `Project documentation/PLAN.md`. Summary below.

### Phase 1 — Partially Built or Broken Features (7 items)

- **`commission_tiers` schema drift**: adapter writes `commission_rate`, DB schema says `commission_pct`. Admin pricing broken.
- **`residual_curves` three-way shape mismatch**: types, adapter, and interface all define different shapes. Admin residual editor broken.
- **`users.username` not in typed schema**: `UserManagement.tsx` queries/inserts a column not in `database.types.ts`. User admin broken.
- **`audit_log` write/read mismatch**: `logAudit()` drops `old_values`/`new_values`; reads phantom columns. Silent data loss.
- **RPC startup side effects**: constructor queries `pg_proc` (not exposed via PostgREST), probes quote sequence. Noisy errors on startup.
- **HEAD count queries fragile**: `head: true` pattern returns 503 on some Supabase configs. Affects multiple widgets.
- **Approval notifications dead**: `approval_actions` table never written to; realtime listeners never fire.

### Phase 2 — Known Bugs and Reliability (6 items)

- **Invalid quote ID shows ghost editable quote** instead of 404/redirect.
- **`setCustomerInfo` state pollution**: `Object.assign(state, info)` can overwrite internal store fields.
- **NaN propagation**: undefined slot fields cascade NaN through all pricing calculations.
- **Weak form validation**: client info and cost fields allow invalid/extreme data through.
- **Password reset UX misleading**: collects new password but sends reset email instead.
- **Missing regression tests** for high-risk flows (save conflicts, invalid IDs, approval pipeline).

### Phase 3 — Improvement Areas (7 items)

- **Mixed data access**: ~7 files bypass the adapter and call `supabase` directly.
- **~236 raw `console.*` calls** instead of logger utility (production console leaks).
- **Dashboard data duplication**: home widgets make overlapping quote fetches.
- **Builder has no top navigation bar** — disorienting for users.
- **Security hardening needed**: RLS policies, server-side user creation, session lifecycle.
- **PDF placeholders**: product images are SVGs, T&C page count hardcoded.
- **Dead code**: `useAuthStore.v2.ts`, `leadScraperTypes.ts`, empty `catalog/` dir, duplicate store actions.

### Validated as Already Addressed

- MyQuotes ownership filter already checks `createdBy OR assignedTo`.
- Leads list already uses server-side pagination via `.range(...)`.
- Loading states/skeletons already exist on key pages.
- Global app-level `ErrorBoundary` already exists.
- `syncQueue.ts` does not exist in this repository.

---

## 6. Current Status

### Working

- Quote CRUD (create, load, save, duplicate, revision, delete)
- Quote builder 8-step wizard with auto-save and locking
- Financial calculations (PMT, IRR, NPV, margins, lease rates)
- CRM (companies, contacts, activities, pipeline, kanban, merge)
- Lead management (CRUD, qualification, rejection, conversion, bulk ops)
- Authentication with PKCE, lockout, progressive delay
- Approval workflow (submit, approve, reject, escalate, return, comment)
- Client-side PDF generation (multi-page, QR codes, T&C)
- All 6 admin pages (pricing, config, approvals, users, templates, audit)
- Global search (Ctrl+K)
- Notification inbox with realtime subscriptions (Phase 4: replaced polling)
- Approval count via realtime subscriptions (Phase 4: replaced polling)
- Realtime quote updates and presence (when feature-flagged on)
- Resilient quote saves with exponential backoff + ghost-success reconciliation (Phase 4)
- Presence cleanup: beforeunload handler + client-triggered stale row cleanup (Phase 4)
- Session lifecycle enforcement: onAuthStateChange + periodic is_active re-validation (Phase 4)
- Connection status monitoring (online/Supabase reachability) (Phase 4)
- Builder top bar with exit, quote ref, and save status (Phase 4)
- Client info validation (email/phone on blur) (Phase 4)
- Code splitting with lazy routes and vendor chunks
- Phase 3: UI & Mobile Responsiveness (viewport overflow fix, responsive navigation, touch targets, mobile-optimized components)

### Responsive Patterns (Phase 3)

- **Responsive padding**: Mobile-first with `p-4 sm:p-5 md:p-6` pattern on `.card`, `.panel`, `.btn` classes in `src/index.css`
- **Mobile navigation drawer**: CrmTopBar uses hamburger + Framer Motion slide-in drawer on `<md`, copy pattern from `AdminLayout.tsx`
- **Overflow menu**: TopBar collapses actions into MoreVertical dropdown on `<md`, Save button always visible
- **Touch targets**: `min-h-[44px] min-w-[44px]` on all mobile interactive elements; Button uses `min-h-[44px] sm:min-h-0` for mobile-only enforcement
- **Bottom sheet**: SearchableSelect renders as bottom sheet on `<640px` with body scroll lock
- **Breakpoint contract**: `<md` = mobile layout, `>=md` = desktop (unchanged)

### Fixed in Phase 1 (CURRENT-PLAN.md)

- Commission tiers admin — aligned to `commission_pct` DB column
- Residual curves admin — aligned to `chemistry` + `term_36..term_84` schema
- User management admin — `username` added to typed schema
- Approval notifications — rewritten to subscribe to `quotes` table updates (was dead code)
- Audit log — now persists `old_values`/`new_values`, removed phantom column reads
- Password reset UX — removed misleading password input, now sends email clearly
- `setCustomerInfo` state pollution — replaced `Object.assign` with 7-field whitelist
- NaN propagation in pricing — `safeNum()` guards on all numeric calculation inputs
- `head: true` count queries — replaced all 11 sites with `.limit(0)` pattern
- `verifyRequiredRpcs` startup noise — removed entirely
- Invalid quote ID ghost editor — now shows "Quote Not Found" error view
- Role tamper window — rehydrated sessions no longer trusted until server-verified
- Seed script anon-key fallback — removed, fails fast without service role key
- Password policy — shared `validatePassword()` enforced on create/reset
- Dead code removed: `useAuthStore.v2.ts`, `leadScraperTypes.ts`, empty `catalog/` dir
- 60 `console.*` calls replaced with structured `logger` across 20 files
- Whole-store Zustand subscriptions replaced with `useShallow` selectors
- 56 new regression tests (178 total, up from 122)

### Fixed in Phase 1 Review Round 1 (BUILD-REVIEW.md)

- Admin user creation moved server-side via Supabase Edge Function (`supabase/functions/admin-create-user/`)
- RLS policies committed as migration artifact (`supabase/migrations/001_rls_policies.sql`)
- Clickjacking headers added to `vercel.json` (`X-Frame-Options`, CSP `frame-ancestors`)
- SPEC.md updated to match quotes-based realtime subscription (was stale)
- Approval notifications: guard for missing `payload.old.status`, filtered subscription
- Password field hidden when editing existing users (was misleading)
- Price list queries: deterministic `.order('id')` + raised limits to prevent truncation
- `auditLogMapper.ts` extracted — tests now import production functions directly
- `safeNum` exported from `useQuoteStore` — tests import real function
- Typed `LoadFromDBResult` (`'found' | 'not_found' | 'error'`) with distinct error messaging
- TECH-DEBT.md entry for `database.types.ts` auto-generation (TD-6.3)

### Fixed in Phase 4: Production Readiness (CURRENT-PLAN.md)

- Adapter consolidation: 7 files bypassing `IDatabaseAdapter` migrated to `getDb()` (approvals, presence, lock, merge, users, price list)
- Atomic RPC saves for commission tiers and residual curves (`003_atomic_saves.sql`) — no data loss window
- 97+ `console.*` calls replaced with structured `logger` across 30+ files
- Resilient fetch utility (`withQuoteSaveRetry`) with exponential backoff + version reconciliation
- Auto-save now retries transient failures with ghost-success detection
- Realtime subscriptions replace polling for approval counts and notifications (channel registry, max 5 concurrent)
- Presence: `beforeunload` cleanup + client-triggered `cleanup_stale_presence()` RPC fallback
- Session lifecycle: `onAuthStateChange` listener + periodic `is_active` re-validation every 5 min
- `forceLogout()` with 5-second grace period for in-flight auto-saves
- Connection status hook (`useConnectionStatus`) for online/Supabase reachability
- Builder top bar (`BuilderTopBar`) with exit button, quote ref, save status
- Client info validation (email format, phone 7+ digits) on blur
- Audit logging: `oldValues` fetched before pricing config saves
- Price list: migrated to adapter, overflow detection warnings
- Schema migration consolidated to `supabase/migrations/002_schema_and_rpcs.sql`
- Presence cleanup migration (`004_presence_cleanup.sql`) with `authenticated` + `service_role` grants
- CI schema drift detection (`.github/workflows/ci.yml` schema-check job)
- Dead code removed: `testSupabaseConnection.ts`, `SupabaseTestPage.tsx`, `calcResidualValueFromDB`
- Deployment docs: `docs/deployment-checklist.md`, `docs/supabase-config.md`

### Not Working / Partially Working

- Quote versions table (typed but never used — keep/remove decision pending)
- Quote collaborators table (typed but never used — keep/remove decision pending)

### Fixed in Phase 1 Review Round 5 (BUILD-REVIEW.md)

- Auto-generated `database.types.ts` from live Supabase schema (project ID `padeaqdcutqzgxujtpey`)
- Fixed misleading RLS comment — clarified that self-update requires admin/manage-users authority

### Dead Code / Unused Tables

- `quote_versions` — typed in `database.types.ts` (auto-generated) but never queried anywhere in the application. Keep/remove decision pending.
- `quote_collaborators` — typed in `database.types.ts` (auto-generated) but never queried anywhere in the application. Keep/remove decision pending.
- `calcResidualValueFromDB` — removed in Phase 4 (had zero call sites; sync `calcResidualValueFromPct` is used instead).

### Fixed in Phase 5: Edge Case & Small Bug Fixes

- Cross-tab recursion-safe logout with `skipSignOut` path (useAuthStore.ts, AuthContext.tsx)
- Logout auto-save grace period aligned with forceLogout() (useAuthStore.ts)
- Async logout with try/catch in CrmTopBar and AdminTopBar
- Defensive adapter logging for corrupt shipping_entries parsing (SupabaseAdapter.ts)
- Stale lock cleanup RPC + null-safe lock freshness check (005_stale_lock_cleanup.sql)
- Lock/presence hardening: beforeunload handler + pre-acquisition stale cleanup (useQuoteLock.ts)
- Pricing guard: empty modelCode now caught alongside '0' (useQuoteStore.ts)
- Null slot guards in UnitCard, CommercialStep, CostsStep
- CEO/System Admin approval target graceful handling (approvalEngine.ts)
- CostFieldGroup: zero displays correctly, NaN clamped to 0
- Realtime conflict detection uses version comparison instead of timestamp (useRealtimeQuote.ts)
- Double-click guard on approval confirm via useRef flag (ApprovalActionModal.tsx)
- DataTable pagination clamped after filter changes
- Approval chain parse failure now logged with user feedback (PendingApprovalsWidget.tsx)
- Save vs Submit for Approval: visual distinction + confirmation dialog (ExportStep.tsx)
- Quote ref numeric sort in QuotesListPage
- RLS policies for price_list_series, telematics_packages, container_mappings (001_rls_policies.sql)
- Removed unnecessary `(state as any)` casts for _lastSavedAt

### Fixed in Phase 6: Pre-Launch Audit Fixes

- `getMostRecentQuote()` now filters by `created_by OR assigned_to` — users only auto-load their own quotes (SupabaseAdapter.ts:444)
- Full codebase audit: 57 items reviewed, 54 confirmed already fixed in Phases 1-5
- App.tsx excludes /builder from loadMostRecent() to prevent stale data on new quote
- QuickActions.tsx calls createNewQuote() before navigating to /builder

### Fixed in Phase 7: Deep Workflow Audit Fixes (25 bugs, 6 waves)

**Wave 1 — Quote Creation Safety:**
- `createNewQuote()` no longer destroys current quote on RPC failure — `resetQuote()` moved after async success (useQuoteDB.ts)
- Lock acquisition skipped for unsaved quotes via `quoteRef === '0000.0'` guard (useQuoteLock.ts)
- QuickActionsWidget `handleNewQuote` wrapped in try/catch with toast.error (QuickActionsWidget.tsx)

**Wave 2 — Navigation ID Stability:**
- LoadQuoteModal navigates to `/quote?id=` instead of bare `/quote` (QuickActionsWidget.tsx)
- "Back to Quote" from builder includes `?id=` (ExportStep.tsx)
- CrmTopBar "New Quote" now calls `createNewQuote()` before navigating (CrmTopBar.tsx)
- BuilderTopBar exit uses `navigate('/')` instead of `window.location.hash` for NavigationGuard compatibility (BuilderTopBar.tsx)

**Wave 3 — Auth & Session Safety:**
- `RequireAuth` shows loading fallback during auth rehydration instead of flashing to /login (App.tsx, useAuthStore.ts)
- CRM/Lead in-memory filter state (searchQuery, statusFilter, assignedToFilter) cleared on logout/forceLogout (useAuthStore.ts)
- Role-change toast added in `refreshUserFromDB` when role is updated (useAuthStore.ts)

**Wave 4 — Approval Notifications & Actions:**
- Approval notification helpers (`notifyApprovalNeeded`, `notifyApprovalResult`) now called after each approval action (useApprovalActions.ts)
- `saveNotification` accepts caller's ID, falls back to UUID (SupabaseAdapter.ts, DatabaseAdapter.ts)
- `ApprovalActionModal` isSubmittingRef reset in finally block — retry works after failure (ApprovalActionModal.tsx)
- `system_admin` can now act on `in-review` quotes (approvalEngine.ts)

**Wave 5 — CRM & Lead Safety:**
- `deleteCompany` warns about orphaned quotes before deletion (CustomerDetailPage.tsx)
- `convertLead` navigates to new company after conversion (LeadDetailPage.tsx)
- `updateStage` throws for restricted roles instead of silent no-op (useCompanies.ts)
- Double-qualification guard on `qualifyLead` (useLeads.ts)
- Bulk operations show accurate success/failure count (BulkActionsBar.tsx)

**Wave 6 — UX Polish:**
- GlobalSearch now searches quotes (by ref, clientName) and contacts (by name, email) in addition to companies (GlobalSearch.tsx)
- `softDeleteUser` warns about in-flight quotes + success toast (UserManagement.tsx)
- Unmount cancellation on CustomerDetailPage and LeadDetailPage via useEffect signal pattern (CustomerDetailPage.tsx, LeadDetailPage.tsx)
- Removed misleading "View Contact in CRM" button (LeadDetailPage.tsx)

### Not Yet Implemented

- Deploy Edge Function `admin-create-user` to Supabase (code committed, needs `supabase functions deploy`)
- Deploy atomic save RPCs (`003_atomic_saves.sql`) to Supabase
- Apply schema migration (`002_schema_and_rpcs.sql`) to Supabase
- Apply presence cleanup migration (`004_presence_cleanup.sql`) to Supabase
- Apply stale lock cleanup migration (`005_stale_lock_cleanup.sql`) to Supabase
- Configure SMTP provider in Supabase Auth settings
- Configure Supabase Auth rate limiting in dashboard
- Configure Supabase connection pooling (see `docs/supabase-config.md`)
- Enable `pg_cron` for automated presence cleanup (Pro plan, see `004_presence_cleanup.sql`)
- Email integration (template types exist, no sending)
- Real product images in PDFs (placeholders only)
- Dashboard widget customisation

---

## Directory Structure

```
src/
  App.tsx                      # Root with HashRouter routes
  Dashboard.tsx                # Quote workspace layout
  main.tsx                     # Entry point
  index.css                    # Tailwind layers + component classes

  auth/                        # Permission definitions + tests
  components/
    admin/                     # Admin panel (6 sub-features)
      approvals/ audit/ catalog/ configuration/
      layout/ pricing/ shared/ templates/ users/
    auth/                      # LoginPage, AuthContext
    builder/                   # 8-step quote wizard
      shared/ steps/
    crm/                       # CRM module
      dashboard/ detail/ list/ merge/ reporting/ shared/
    dashboard/                 # Home dashboard
      widgets/
    layout/                    # App shell (DashboardLayout, WorkflowStepper)
    leads/                     # Lead management
      shared/
    notifications/
    panels/                    # Quote dashboard panels
    quotes/                    # Quote list page
    shared/                    # Cross-feature shared components
    ui/                        # Primitive UI (Button, Card, Badge, Input, etc.)
  data/                        # Static JSON (batteries, clearing charges, price lists)
  db/                          # Database layer
    interfaces.ts              # All repository interfaces + stored types
    DatabaseAdapter.ts         # Adapter interface + singleton factory
    SupabaseAdapter.ts         # 2028-line Supabase implementation
    repositories.ts            # Per-domain repository wrappers
    serialization.ts           # Quote state <-> stored format
  engine/                      # Business logic (pure functions)
    calculationEngine.ts       # PMT, IRR, NPV, margins, lease
    approvalEngine.ts          # Approval chain logic
    commissionEngine.ts        # Commission calculations
    containerOptimizer.ts      # Container packing
    formatters.ts              # Currency/date/number formatting
    validators.ts              # Input validation
  hooks/                       # Custom React hooks (~25 hooks)
  lib/
    supabase.ts                # Supabase client init
    database.types.ts          # Auto-generated DB types (via supabase gen types)
  pdf/                         # PDF generation
    assets/ components/ styles/ templates/ types.ts
    generatePDF.tsx            # Entry point
    QuoteDocument.tsx          # Multi-page layout
  store/                       # Zustand stores (5 stores)
  types/                       # Shared TypeScript types
  utils/                       # Utilities (logger, sanitize, sync queue, etc.)
```

### Where to put new files

| File type | Location |
|-----------|----------|
| Feature component | `src/components/<feature>/` |
| Shared UI primitive | `src/components/ui/` |
| Cross-feature shared | `src/components/shared/` |
| Feature-specific shared | `src/components/<feature>/shared/` |
| Hook | `src/hooks/` |
| Store | `src/store/` |
| Business logic | `src/engine/` |
| Types | `src/types/` |
| Utilities | `src/utils/` |
| DB adapter methods | `src/db/SupabaseAdapter.ts` |
| DB interfaces | `src/db/interfaces.ts` |
| Tests | `src/<module>/__tests__/` |
