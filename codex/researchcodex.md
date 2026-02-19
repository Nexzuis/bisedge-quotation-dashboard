# Bisedge Quotation Dashboard - Deep Research (`codex/researchcodex.md`)

## 1. Scope and Method
This document is based on direct codebase inspection in `src/` plus command validation.

Validation commands executed:
- `npm.cmd run typecheck` -> pass
- `npm.cmd run build` -> pass (with chunk warnings)
- `npm.cmd run test` -> pass (3 files, 90 tests)
- `npm.cmd run lint` -> fail (72 errors, 553 warnings)

Repo scale snapshot:
- `src/` files: 234
- test files: 3

## 2. Runtime Entry and Application Flow
### Entry
- `src/main.tsx`
- Sets `globalThis.Buffer` polyfill and mounts `<App />`.

### App shell and routing
- `src/App.tsx`
- Router: `HashRouter`
- Global providers: `AuthProvider`, `ToastProvider`, `ErrorBoundary`, `GlobalSearch`
- Startup sequence:
1. `seedDatabaseIfEmpty()`
2. `useConfigStore.getState().loadConfig()`
3. If authenticated, `loadMostRecent()` quote via `useQuoteDB`

### Route map (main)
- `/login` -> login page
- `/` -> home dashboard
- `/crm` -> CRM dashboard
- `/quotes` -> quote list
- `/customers` and `/customers/:id`
- `/crm/reports`
- `/quote` -> quote dashboard (panel-based)
- `/builder` -> 8-step wizard
- `/admin/*` -> admin sub-routes
- `/notifications`

## 3. Data Layer Architecture
### IndexedDB schema
- `src/db/schema.ts`
- Dexie database: `BisedgeQuotationDB`
- Implemented schema migrations: `version(1)` through `version(6)`

Core stores in active schema:
- `quotes`, `customers`, `auditLog`, `templates`, `settings`
- `forkliftModels`, `batteryModels`, `approvalTiers`, `commissionTiers`, `residualCurves`, `attachments`, `configurationMatrices`
- `users`
- `priceListSeries`, `telematicsPackages`, `containerMappings`
- `companies`, `contacts`, `activities`
- `notifications`

### Repository and adapter abstraction
- `src/db/interfaces.ts` defines repository contracts and stored shapes.
- `src/db/IndexedDBRepository.ts` implements local repositories.
- `src/db/DatabaseAdapter.ts` provides interface + mode factory (`local`, `cloud`, `hybrid`).
- `src/db/LocalAdapter.ts`, `src/db/SupabaseAdapter.ts`, `src/db/HybridAdapter.ts` implement adapter behaviors.
- `src/db/repositories.ts` exposes app-facing repository factories.

### Serialization boundary
- `src/db/serialization.ts`
- `QuoteState` uses Dates and object arrays.
- `StoredQuote` persists serialized fields, including `slots` as JSON string.

## 4. Offline-First and Sync
### Sync queue
- `src/sync/SyncQueue.ts`
- Queue stored in `localStorage` (`bisedge_sync_queue`)
- Entity priority ordering exists (`company` before `quote`)
- Retry behavior includes FK retry path
- Serialized queue processing via promise chain and `isProcessing`

### Hybrid write/read strategy
- `src/db/HybridAdapter.ts`
- Save path:
1. Save local first
2. Enqueue cloud sync (best-effort)
- Read path:
1. Local first
2. Cloud fallback and cache

### Conflict handling
- `src/sync/ConflictResolver.ts`
- Provides merge strategy for quote conflicts

## 5. Auth and RBAC
### Auth
- `src/store/useAuthStore.ts` (persisted store)
- Hybrid/cloud mode attempts Supabase auth first, then local IndexedDB fallback.
- Login logs to `auditLog`.
- Logout clears key local tables and sync queue keys.

### Role model
- `src/auth/permissions.ts`
- Roles: `sales_rep`, `key_account`, `sales_manager`, `local_leader`, `ceo`, `system_admin`
- Includes role hierarchy, permission catalog, override map.

### Current enforcement style
- Enforcement is mixed:
- Some checks use hierarchy inline in components
- Some use helper functions from `permissions.ts`
- Some pages rely on UI filtering rather than central policy gate

