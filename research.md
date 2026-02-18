# Bisedge Quotation Dashboard — Complete Codebase Research

> Deep analysis of every file, function, and connection in the codebase.
> Generated from full read of 170+ source files across all layers.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Tech Stack & Configuration](#2-tech-stack--configuration)
3. [Application Entry & Routing](#3-application-entry--routing)
4. [Database Layer](#4-database-layer)
5. [State Management](#5-state-management)
6. [Authentication & Permissions](#6-authentication--permissions)
7. [Sync Infrastructure](#7-sync-infrastructure)
8. [Custom Hooks](#8-custom-hooks)
9. [Type System](#9-type-system)
10. [Component Architecture](#10-component-architecture)
11. [Quote Builder (8-Step Wizard)](#11-quote-builder-8-step-wizard)
12. [CRM System](#12-crm-system)
13. [Admin Panel](#13-admin-panel)
14. [Dashboard Panels](#14-dashboard-panels)
15. [PDF Generation](#15-pdf-generation)
16. [UI Component Library](#16-ui-component-library)
17. [Data Files & Seeding](#17-data-files--seeding)
18. [Utilities](#18-utilities)
19. [Data Flow & Connections](#19-data-flow--connections)
20. [Known Issues & Technical Debt](#20-known-issues--technical-debt)

---

## 1. Project Structure

```
bisedge-quotation-dashboard/
├── src/
│   ├── main.tsx                    # App entry (Buffer polyfill + React root)
│   ├── App.tsx                     # Router + auth guards + DB seed
│   ├── index.css                   # Tailwind + custom CSS (glass, badges, etc.)
│   ├── auth/
│   │   └── permissions.ts          # Role hierarchy, RBAC, permission overrides
│   ├── components/
│   │   ├── auth/                   # AuthContext, LoginPage, PasswordResetPage
│   │   ├── builder/                # 8-step quote wizard
│   │   │   ├── steps/              # ClientInfo, QuoteSettings, SelectUnits, etc.
│   │   │   └── shared/             # UnitCard, RunningTotal, LivePricingPreview
│   │   ├── crm/                    # CRM dashboard, customer management
│   │   │   ├── dashboard/          # MetricCards, QuickActions, PipelineOverview
│   │   │   ├── detail/             # CompanyInfoCard, ContactsList, ActivityTimeline
│   │   │   ├── list/               # KanbanBoard, CustomerTable, StageFilter
│   │   │   ├── merge/              # CompanyMerge feature
│   │   │   ├── reporting/          # ReportsPage
│   │   │   └── shared/             # CompanyForm, stageConfig, motionVariants
│   │   ├── admin/                  # Admin panels
│   │   │   ├── pricing/            # CommissionTiers, ResidualCurves, Defaults
│   │   │   ├── users/              # UserManagement
│   │   │   ├── audit/              # AuditLogViewer
│   │   │   ├── configuration/      # ConfigurationMatrixManagement
│   │   │   ├── templates/          # TemplateManagement
│   │   │   └── layout/             # AdminLayout, AdminSidebar, AdminTopBar
│   │   ├── layout/                 # DashboardLayout, TopBar, WorkflowStepper
│   │   ├── panels/                 # 9 dashboard panels (Deal, Fleet, Financial, etc.)
│   │   ├── ui/                     # Button, Input, Badge, Toast, Skeleton, etc.
│   │   ├── shared/                 # LoadQuoteModal, ApprovalActionModal, etc.
│   │   └── notifications/          # NotificationBell, NotificationsPage
│   ├── db/
│   │   ├── schema.ts               # Dexie DB (v6, 17 stores)
│   │   ├── interfaces.ts           # All stored types + repository interfaces
│   │   ├── DatabaseAdapter.ts      # Adapter interface + factory (local/cloud/hybrid)
│   │   ├── LocalAdapter.ts         # IndexedDB-only adapter
│   │   ├── SupabaseAdapter.ts      # Supabase PostgreSQL adapter
│   │   ├── HybridAdapter.ts        # Offline-first with cloud sync
│   │   ├── IndexedDBRepository.ts  # 7 IndexedDB repository classes
│   │   ├── ConfigurationMatrixRepository.ts
│   │   ├── repositories.ts         # Factory functions + hybrid wrappers
│   │   ├── serialization.ts        # QuoteState <-> StoredQuote conversion
│   │   └── seed.ts                 # Initial data seeding
│   ├── stores/
│   │   ├── quoteStore.ts           # Zustand: quote state (50+ fields, 6 slots)
│   │   ├── authStore.ts            # Zustand: auth state (persisted localStorage)
│   │   └── crmStore.ts             # Zustand: CRM UI state (view mode, filters)
│   ├── hooks/
│   │   ├── useQuoteDB.ts           # Quote CRUD operations
│   │   ├── useAutoSave.ts          # Auto-save with 3s debounce
│   │   ├── useCompanies.ts         # Company CRUD + pipeline stage updates
│   │   ├── useContacts.ts          # Contact CRUD
│   │   ├── useActivities.ts        # Activity logging + stage change tracking
│   │   ├── usePipelineMetrics.ts   # Pipeline value/count metrics
│   │   ├── useKeyboardShortcuts.ts # Global keyboard shortcuts
│   │   ├── useWorkflowProgress.ts  # 5-step workflow completion tracking
│   │   ├── useConfirmDialog.ts     # Confirmation dialog state
│   │   └── useTelematicsPackages.ts # Telematics package data
│   ├── sync/
│   │   └── SyncQueue.ts            # Offline sync queue (localStorage-backed)
│   ├── types/
│   │   ├── quote.ts                # QuoteState, UnitSlot, ApprovalChainEntry
│   │   └── crm.ts                  # Company, Contact, Activity, PipelineStage
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client initialization
│   │   └── logger.ts               # Production-safe logger (silences debug/info)
│   ├── utils/
│   │   ├── pricing.ts              # Financial calculations (lease, IRR, NPV, etc.)
│   │   ├── quoteCalculations.ts    # Per-slot pricing calculations
│   │   ├── formatCurrency.ts       # ZAR currency formatting (R 18 711)
│   │   ├── validation.ts           # Quote validation rules
│   │   ├── excelImport.ts          # Excel price list parser
│   │   ├── conflictResolution.ts   # Quote version conflict resolver
│   │   └── sanitize.ts             # PostgREST value sanitizer
│   ├── pdf/
│   │   ├── generateQuotePDF.ts     # Main PDF generation orchestrator
│   │   ├── templates/              # PDF page templates (cover, pricing, T&Cs)
│   │   └── assets/                 # Logo, QR code, product images (Canvas PNG)
│   └── data/
│       ├── commissionTiers.json    # Commission tier definitions
│       ├── residualTables.json     # Residual value curves by chemistry
│       ├── priceListSeries.json    # 40+ forklift series with models
│       ├── containerMappings.json  # 50 shipping container configs
│       └── telematicsPackages.json # 15 telematics packages
├── vite.config.ts                  # Vite config (Buffer polyfill, manual chunks)
├── tailwind.config.ts              # Tailwind with custom colors (surface, brand)
├── tsconfig.json                   # TypeScript strict mode
├── vercel.json                     # Vercel deployment config
├── package.json                    # 30+ dependencies
└── WHAT_THIS_TOOL_IS.md            # Project context document
```

---

## 2. Tech Stack & Configuration

### package.json Dependencies

**Core:**
- `react` 19 + `react-dom` 19 + `react-router-dom` 7
- `vite` 6 + `@vitejs/plugin-react`
- `typescript` 5.7

**State:**
- `zustand` 5 + `immer` (immutable state updates)

**Database:**
- `dexie` 4 (IndexedDB wrapper)
- `@supabase/supabase-js` 2 (PostgreSQL cloud)

**UI:**
- `framer-motion` 12 (animations)
- `lucide-react` (icons)
- `@dnd-kit/core` + `@dnd-kit/sortable` (drag-and-drop)
- `recharts` (charts)

**PDF:**
- `@react-pdf/renderer` (PDF generation)
- `qrcode` (QR code generation)

**Data:**
- `xlsx` (Excel import/export)
- `bcryptjs` (password hashing)
- `buffer` (Node.js Buffer polyfill)

### vite.config.ts

```typescript
{
  plugins: [react()],
  define: { global: 'globalThis' },           // Node.js global polyfill
  resolve: { alias: { buffer: 'buffer/' } },  // Buffer polyfill
  server: { port: 5173, strictPort: true, host: true },
  build: {
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-zustand': ['zustand', 'immer'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-pdf': ['@react-pdf/renderer'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion'],
          'vendor-xlsx': ['xlsx'],
          'vendor-dexie': ['dexie'],
        }
      }
    }
  }
}
```

### tailwind.config.ts

Custom color system:
- `surface-50` through `surface-900` (dark theme grays)
- `brand-50` through `brand-900` (primary blue/teal)
- Glass morphism utility class `.glass`
- Badge variants (`.badge-success`, `.badge-warning`, etc.)

### Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_APP_MODE` | `local` / `cloud` / `hybrid` |
| `VITE_DEFAULT_ADMIN_PASSWORD` | Initial admin password (optional) |

---

## 3. Application Entry & Routing

### main.tsx
```typescript
import { Buffer } from 'buffer'
;(globalThis as any).Buffer = Buffer  // Polyfill for @react-pdf/renderer

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
)
```

### App.tsx

**Initialization:**
1. Calls `seedDatabaseIfEmpty()` on mount (populates IDB if first run)
2. Wraps everything in `<AuthProvider>` (React Context)
3. Uses `HashRouter` for SPA routing (Vercel compatible)

**Route Structure:**
```
/login              → LoginPage
/reset-password     → PasswordResetPage
/ (authenticated)   → Protected routes:
  /                 → Navigate to /customers (home)
  /quote            → DashboardLayout (quote dashboard)
  /builder          → QuoteBuilder (8-step wizard)
  /customers        → CustomerListPage
  /customers/:id    → CustomerDetailPage
  /crm/dashboard    → CrmDashboardPage
  /crm/reports      → ReportsPage
  /notifications    → NotificationsPage
  /admin/*          → AdminLayout (nested admin routes)
  *                 → NotFoundPage
```

**Auth Guard:** `ProtectedRoute` component checks `isAuthenticated` from `useAuth()`, redirects to `/login` if not.

---

## 4. Database Layer

### Architecture

Three adapter modes selected by `VITE_APP_MODE`:

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐
│ LocalAdapter │     │ SupabaseAdapter  │     │  HybridAdapter     │
│ (IndexedDB)  │     │ (PostgreSQL)     │     │ (IDB + Supabase)   │
└──────┬───────┘     └────────┬─────────┘     └────────┬───────────┘
       │                      │                        │
       └──────────────────────┴────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │ IDatabaseAdapter   │ ← Unified interface
                    │ (getDb() factory)  │
                    └────────────────────┘
```

### IndexedDB Schema (Dexie, 6 versions)

**17 Stores:**

| Store | Primary Key | Indexes |
|---|---|---|
| `quotes` | `id` | quoteRef, [quoteRef+version], status, clientName, createdAt, updatedAt, companyId, currentAssigneeId |
| `companies` | `id` | name, pipelineStage, assignedTo, createdAt, updatedAt |
| `contacts` | `id` | companyId, email, isPrimary, createdAt |
| `activities` | `id` | companyId, contactId, quoteId, type, createdBy, createdAt |
| `customers` | `id` | name, email, createdAt (legacy, migrated to companies) |
| `auditLog` | `++id` | timestamp, entityType, [entityType+entityId], userId |
| `templates` | `id` | type, [type+isDefault], name |
| `settings` | `key` | (key-value store) |
| `approvalTiers` | `++id` | tierName, tierLevel, minValue |
| `commissionTiers` | `++id` | minMargin |
| `residualCurves` | `id` | chemistry |
| `configurationMatrices` | `id` | baseModelFamily |
| `users` | `id` | username, email, role, isActive |
| `priceListSeries` | `seriesCode` | seriesName |
| `telematicsPackages` | `id` | (none) |
| `containerMappings` | `++id` | seriesCode |
| `notifications` | `id` | userId, type, isRead, createdAt |

### Version Migrations

| Version | Changes |
|---|---|
| v1 | Initial schema (quotes, customers, audit, templates, settings, config, users) |
| v2 | Added indexes (minValue, tierLevel, minMargin, email). Migrates approvalTier data. |
| v3 | Added priceListSeries, telematicsPackages, containerMappings (Fleet Builder) |
| v4 | Added companies, contacts, activities (CRM). Migrates customers → companies + contacts. Links quotes by clientName. |
| v5 | Added currentAssigneeId index. Role migration (admin→system_admin, etc.). Adds approval chain fields. |
| v6 | Added notifications table |

### Serialization (QuoteState ↔ StoredQuote)

`quoteToStored()`:
- Dates → ISO strings (with null guards)
- `slots: UnitSlot[]` → `JSON.stringify()`
- `approvalChain: ApprovalChainEntry[]` → `JSON.stringify()`

`storedToQuote()`:
- ISO strings → `new Date()` (with fallback to `Date.now()`)
- `JSON.parse(slots)` with validation (must be array of 6)
- Falls back to 6 empty slots if parse fails
- `validityDays` defaults to 30

### HybridAdapter (Offline-First Pattern)

**Write path:** Local first → queue cloud sync
```
saveQuote(quote) {
  1. Save to IndexedDB (instant, works offline)
  2. Log audit entry
  3. If online: syncQueue.enqueue({ type:'update', entity:'quote', data })
  return localResult  // instant response
}
```

**Read path:** Local first → background cloud refresh
```
loadQuote(id) {
  1. Check IndexedDB (fast)
  2. If found locally: return it, trigger background syncQuoteFromCloud()
  3. If not found + online: fetch from Supabase, cache locally, return
  4. If not found + offline: return null
}
```

**List merging:** Fetches both local and cloud, deduplicates by ID (cloud wins), sorts by updatedAt.

### Repository Pattern

7 IndexedDB repositories (`IndexedDBRepository.ts`):
- `IndexedDBQuoteRepository` — optimistic version locking, quote ref generation
- `IndexedDBCustomerRepository` — legacy, pre-CRM
- `IndexedDBCompanyRepository` — CRM companies with pipeline stages
- `IndexedDBContactRepository` — contacts per company
- `IndexedDBActivityRepository` — CRM activity log
- `IndexedDBTemplateRepository` — document templates
- `IndexedDBAuditRepository` — system audit trail

Factory functions (`repositories.ts`) wrap these in `HybridXxxRepository` classes when mode is hybrid/cloud, adding sync queue integration.

---

## 5. State Management

### quoteStore.ts (Zustand + Immer)

**The central state store.** Manages the entire active quote (50+ fields, 6 unit slots).

**Persistence:** `persist` middleware → `localStorage` key `quote-storage`

**Key State:**
```typescript
{
  // Identity
  id: string              // UUID
  quoteRef: string         // e.g. "2142.0"
  version: number          // optimistic lock version
  status: QuoteStatus      // draft, submitted, approved, etc.

  // Customer
  clientName: string
  contactName/Title/Email/Phone: string
  clientAddress: string[]  // [street, city, province, postal]
  companyId: string | null // linked CRM company

  // Pricing
  factoryROE: number       // EUR → ZAR exchange rate
  customerROE: number
  discountPct: number
  annualInterestRate: number
  defaultLeaseTermMonths: number
  batteryChemistryLock: string
  quoteType: 'rental' | 'rent-to-own' | 'dual'

  // 6 Unit Slots
  slots: UnitSlot[]        // always exactly 6 items

  // Approval workflow
  approvalTier/Status/Notes: ...
  submittedBy/At, approvedBy/At: ...
  currentAssigneeId/Role: ...
  approvalChain: ApprovalChainEntry[]

  // Ownership
  createdBy, assignedTo, lockedBy/At: ...

  // Timestamps
  quoteDate, createdAt, updatedAt: Date
  validityDays: number
}
```

**Key Actions:**
- `setCustomerInfo(field, value)` — update any customer field
- `setSlotField(slotIndex, field, value)` — update any field in a unit slot
- `clearSlot(slotIndex)` — reset slot to empty
- `setQuoteType(type)` — rental/rent-to-own/dual
- `loadQuote(state)` — replace entire state from DB
- `resetQuote()` — clear to defaults
- `setApprovalStatus(status)` — update approval workflow
- `submitForApproval(targetUserId, targetRole, notes)` — set submitted state
- `approveQuote(userId, notes)` — approve with chain entry
- `rejectQuote(userId, notes, reason)` — reject with chain entry
- `requestChanges(userId, notes)` — request changes

### authStore.ts (Zustand + Persist)

**Persistence:** `localStorage` key `auth-storage`

```typescript
{
  user: { id, username, role, fullName, email, permissionOverrides } | null
  isAuthenticated: boolean
  login(user): void
  logout(): void
}
```

### crmStore.ts (Zustand)

```typescript
{
  viewMode: 'kanban' | 'table'
  searchQuery: string
  stageFilter: PipelineStage | null
  setViewMode/setSearchQuery/setStageFilter: ...
}
```

---

## 6. Authentication & Permissions

### Auth Flow

**Hybrid auth** (Supabase first, local fallback):

1. User enters credentials on LoginPage
2. `AuthContext.login()` tries:
   a. `supabase.auth.signInWithPassword()` (if Supabase configured)
   b. If fails or not configured: local bcrypt check against `db.users` table
3. On success: stores user in `useAuthStore` (persisted to localStorage)
4. `ProtectedRoute` checks `isAuthenticated` on every route change

### Role System (`permissions.ts`)

**6 Roles with hierarchy:**
```
sales_rep (1) ─┐
key_account (1)┘
sales_manager (2)
local_leader (3)
ceo (4)
system_admin (5)
```

**Permission Model:** Resource + Action matrix

Resources: `quotes`, `quotes:view_all`, `crm:companies`, `crm:activities`, `admin:pricing`, `admin:catalog`, `admin:users`, `admin:templates`, `admin:audit`, `admin:backup`, `approval:*`

Actions: `read`, `create`, `update`, `delete`, `*` (wildcard)

**Permission Overrides:** Per-user boolean flags that grant/deny specific capabilities:
- `can_view_all_quotes`, `can_skip_approval_levels`, `can_edit_any_quote`
- `can_approve_quotes`, `can_manage_users`, `can_manage_pricing`
- `can_view_audit_log`, `can_export_data`, `can_manage_templates`, `can_manage_backups`

**Helper Functions:**
- `hasPermission(role, resource, action, overrides?)` — main permission check
- `canApproveQuotes(role, overrides?)` — approval capability check
- `getApprovalTargetRoles(role)` — roles this user can submit to
- `getRolesAbove/Below(role)` — hierarchy navigation

---

## 7. Sync Infrastructure

### SyncQueue (`sync/SyncQueue.ts`)

**Architecture:** localStorage-backed queue with Promise-chain mutex.

**Key Features:**
- **Deduplication:** Same entity+entityId overwrites existing queue entry
- **Priority ordering:** companies (0) → contacts/customers (1) → activities/notifications (2) → quotes (3)
- **Permanent failure blocklist:** Entities that hit PG errors 23503 (FK violation), 23505 (unique violation), 42703, 42P01 are permanently blocked from re-sync
- **Mutex:** `_processingPromise` chains all `processQueue()` calls to prevent concurrent runs
- **Auth check:** Skips sync if no authenticated Supabase session
- **Retry limit:** 5 retries for transient errors, then removed from queue

**Queue Entry:**
```typescript
{
  id: string          // UUID
  type: 'create' | 'update' | 'delete'
  entity: 'quote' | 'customer' | 'company' | 'contact' | 'activity' | 'notification'
  entityId: string
  data: any           // full entity payload for upsert
  timestamp: number
  retries: number
  lastError?: string
}
```

**Sync to Supabase:** Uses `supabase.from(table).upsert(data).select()` — the `.select()` detects silent RLS rejections (returns empty data array).

**React Hook:** `useSyncStatus()` subscribes to sync status changes (pending count, online status, syncing state).

---

## 8. Custom Hooks

### useQuoteDB

The main hook for quote CRUD operations.

```typescript
{
  saveQuote(): Promise<SaveResult>     // saves current quoteStore state to DB
  loadQuote(id): Promise<void>         // loads quote into store
  deleteQuote(id): Promise<void>
  duplicateQuote(id): Promise<SaveResult>
  createRevision(id): Promise<SaveResult>
  listQuotes(options, filters): Promise<PaginatedResult>
  searchQuotes(query): Promise<StoredQuote[]>
  loadMostRecent(): Promise<void>      // loads last edited quote on app start
  loading: boolean
  error: string | null
}
```

### useAutoSave

Auto-saves quote to DB with 3-second debounce after any state change.

```typescript
{
  lastSaved: Date | null
  isSaving: boolean
  error: string | null
  saveNow(): Promise<void>            // manual trigger
}
```

**How it works:**
1. Subscribes to `useQuoteStore` via `subscribe()`
2. On state change: starts 3s debounce timer
3. When timer fires: calls `saveQuote()` from `useQuoteDB`
4. Skips save if quote has no `id` (new unsaved quote)

### useCompanies

```typescript
{
  companies: StoredCompany[]
  loading: boolean
  error: string | null
  refresh(): Promise<void>
  saveCompany(data): Promise<string>
  updateCompany(id, updates): Promise<void>
  updateStage(id, stage): Promise<void>
  deleteCompany(id): Promise<void>
  searchCompanies(query): Promise<StoredCompany[]>
}
```

### useContacts

```typescript
{
  contacts: StoredContact[]
  loading: boolean
  loadContacts(companyId): Promise<void>
  saveContact(data): Promise<string>
  updateContact(id, updates): Promise<void>
  deleteContact(id): Promise<void>
}
```

### useActivities

```typescript
{
  activities: StoredActivity[]
  loading: boolean
  loadActivities(companyId): Promise<void>
  saveActivity(data): Promise<string>
  logStageChange(companyId, fromStage, toStage, userId): Promise<void>
  deleteActivity(id): Promise<void>
}
```

### usePipelineMetrics

Calculates pipeline metrics from company data:
```typescript
{
  totalCompanies: number
  totalValue: number
  stageBreakdown: Record<PipelineStage, { count: number, value: number }>
  loading: boolean
}
```

### useWorkflowProgress

Tracks 5-step quote workflow completion:
```
1. Client Info (clientName + contactName filled)
2. Fleet Selection (at least 1 active slot)
3. Pricing (margin > 0 for any slot)
4. Financial Review (NPV/IRR calculated)
5. Approval (submitted or approved)
```

Returns: `{ steps, currentStep, completionPct }`

### useKeyboardShortcuts

Global keyboard shortcuts:
- `Ctrl+S` — Save quote
- `Ctrl+N` — New quote
- `Ctrl+E` — Export PDF
- `Ctrl+B` — Open builder
- `Ctrl+/` — Focus search

### useConfirmDialog

Returns `{ confirm(message, onConfirm), dialog }` for rendering a confirmation modal.

### useTelematicsPackages

Loads telematics packages from IndexedDB on mount. Returns `{ packages, loading }`.

---

## 9. Type System

### QuoteState (`types/quote.ts`)

The core quote type with all fields (50+). See quoteStore section above for structure.

**QuoteStatus:** `'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'changes_requested' | 'expired'`

### UnitSlot

Each quote has exactly 6 unit slots. A slot is "active" if `isEmpty === false`.

```typescript
{
  slotIndex: 0-5
  isEmpty: boolean

  // Vehicle identity
  seriesCode, modelCode, modelName, modelDescription: string
  materialNumber: string
  quantity: number (1-99)

  // Base pricing
  baseEurCost: number           // from price list
  configurationCostEur: number  // selected options delta

  // Selected options
  selectedOptions: Record<specCode, optionCode>
  availableOptions: Array<{specCode, options[]}>

  // Local costs (ZAR)
  localBatteryCost, localBatteryDescription: ...
  telematicsPackageId, telematicsCostPerMonth: ...
  localAttachmentCost: number
  clearingCharges: { inlandFreight, seaFreight, portCharges, transport, destuffing, duties, warranty }
  localCosts: { assembly, loadTest, delivery, pdi, extras }

  // Commercial
  discountPct, markupPct, financeCostPct: number
  operatingHoursPerMonth: number (default 180)
  leaseTermMonths: number (default 60)
  residualValueTruckPct, residualValueBatteryPct, residualValueAttachmentPct: number
  maintenanceRatePerHourTruck, maintenanceRatePerHourTires, maintenanceRatePerHourAttachment: number
  telematicsCostPerMonth, telematicsSellingPerMonth: number
  operatorPricePerMonth: number
}
```

### ApprovalChainEntry

```typescript
{
  step: number
  action: 'submit' | 'approve' | 'reject' | 'escalate' | 'return' | 'comment' | 'edit_review'
  fromUserId, toUserId: string
  fromRole, toRole: string
  notes: string
  timestamp: string (ISO)
}
```

### CRM Types (`types/crm.ts`)

**PipelineStage:** `'lead' | 'contacted' | 'site-assessment' | 'quoted' | 'negotiation' | 'won' | 'lost'`

**Company:** Full company record with address, pipeline stage, estimated value, credit limit, tags, notes.

**Contact:** Person linked to a company (firstName, lastName, title, email, phone, isPrimary).

**Activity:** CRM event (type: call/email/meeting/note/stage_change, linked to company/contact/quote).

---

## 10. Component Architecture

### Layout Hierarchy

```
App.tsx
├── AuthProvider (Context)
│   ├── LoginPage (public)
│   └── ProtectedRoute
│       ├── CrmDashboardPage (/#/crm/dashboard)
│       ├── CustomerListPage (/#/customers)
│       ├── CustomerDetailPage (/#/customers/:id)
│       ├── DashboardLayout (/#/quote)
│       │   ├── TopBar
│       │   ├── WorkflowStepper
│       │   └── 9 Dashboard Panels (grid)
│       ├── QuoteBuilder (/#/builder)
│       │   ├── BuilderProvider (Context)
│       │   ├── BuilderLayout
│       │   │   ├── BuilderProgressBar
│       │   │   ├── AnimatedStep → StepComponent
│       │   │   └── BuilderBottomBar
│       ├── AdminLayout (/#/admin/*)
│       │   ├── AdminTopBar
│       │   ├── AdminSidebar
│       │   └── Admin Routes (7 pages)
│       ├── ReportsPage (/#/crm/reports)
│       └── NotificationsPage (/#/notifications)
```

### Error Boundaries

3 levels of error boundaries:
1. **App-level:** `ErrorBoundary` wraps entire app — "Something went wrong" with Retry/Reload
2. **Admin-level:** `AdminErrorBoundary` wraps admin routes
3. **Tab-level:** `TabErrorBoundary` wraps individual admin tabs (pricing, etc.)

---

## 11. Quote Builder (8-Step Wizard)

### BuilderContext

Central state for wizard flow:
- `currentStep` (0-7), `direction` (forward/back for animations)
- `completedSteps: Set<number>`
- `activeSlotIndex` (which unit is being configured)
- `unitPickerPhase` (roster/series/model for step 3)
- `canProceed` (controls Next button)

### Step Details

| Step | Component | Validation | Skippable |
|---|---|---|---|
| 0 | ClientInfoStep | clientName + contactName required | No |
| 1 | QuoteSettingsStep | Always valid (has defaults) | No |
| 2 | SelectUnitsStep | At least 1 active slot | No |
| 3 | ConfigureOptionsStep | Always valid | Yes |
| 4 | CostsStep | Always valid | Yes |
| 5 | CommercialStep | Always valid | No |
| 6 | ReviewSummaryStep | No blocking validation errors | No |
| 7 | ExportStep | Always valid | No |

### Step 3 (SelectUnits) — Three-Phase Picker

```
Phase 1: Roster        Phase 2: Series        Phase 3: Model
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ [Unit 1] E20PH  │    │ Search: _______ │    │ Qty: [1] [+][-] │
│ [Unit 2] Empty  │→   │ [Series 386]    │→   │ [E20PH]  €14k   │
│ [Unit 3] Empty  │    │ [Series 1252]   │    │ [E25PH]  €16k   │
│ [+ Add Unit]    │    │ [Series 1275]   │    │ [E30PH]  €18k   │
│ (max 6)         │    │ [← Back]        │    │ [← Back]         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Step 4 (ConfigureOptions) — Category Accordion

Options grouped by spec code category (Basic, Pedals/Brakes, Wheels/Tires, Cabin, Electrical, etc.). Each option shows:
- Checkbox (disabled if standard/availability=1)
- Description
- Availability badge (Standard=green, Optional=blue, Non-Standard=amber)
- EUR price delta (converted to ZAR via factoryROE)

### Step 6 (Commercial) — Live Pricing Preview

Real-time pricing calculations update as user changes values:
- Landed Cost = factory cost + options + local costs + clearing
- Selling Price = landed × (1 + markup%)
- Margin = (selling - landed) / selling × 100
- Lease Rate = annuity formula (principal, rate, term)
- Total Monthly = lease + maintenance + telematics + operator

### Step 7 (Review) — Validation

`validateQuoteSync()` checks:
- Client name not empty
- At least 1 active slot
- All active slots have series/model selected
- Margins within acceptable range
- No NaN/Infinity values

Returns `{ errors: string[], warnings: string[] }`. Blocking errors prevent proceeding.

### Step 8 (Export) — Four Actions

1. **Save Quote** — saves to DB via useAutoSave
2. **Export PDF** — generates professional quote PDF
3. **Submit for Approval** — opens ApprovalActionModal, targets specific user/role
4. **Back to Dashboard** — navigates to /quote

---

## 12. CRM System

### Pipeline Stages

```
Lead → Contacted → Site Assessment → Quoted → Negotiation → Won/Lost
```

Each stage has: key, label, color (Tailwind class), icon (Lucide).

### CRM Dashboard (`CrmDashboardPage`)

- **MetricCards:** Total companies, pipeline value, won deals, conversion rate
- **QuickActions:** New Lead, Open Builder, View Reports
- **PipelineOverviewBar:** Horizontal bar chart showing value per stage
- **RecentActivityFeed:** Last 10 activities across all companies
- **NeedsAttention:** Companies needing follow-up

Loading state: Full-page skeleton with animated pulse cards.

### Customer List (`CustomerListPage`)

Two views:
- **Kanban Board:** Drag-and-drop columns per pipeline stage (DND Kit)
- **Customer Table:** Sortable table with checkbox selection

Features:
- Search with debounce
- Stage filter
- "My Accounts" toggle (assigned to current user)
- Export to XLSX (with error handling)
- Bulk actions (when items selected)
- New Lead modal (CompanyForm)

### Customer Detail (`CustomerDetailPage`)

Two-column layout:
- **Left:** CompanyInfoCard (editable), ContactsList (add/edit/delete)
- **Right:** AddActivityForm, ActivityTimeline, LinkedQuotes

### Kanban Board

Uses `@dnd-kit/core` with PointerSensor (8px activation distance).

On drag end:
1. `updateStage(companyId, targetStage)` — update company pipeline stage
2. `logStageChange(companyId, from, to, userId)` — log activity
3. Toast notification
4. Refresh data

### Company Merge

Allows merging duplicate companies:
- Select source (absorbed) and target (kept) companies
- Migrates contacts, activities, and quotes from source to target
- Deletes source company after merge

---

## 13. Admin Panel

### Admin Routes

| Route | Component | Purpose |
|---|---|---|
| `/admin/pricing` | PricingManagement | Commission tiers, residual curves, defaults |
| `/admin/configuration` | ConfigurationMatrixManagement | Import Excel config matrix |
| `/admin/approvals` | ApprovalDashboard | Approval queue management |
| `/admin/users` | UserManagement | Add/edit/deactivate users |
| `/admin/templates` | TemplateManagement | T&Cs, cover letters, email, headers |
| `/admin/audit` | AuditLogViewer | System audit trail |
| `/admin/backup` | BackupRestore | JSON export/import |

### Pricing Management

Three tabs:
1. **Commission Tiers:** Table of margin% ranges → commission rates
2. **Residual Curves:** Lead-acid and Lithium-ion residual% by term (36/48/60/72/84)
3. **Default Values:** ROE, interest rate, CPI rate, operating hours, lease term, telematics cost

### User Management

- Add/edit/deactivate users
- Assign roles from 6-role hierarchy
- Per-user permission overrides (10 toggles)
- Password management (bcrypt hashed)

### Backup & Restore

**Export:** Dumps all 17 IDB stores to JSON (excludes password hashes).

**Import modes:**
- **Merge:** Keep existing records, add new ones
- **Replace:** Clear all data, import fresh

### Audit Log

Tracks: login, create, update, delete, approve, reject, submit, escalate, return, comment, edit_review.

Entity types: quote, customer, company, contact, template, user, approvalTiers, commissionTiers, residualCurves, settings, forkliftModel, batteryModel, attachment.

---

## 14. Dashboard Panels

The main quote dashboard (`/#/quote`) shows 9 panels in a responsive grid:

| Panel | Purpose | Key Data |
|---|---|---|
| DealOverviewPanel | Client info form | Name, contact, email, phone, address |
| FleetBuilderPanel | Compact 6-slot config | Series, model, quantity, all costs, commercial |
| PricingMarginsPanel | Pricing metrics | Margins, markups, discounts |
| SpecsViewerPanel | Vehicle specifications | Model specs from price list |
| LogisticsPanel | Container/shipping info | Container mapping, freight costs |
| FinancialAnalysisPanel | Financial summary | NPV, IRR, commission, contract value |
| ApprovalWorkflowPanel | Approval status | Chain breadcrumb, status badge, actions |
| QuoteGeneratorPanel | PDF generation | Export button, template selection |
| SettingsPanel | Quote settings | ROE, interest, lease term, quote type |

### FleetBuilderPanel (Most Complex)

Each of the 6 slots is a collapsible card with:
- Series selection (SearchableSelect with 40+ series)
- Model selection (filtered by series)
- Quantity, discount, lease term
- Operating hours
- **Configuration Options** (accordion, same as Builder Step 4)
- **Costs** (battery, telematics, clearing charges, local costs)
- **Commercial** (markup, residuals, maintenance, operator)
- **Pricing Summary** (factory→landed→selling, margin, lease rate, total monthly)

---

## 15. PDF Generation

### Architecture

```
generateQuotePDF(quote, pricingMap)
├── Cover Page (company logo, client info, quote ref)
├── Per-Unit Pricing Pages (1 per active slot)
│   ├── Product image (Canvas PNG placeholder)
│   ├── Specification table
│   ├── Pricing breakdown (factory→landed→selling)
│   ├── Monthly payment schedule
│   └── QR code (links to Linde product page)
├── Financial Summary Page
│   ├── Fleet overview table
│   ├── Total contract value
│   └── NPV/IRR analysis
├── Terms & Conditions Page
│   └── Loaded from templates store
└── Cover Letter Page (optional)
    └── Loaded from templates store
```

### Assets (Canvas API PNG)

All images are generated as PNG data URIs via Canvas API (not SVG) for `@react-pdf/renderer` compatibility:

- **bisedgeLogo.ts:** Renders company logo as PNG (lazy-cached via getter)
- **productImages/index.ts:** Renders product placeholder (model code + name in rounded rect)
- **qrCodeGenerator.ts:** Uses `qrcode` library, falls back to Canvas PNG placeholder

### QR Code

`generateQRCode(url)` → data URI PNG
`getLindeProductUrl(modelCode)` → `https://www.linde-mh.com/en/products/electric-forklift-trucks/{cleanCode}`

---

## 16. UI Component Library

### Shared Components

| Component | Props | Purpose |
|---|---|---|
| `Button` | variant, icon, loading, disabled | Primary/secondary/ghost/danger/feature buttons |
| `Input` | error, label | Form input with error display |
| `Badge` | variant | Status badges (success/warning/danger/info/brand) |
| `Card` | - | Glass morphism container |
| `Panel` | accent | Dashboard panel with colored accent |
| `Checkbox` | - | Custom styled checkbox |
| `Skeleton` | className | Loading placeholder with pulse animation |
| `Tooltip` | content | Hover tooltip |
| `SearchableSelect` | value, onChange, options | Dropdown with search |
| `CompanyAutocomplete` | value, onChange, onSelect, onClear | Async company search |
| `Toast` | - | Toast notification system (success/error/info/warning) |
| `CornerBrackets` | - | Decorative corner elements |
| `DotGrid` | - | Background dot pattern |

### Toast System

```typescript
toast.success('Quote saved successfully')
toast.error('Failed to export PDF')
toast.info('Syncing to cloud...')
toast.warning('Margin below threshold')
```

Auto-dismiss with configurable timeout. Stack management for multiple toasts.

### Modal Pattern

All modals follow the same pattern:
- Fixed positioning with `z-50`
- Backdrop with `bg-black/60 backdrop-blur-sm`
- `AnimatePresence` for smooth enter/exit
- Escape key to close
- Click outside to close
- `role="dialog"` and `aria-modal="true"`

---

## 17. Data Files & Seeding

### JSON Data Files

| File | Records | Content |
|---|---|---|
| `commissionTiers.json` | ~6 | Margin% ranges → commission% |
| `residualTables.json` | 2 | Lead-acid + Lithium-ion residual curves |
| `priceListSeries.json` | ~40 | Forklift series with nested models + options |
| `containerMappings.json` | ~50 | Series → container type/qty/cost |
| `telematicsPackages.json` | 15 | Telematics subscription options with costs |

### Seed Logic (`seed.ts`)

On first app load, `seedDatabaseIfEmpty()` populates:
1. Commission tiers from JSON
2. Residual curves (lead-acid + lithium-ion)
3. Default admin user (bcrypt hashed password)
4. Default templates (T&Cs + cover letter)
5. Default settings (ROE, interest, lease term, etc.)
6. Price list series from JSON
7. Telematics packages from JSON
8. Container mappings from JSON (with 1275 patch)

**Fast path:** `isDatabaseFullySeeded()` checks all tables have data, skips entire seed if true.

**Idempotent:** Uses `bulkPut()` (upsert) to avoid conflicts on re-seed.

---

## 18. Utilities

### pricing.ts — Financial Calculations

```typescript
calculateLeaseRate(principal, annualRate, termMonths, residualPct)
  // Annuity formula with residual value
  // PMT = PV × r / (1 - (1+r)^-n) - FV × r / ((1+r)^n - 1)

calculateIRR(cashFlows)
  // Newton-Raphson iteration for Internal Rate of Return

calculateNPV(rate, cashFlows)
  // Sum of discounted cash flows

calculateCommission(margin, tiers)
  // Lookup commission rate by margin% bracket

calculateMargin(sellingPrice, landedCost)
  // (selling - landed) / selling × 100
```

### quoteCalculations.ts — Per-Slot Pricing

```typescript
calculateSlotPricing(slot, factoryROE, customerROE)
  // Returns: factoryCostZAR, landedCostZAR, sellingPriceZAR,
  //          leaseRate, maintenanceCost, totalMonthly, costPerHour,
  //          margin, commission, contractValue
```

**Pricing Chain:**
```
Base EUR Cost
  × Factory ROE → Factory Cost ZAR
  + Config Options EUR × ROE
  + Local Battery + Telematics + Attachment
  + Clearing Charges (freight, port, transport, duties, warranty)
  + Local Costs (assembly, load test, delivery, PDI, extras)
  = Landed Cost ZAR
  × (1 + Markup%)
  - Discount
  = Selling Price ZAR
```

### formatCurrency.ts

```typescript
formatZAR(amount)           // "R 18 711.00"
formatEUR(amount)           // "€14 230.00"
formatNumber(amount, dp)    // "18 711.23"
```

Uses space-separated thousands (SA convention).

### validation.ts

`validateQuoteSync(quote)` returns `{ errors: string[], warnings: string[] }`:
- **Errors:** Missing client name, no units, units without model, NaN values
- **Warnings:** Low margins (<15%), missing contact info, high discount

### excelImport.ts

Parses Excel price list files:
- Column A: Material Number (base model)
- Column B: Long Code (option identifier)
- Column C: Spec Code (e.g. 1100, 1135)
- Column D: Description
- Columns E-I: INDX1-5 (availability: 0/1/2/3)

### conflictResolution.ts

`resolveQuoteConflict(local, cloud)`:
- Compares versions
- If cloud is newer: use cloud (with local unsaved changes merged)
- If local is newer: use local
- If same version: merge by field-level timestamp comparison

### sanitize.ts

`sanitizePostgrestValue(value)`:
- Escapes special PostgREST characters in filter values
- Prevents injection in `.ilike()` and `.eq()` queries

---

## 19. Data Flow & Connections

### Quote Save Flow
```
User edits in Builder/Dashboard
  → Zustand quoteStore.setSlotField()
  → useAutoSave detects change (3s debounce)
  → useQuoteDB.saveQuote()
  → getDb().saveQuote(quoteState)
  → HybridAdapter:
      1. quoteToStored() serialization
      2. db.quotes.put() (IndexedDB)
      3. getCurrentAuditUser() → db.auditLog.add()
      4. syncQueue.enqueue({ entity:'quote', data })
  → SyncQueue.processQueue() (if online):
      1. Sort by entity priority
      2. supabase.from('quotes').upsert(snakeCaseData).select()
      3. Remove from queue on success
```

### CRM Data Flow
```
User drags Kanban card
  → KanbanBoard.handleDragEnd()
  → useCompanies.updateStage(id, newStage)
  → getDb().updateCompany(id, { pipelineStage })
  → HybridAdapter:
      1. db.companies.update()
      2. db.auditLog.add()
      3. syncQueue.enqueue({ entity:'company', data })
  → useActivities.logStageChange()
  → getDb().saveActivity({ type:'stage_change' })
  → Toast: "Moved X to Y"
```

### PDF Generation Flow
```
User clicks Export PDF
  → generateQuotePDF(quoteState, pricingMap)
  → For each active slot:
      1. getProductImage(modelCode) → Canvas PNG
      2. generateQRCode(lindeUrl) → PNG data URI
      3. Build pricing table data
  → Load T&Cs template from IndexedDB
  → Load cover letter template
  → Assemble @react-pdf/renderer document
  → Render to blob → download
```

### Auth Flow
```
LoginPage.handleSubmit()
  → AuthContext.login(email, password)
  → Try: supabase.auth.signInWithPassword()
  → Fallback: db.users.get() + bcrypt.compare()
  → useAuthStore.login(user) → persisted to localStorage
  → Navigate to /customers
```

---

## 20. Known Issues & Technical Debt

### Critical Bugs

| # | Issue | Location | Status |
|---|---|---|---|
| 001 | FK sync loop (company not synced before quote) | SyncQueue.ts | Fixed: permanent failure blocklist |
| 002 | processQueue() race condition (concurrent runs) | SyncQueue.ts | Fixed: Promise-chain mutex |
| 003 | `slots` stored as JSON string, not parsed array | serialization.ts | Partially addressed (parse with fallback) |
| 004 | PDF SVG logos render blank, Buffer not defined | bisedgeLogo.ts, main.tsx | Fixed: Canvas PNG + Buffer polyfill |

### High Priority

| # | Issue | Location | Status |
|---|---|---|---|
| 005 | Series 1275 missing from containerMappings | containerMappings.json, seed.ts | Fixed: added entry + patch |
| 006 | CRM Dashboard blank screen on load | CrmDashboardPage.tsx | Fixed: loading skeleton |
| 007 | New Lead modal validation on open | CompanyForm.tsx | Open |

### Medium Priority

| # | Issue | Status |
|---|---|---|
| 008 | batteryModels store empty | Open (needs data population) |
| 009 | contacts/activities stores empty | Open (CRM not being used yet) |
| 010 | Specs card "Model data not found" | Related to #003 |
| 011 | Customer export zero feedback | Fixed: try-catch + error toast |
| 012 | Audit log only logs LOGIN events | Fixed: added CRUD audit logging |
| 013 | Residual value charts render empty | Open |

### Architectural Debt

1. **List merging pagination bug (HybridAdapter):** After merging cloud+local, pagination is re-applied to merged list. Can hide local-only items.
2. **Search never syncs:** `searchQuotes()` only queries local IndexedDB, never cloud. Returns stale results.
3. **No atomic transactions:** Multi-table operations (company + contacts + quotes) not atomic. Partial failure possible.
4. **Double camelCase/snake_case conversion:** HybridAdapter converts for sync, SupabaseAdapter converts on read. Some paths convert twice.
5. **Missing IDatabaseAdapter methods:** `getContactById()` and `getActivityByQuote()` fall back to raw IndexedDB even in hybrid mode.
6. **ConfigurationMatrix linear scan:** `getVariantByCode()` scans all matrices. O(n) complexity.
7. **Password generation bias:** Uses modulo on random bytes, introducing slight character distribution bias.
8. **forkliftModels + batteryModels stores:** Defined in schema but never populated. Legacy from pre-priceListSeries design.
9. **Residual curves hardcoded:** Only supports lead-acid and lithium-ion. Adding new chemistry requires code change in seed.ts.
10. **No offline indicator:** User has no visual feedback when operating offline (SyncStatusIndicator exists but may not be mounted everywhere).

### Performance Concerns

1. **vendor-pdf chunk ~4MB:** @react-pdf/renderer is very large. Code-split but still impacts initial bundle.
2. **No virtual scrolling:** Large quote/company lists render all items. Could lag with 100+ records.
3. **localStorage sync queue:** Sync operations stored in localStorage (5MB limit). Heavy use could exceed.
4. **Full company list reload:** `listCompanies()` fetches ALL companies on every CRM page load. No cursor-based pagination.

---

## Summary

The Bisedge Quotation Dashboard is a **production-grade offline-first SPA** with:

- **170+ source files** across 15 directories
- **17 IndexedDB stores** with 6 schema versions and data migrations
- **3 database adapter modes** (local, cloud, hybrid) behind unified interface
- **8-step quote builder** with real-time pricing, option configuration, and PDF export
- **CRM system** with drag-and-drop Kanban, activity logging, company management
- **6-role RBAC** with 10 permission overrides and approval chain workflow
- **Offline sync queue** with priority ordering, deduplication, permanent failure blocklist
- **Professional PDF generation** with QR codes, product images, financial summaries
- **Full admin panel** with pricing config, user management, audit logging, backup/restore

The architecture is solid for a small-team tool. The main areas needing attention are: completing data population (battery models, config matrices), addressing the list merge pagination bug in hybrid mode, and adding visual offline/sync status indicators.
