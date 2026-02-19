# Architecture Deep Dive

> Full architectural analysis of the Bisedge Quotation Dashboard codebase.

---

## 1. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.x |
| Language | TypeScript | 5.x |
| Build | Vite | 6.x |
| State | Zustand 5 | with Immer middleware |
| Local DB | Dexie 4 | IndexedDB wrapper |
| Cloud DB | Supabase | PostgreSQL + Realtime |
| PDF | @react-pdf/renderer | 4.x |
| Routing | react-router-dom | HashRouter |
| Auth | bcryptjs | Client-side hashing |
| Styling | Tailwind CSS | 4.x |

---

## 2. Application Architecture

### 2.1 Routing Structure

```
HashRouter
├── / → Dashboard (main quote editing view)
├── /quote → Dashboard (intended deep link target, broken)
├── /builder → QuoteBuilder (8-step wizard, lazy loaded)
├── /quotes → QuotesListPage
├── /customers → CustomerListPage
├── /customers/:id → CustomerDetailPage
├── /admin/* → AdminLayout (RequireAdmin gate)
│   ├── /admin/approvals → ApprovalDashboard
│   ├── /admin/users → UserManagement
│   ├── /admin/settings → SettingsPage
│   ├── /admin/backup → BackupRestore
│   └── ... (6 more admin sub-routes)
└── /login → LoginPage
```

**Key issue:** `RequireAuth` and `RequireAdmin` are the only route guards. `RequireAdmin` accepts 4 roles (system_admin, sales_manager, local_leader, ceo) with no per-route granularity.

### 2.2 Component Tree (Key Paths)

```
App
└── AppContent
    ├── useAutoSave() #1
    ├── useUnsavedChanges() → useAutoSave() #2
    ├── loadMostRecent() on auth (global, not route-specific)
    └── Routes
        ├── /quote → Dashboard
        │   └── DashboardLayout
        │       ├── TopBar → useAutoSave() #3
        │       ├── CrmTopBar
        │       └── Panels (6 dashboard panels)
        └── /builder → QuoteBuilder (Suspense)
            └── BuilderContent
                ├── BuilderProgressBar
                ├── BuilderBottomBar
                └── Steps[0-7] (8 wizard steps)
                    └── ExportStep → useAutoSave() #4
```

---

## 3. State Management

### 3.1 Stores

| Store | File | Purpose | Persistence |
|-------|------|---------|-------------|
| useQuoteStore | `src/store/useQuoteStore.ts` | Quote data, slots, pricing, actions | None (in-memory) |
| useAuthStore | `src/store/useAuthStore.ts` | Auth state, login/logout | localStorage (`auth-storage`) |
| useConfigStore | `src/store/useConfigStore.ts` | Commission tiers, residual curves, defaults | None |
| useCrmStore | `src/store/useCrmStore.ts` | CRM UI state (filters, view mode) | localStorage (`crm-ui-storage`) |

### 3.2 useQuoteStore — The Core Store (~845 lines)

**Structure:**
- `createInitialState()` (lines 234-283) — Generates 6 empty slots with config defaults
- `createEmptySlot(index)` (lines 54-132) — Reads from `getConfigDefaults()`, creates clearing charges and local costs
- Slot operations: `selectModel`, `updateSlot`, `toggleOption`, `setClearingCharge`, `setLocalCost`
- Pricing: `getSlotPricing(slotIndex)` (lines 574-662), `getQuoteTotals()` (lines 664-743)
- State replacement: `loadQuote(quote)` (lines 840-843) — `set(() => { return { ...createInitialState(), ...quote } })`

**Key problems identified:**
- `getSlotPricing` runs 15+ calculation steps per slot with zero memoization
- `getQuoteTotals` calls `getSlotPricing` N times per active slot, called from 9+ components
- `loadQuote` creates and immediately discards a full `createInitialState()` on every call
- Multiple components subscribe to the entire store via `useQuoteStore((s) => s)` or `useQuoteStore()`

### 3.3 Data Flow

```
User Input → Zustand Store → useAutoSave (debounce 2s) → Repository → Dexie/Supabase
                                    ↓
                              loadQuote (version bump)
                                    ↓
                              Store re-render
                                    ↓
                              9+ components recalculate pricing
```

---

## 4. Database Layer

### 4.1 Dexie Schema (6 versions)