## 6. Quote Domain and Calculation Engine
### Quote state
- `src/types/quote.ts`
- Main aggregate: `QuoteState`
- Six-slot fleet config (`slots: UnitSlot[]`)
- Financial and approval metadata included

### Quote store
- `src/store/useQuoteStore.ts`
- Zustand + Immer
- Contains:
- Customer and terms setters
- Slot/model/configuration operations
- Pricing helper getters (`getSlotPricing`, `getQuoteTotals`)
- Approval and lock actions

### Finance calculations
- `src/engine/calculationEngine.ts`
- PMT/IRR/NPV and unit-level pricing functions
- Landed cost and margin logic

### Validation
- `src/engine/validators.ts`
- Submission and quality checks, warning/error severity model

## 7. Primary UX Modules
### Quote dashboard panels
- `src/components/layout/DashboardLayout.tsx`
- Includes: Deal Overview, Fleet Builder, Pricing/Margins, Specs, Logistics, Financial, Approval, Quote Generator, Settings

### Builder flow (8-step)
- `src/components/builder/QuoteBuilder.tsx`
- Steps:
1. Client Info
2. Quote Settings
3. Select Units
4. Configure Options
5. Costs
6. Commercial
7. Review
8. Export

### CRM
- Main pages in `src/components/crm/`
- Hooks: `useCompanies`, `useContacts`, `useActivities`
- Supports list, detail, activities, linked quotes, reporting

### Admin
- `src/components/admin/AdminLayout.tsx`
- Routes: pricing, configuration, approvals, users, templates, audit, backup

### Notifications and presence
- Notification bell/page plus optional realtime/presence hooks

## 8. PDF Pipeline
- `src/pdf/generatePDF.tsx`
- Uses `@react-pdf/renderer`
- Assembles multi-page quote output using components in `src/pdf/components/`
- Supports options from quote generator panel

## 9. Data Seeding and Static Catalog
### Seed logic
- `src/db/seed.ts`
- Seeds:
- commission tiers
- residual curves
- default admin user
- templates
- settings defaults
- price list series
- telematics packages
- container mappings
- battery models

### Static data files
- `src/data/`
- Includes large `priceListSeries.json` and pricing support JSON datasets.

## 10. System Wiring Observations
### Strongly wired
- Core app boot, auth shell, route guards
- Quote state store and financial calculators
- IndexedDB persistence, save/load, duplicate/revision
- Hybrid adapter path with queue-based sync
- PDF generation from both dashboard and builder export flows

### Legacy/modern overlap
- New price-list driven flow and older `models.json`/`batteryId` assumptions coexist.
- Some panel logic still references legacy fields while builder/store now uses local battery cost model and series-based catalog.

### Documentation drift
- Operational docs under root include stale wiring claims that do not match current code paths.

## 11. Quality Signal Summary
### Passing gates
- TypeScript compile check passes.
- Build succeeds.
- Unit tests pass (90 tests).

### Failing gate
- ESLint fails with high volume:
- 72 errors, 553 warnings
- Top rule counts:
- `no-console`: 370
- `@typescript-eslint/no-explicit-any`: 153
- `@typescript-eslint/no-unused-vars`: 50
- `react-hooks/exhaustive-deps`: 29
- `react-hooks/set-state-in-effect`: 10

## 12. Current Risk Areas (linked to audit report)
1. Quote deep-link loading path (`/quote?id=...`) does not have a corresponding query-param loader.
2. Multiple `useAutoSave()` subscriptions are mounted simultaneously in app shell and views.
3. Logistics panel shipping cost entries are UI-local and not persisted to quote state.
4. CRM access constraints do not enforce "own leads only" by default for low-privilege users.
5. Backup/restore coverage does not include all active stores.
6. Legacy field coupling impacts workflow/spec rendering correctness.

## 13. Conclusion
The system has a strong base architecture and working build/test pipeline, but it is not yet production-hardened for a 30-user rollout. The highest-priority gaps are wiring correctness, access enforcement consistency, data integrity/backup completeness, and lint-level maintainability debt.