| Version | Key Changes |
|---------|-------------|
| 1 | Initial: quotes, customers, auditLog, templates, settings, forkliftModels, batteryModels, approvalTiers, commissionTiers, residualCurves, attachments, configurationMatrices, users |
| 2 | Added priceListSeries |
| 3 | Added telematicsPackages, containerMappings |
| 4 | CRM migration: Added companies, contacts, activities. Migrated customers → companies+contacts |
| 5 | RBAC migration: admin→system_admin, manager→sales_manager, sales→sales_rep, viewer→sales_rep(deactivated). Added permissionOverrides to users |
| 6 | Added notifications |

### 4.2 Adapter Pattern

```
IDatabaseAdapter (interface)
├── LocalDatabaseAdapter (Dexie/IndexedDB)
├── SupabaseDatabaseAdapter (Supabase/PostgreSQL)
└── HybridDatabaseAdapter (Local primary + cloud sync)

Mode selection: VITE_APP_MODE = 'local' | 'cloud' | 'hybrid'
```

**Key issue:** `DatabaseAdapter.ts` statically imports all three adapters regardless of mode, triggering Supabase module evaluation even in local mode.

### 4.3 Sync Queue

- Stored in `localStorage` (not IndexedDB, despite TODO comment)
- No size limit — can grow until localStorage is full (~5-10MB)
- Processes on `online` event and constructor
- 5 retry limit for transient errors, 10 for FK violations
- Permanent failures silently removed with no admin visibility
- Singleton created at module import time (fires side effects eagerly)

---

## 5. Financial Calculation Engine

### 5.1 Calculation Chain

```
factoryCostEUR × factoryROE = factoryCostZAR
factoryCostZAR × (1 - discountPct/100) = discountedCost
discountedCost + clearingCharges + localCosts + battery + attachments + telematics = landedCostZAR
landedCostZAR × (1 + markupPct/100) = sellingPriceZAR
calcMargin(sellingPriceZAR, factoryCostZAR) = marginPct  ← BUG: should use landedCostZAR
PMT(monthlyRate, term, -sellingPrice, residualValue) = leaseRate
maintenance rates × operatingHours + leaseRate + telematics + operator = totalMonthly
totalMonthly × term = totalContractValue
IRR(cashFlows using factoryCostZAR) = annualizedIRR  ← BUG: should use landedCostZAR
NPV(monthlyRate, cashFlows) = npv
calcCommission(totalSalesPrice, inflatedMargin, tiers) = commission  ← cascading from margin bug
```

### 5.2 Critical Calculation Bugs

1. **Margin uses wrong cost basis** (`calcMargin(sellingPrice, factoryCostZAR)` — should be `landedCostZAR`)
2. **IRR uses wrong initial outlay** (accumulates `factoryCostZAR` — should be `landedCostZAR`)
3. **Commission cascades from inflated margin** (higher tier selected due to wrong margin)
4. **PMT has no division-by-zero guard** for `nPeriods = 0`
5. **customerROE** declared but never used in any pricing calculation
6. **Duties and warranty percentages** defined in JSON but hardcoded to 0 in code

### 5.3 Dual ROE Model

```
factoryROE  → Used for cost conversion (EUR → ZAR)
customerROE → Declared in types, has setter, has validation... but NEVER used
```

The documentation describes a dual-ROE model where `factoryROE` is for internal cost and `customerROE` is for customer-facing prices, but the implementation only uses `factoryROE` for everything.

---

## 6. RBAC System

### 6.1 Role Hierarchy

| Level | Role | Key Permissions |
|-------|------|-----------------|
| 0 | sales_rep | Own quotes, own CRM |
| 1 | key_account | Own quotes + can_view_all_quotes override |
| 2 | sales_manager | All quotes, team management |
| 3 | local_leader | All quotes, local approvals |
| 4 | ceo | All access |
| 5 | system_admin | All access |

### 6.2 Permission Architecture

```
ROLE_PERMISSIONS (base permissions per role)
  + DEFAULT_PERMISSION_OVERRIDES (per-role overrides)
  + user.permissionOverrides (per-user overrides)
  = effective permission
```

**Critical flaw:** The override merge at `permissions.ts:186-191` uses `if (override === true)` — explicit `false` overrides are silently ignored. You **cannot revoke** a permission via overrides.

### 6.3 Access Control Gaps

| Resource | UI Guard | Route Guard | Repository Guard |
|----------|----------|-------------|-----------------|
| Admin routes | Sidebar hides links | RequireAdmin (4 roles) | None |
| Admin sub-routes | None | None | None |
| CRM list | "My Accounts" toggle | RequireAuth only | None |
| CRM detail | None | RequireAuth only | None |
| Quotes list | Client-side filter | RequireAuth only | None |
| Backup/restore | None | RequireAdmin | None |
| User management | None | RequireAdmin | None |

---

## 7. Quote Builder Wizard

### 7.1 Step Flow

| Step | Name | Validation |
|------|------|-----------|
| 0 | Client Info | clientName + contactName required |
| 1 | Quote Settings | **None** (unconditional proceed) |
| 2 | Select Units | At least 1 active slot required |
| 3 | Configure Options | **None** (skippable) |
| 4 | Costs | **None** (skippable) |
| 5 | Commercial | **None** (unconditional proceed) |
| 6 | Review Summary | `validateQuoteSync` (warnings, few blocking errors) |
| 7 | Export | **None** (unconditional proceed) |

Only 3 of 8 steps perform any validation. Steps 3 and 4 are explicitly skippable via `SKIPPABLE_STEPS`.

### 7.2 Data Flow Issues

- Configuration cost only recalculated when `ConfigureOptionsStep` is mounted
- No save triggered on step navigation (2s data loss window)
- `completedSteps` markers never cleared on data invalidation
- Builder and Dashboard both read/write the same Zustand store with no coordination

---

## 8. PDF Generation

### 8.1 Document Structure

```
QuoteDocument
├── CoverPage (company logo, client info, dates)
├── CoverLetterPage (cover letter template)
├── TableOfContentsPage
├── QuotationTablePage × N (per variant: rental, rent-to-own)
├── SpecImagePage × M (per unique model, if includeSpecs)
├── SpecDataPage × M (per unique model, if includeSpecs)
├── TermsConditionsPage
└── SignaturePage
```

### 8.2 Data Source Issues

- `generatePDF.tsx` reads from Zustand store state + passed `totals` + `slotPricingMap`
- Additional costs use **deprecated** fields (`maintenanceCostPerMonth`, `fleetMgmtCostPerMonth`) that are always 0
- `quoteType` is ignored — always defaults to `'rental'`
- Specifications are always empty `{}`
- Battery voltage/capacity hardcoded to 0
- Signatory defaults to "John Smith, Sales Manager"
- Product images are always SVG placeholder rectangles
- Signature image is a TODO comment placeholder

---

## 9. Offline-First Sync Architecture

### 9.1 Write Path

```
User action → Zustand store mutation → updatedAt changes
  → useAutoSave detects (×3 instances) → debounce 2s
  → repository.save() → Dexie (local) + SyncQueue (hybrid)
  → SyncQueue.processQueue() → Supabase (when online)
```

### 9.2 Read Path

```
App mount → loadMostRecent() → repository.getAll() → Dexie
  → sort by updatedAt desc → loadQuote(first)
  → (No route-specific loading)
```

### 9.3 Conflict Resolution

```
ConflictResolver.resolve(localVersion, remoteVersion)
  → mergeStatus (incomplete — missing 'in-review', 'changes-requested')
  → mergeSlots (remote wins, local silently dropped)
  → mergeApprovalChain (local overrides unless remote has approver entries)
```

---

## 10. Key Architectural Weaknesses

1. **No memoization layer** — Pricing calculations run O(N×M) times per render cycle (N subscribing components × M active slots)
2. **No route-level data loading** — `loadMostRecent()` fires globally regardless of which route needs data
3. **No repository-level access control** — All permission checks are UI-layer only
4. **Eager module evaluation** — Static imports trigger Supabase initialization in all modes
5. **Multiple autosave instances** — Hook-based approach creates N instances instead of a singleton
6. **Two createEmptySlot implementations** — Store vs serialization versions have different defaults
7. **Deprecated fields still in use** — `batteryId`, `maintenanceCostPerMonth`, `fleetMgmtCostPerMonth` drive real logic
8. **localStorage for sync queue** — No size limit, can fill up and silently lose data
9. **Client-side auth** — Local mode has no server-side verification; role escalation possible via DevTools
10. **Seed overwrites admin config** — `defaultROE` and `defaultDiscountPct` force-patched on every startup

---

*Generated by Claude Code (Opus 4.6) — Architecture Deep Dive*
