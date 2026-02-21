# SPEC.md - Bisedge Quotation Dashboard

Generated: 2026-02-21
Scope: Documents what is implemented in this repository right now.
Source files used: `src/*`, `scripts/*`, `package.json`, `.env.example`, `vercel.json`.

---

## 1. Project overview

`bisedge-quotation-dashboard` is a React single-page application (HashRouter) for:

- Building and editing forklift quotations.
- Financial modeling (lease pricing, margins, IRR/NPV, commission, shipping/logistics).
- CRM company/contact/activity tracking.
- Lead management and lead-to-company/contact conversion.
- Role-based approval workflow and audit logging.
- Admin configuration (pricing defaults, matrices, templates, users, audit view).
- Client-side PDF generation for quotes.

Runtime architecture:

- No custom runtime API server in this repo.
- Frontend talks directly to Supabase (Auth, PostgREST, Realtime, RPC).
- Vercel serves the static build.

Important implementation detail:

- Data access is mixed:
  - Many features use `IDatabaseAdapter` -> `SupabaseDatabaseAdapter`.
  - Several features call `supabase` directly from hooks/components (not only through the adapter).

---

## 2. Tech stack (from package.json)

### Runtime dependencies

| Package | Version |
|---|---|
| `react` | `^19.2.0` |
| `react-dom` | `^19.2.0` |
| `react-router-dom` | `^7.13.0` |
| `@types/react-router-dom` | `^5.3.3` |
| `zustand` | `^5.0.11` |
| `immer` | `^11.1.4` |
| `@supabase/supabase-js` | `^2.95.3` |
| `tailwindcss` | `^3.4.19` |
| `framer-motion` | `^12.34.0` |
| `lucide-react` | `^0.564.0` |
| `@radix-ui/react-tooltip` | `^1.2.8` |
| `sonner` | `^2.0.7` |
| `recharts` | `^3.7.0` |
| `@react-pdf/renderer` | `^4.3.2` |
| `qrcode` | `^1.5.4` |
| `qrcode.react` | `^4.2.0` |
| `xlsx` | `^0.18.5` |
| `@dnd-kit/core` | `^6.3.1` |
| `@dnd-kit/sortable` | `^10.0.0` |
| `@dnd-kit/utilities` | `^3.2.2` |
| `@tanstack/react-virtual` | `^3.13.18` |
| `buffer` | `^6.0.3` |

### Dev/build/test dependencies

| Package | Version |
|---|---|
| `vite` | `^7.3.1` |
| `@vitejs/plugin-react` | `^5.1.1` |
| `typescript` | `~5.9.3` |
| `eslint` | `^9.39.1` |
| `@eslint/js` | `^9.39.1` |
| `typescript-eslint` | `^8.48.0` |
| `eslint-plugin-react-hooks` | `^7.0.1` |
| `eslint-plugin-react-refresh` | `^0.4.24` |
| `vitest` | `^4.0.18` |
| `@testing-library/react` | `^16.3.2` |
| `@testing-library/jest-dom` | `^6.9.1` |
| `jsdom` | `^28.1.0` |
| `postcss` | `^8.5.6` |
| `autoprefixer` | `^10.4.24` |
| `kill-port` | `^2.0.1` |
| `@types/node` | `^24.10.1` |
| `@types/react` | `^19.2.7` |
| `@types/react-dom` | `^19.2.3` |
| `@types/qrcode` | `^1.5.6` |
| `@types/qrcode.react` | `^1.0.5` |

### Scripts

| Script | Command |
|---|---|
| `dev` | `node scripts/start-dev.js` |
| `dev:simple` | `vite --port 5173` |
| `kill-port` | `kill-port 5173` |
| `build` | `vite build` |
| `preview` | `vite preview` |
| `lint` | `eslint .` |
| `lint:fix` | `eslint . --fix` |
| `typecheck` | `tsc --noEmit` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |
| `test:coverage` | `vitest run --coverage` |

---

## 3. Database schema (tables, columns, relationships)

Schema source in code: `src/lib/database.types.ts` (manual type file, not generated in this repo).

### 3.1 Tables and columns

Total typed tables in `Database.public.Tables`: **25**

1. `users`  
Columns: `id`, `email`, `full_name`, `role`, `is_active`, `created_at`, `updated_at`, `phone`, `department`, `employee_id`, `delegate_to`, `delegate_until`, `permission_overrides`

2. `customers`  
Columns: `id`, `name`, `contact_person`, `contact_email`, `contact_phone`, `address`, `created_at`, `updated_at`, `created_by`

3. `quotes`  
Columns: `id`, `quote_ref`, `version`, `status`, `created_by`, `assigned_to`, `customer_id`, `company_id`, `client_name`, `contact_name`, `contact_title`, `contact_email`, `contact_phone`, `client_address`, `factory_roe`, `customer_roe`, `discount_pct`, `annual_interest_rate`, `default_lease_term_months`, `battery_chemistry_lock`, `quote_type`, `slots`, `shipping_entries`, `approval_tier`, `approval_status`, `approval_notes`, `override_irr`, `submitted_by`, `submitted_at`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `rejection_reason`, `current_assignee_id`, `current_assignee_role`, `approval_chain`, `locked_by`, `locked_at`, `created_at`, `updated_at`, `updated_by`, `quote_date`, `validity_days`, `last_synced_at`, `sync_status`

4. `quote_versions`  
Columns: `id`, `quote_id`, `version`, `snapshot`, `changed_by`, `change_summary`, `created_at`

5. `approval_actions`  
Columns: `id`, `quote_id`, `action`, `performed_by`, `tier`, `notes`, `created_at`

6. `quote_collaborators`  
Columns: `quote_id`, `user_id`, `permission`, `granted_by`, `granted_at`

7. `quote_presence`  
Columns: `quote_id`, `user_id`, `last_seen_at`

8. `audit_log`  
Columns: `id`, `timestamp`, `user_id`, `action`, `entity_type`, `entity_id`, `changes`, `old_values`, `new_values`, `ip_address`, `user_agent`

9. `approval_tiers`  
Columns: `id`, `tier_level`, `tier_name`, `min_value`, `max_value`, `approver_role`, `description`

10. `commission_tiers`  
Columns: `id`, `min_margin`, `max_margin`, `commission_pct`

11. `residual_curves`  
Columns: `id`, `chemistry`, `term_36`, `term_48`, `term_60`, `term_72`, `term_84`

12. `forklift_models`  
Columns: `model_code`, `model_name`, `description`, `category`, `capacity`, `eur_cost`, `default_mast`, `available_masts`, `compatible_batteries`, `dimensions`, `specifications`, `image_url`

13. `battery_models`  
Columns: `id`, `name`, `chemistry`, `voltage`, `capacity`, `eur_cost`, `weight`, `dimensions`, `compatible_models`, `warranty_years`

14. `attachments`  
Columns: `id`, `name`, `category`, `eur_cost`, `description`, `compatible_models`, `image_url`

15. `companies`  
Columns: `id`, `name`, `trading_name`, `registration_number`, `vat_number`, `industry`, `website`, `address`, `city`, `province`, `postal_code`, `country`, `phone`, `email`, `pipeline_stage`, `assigned_to`, `estimated_value`, `credit_limit`, `payment_terms`, `tags`, `notes`, `created_at`, `updated_at`

16. `contacts`  
Columns: `id`, `company_id`, `first_name`, `last_name`, `title`, `email`, `phone`, `is_primary`, `created_at`, `updated_at`

17. `activities`  
Columns: `id`, `company_id`, `contact_id`, `quote_id`, `type`, `title`, `description`, `due_date`, `created_by`, `created_at`

18. `notifications`  
Columns: `id`, `user_id`, `type`, `title`, `message`, `entity_type`, `entity_id`, `is_read`, `created_at`

19. `templates`  
Columns: `id`, `type`, `name`, `content`, `is_default`, `created_at`, `updated_at`

20. `settings`  
Columns: `key`, `value`

21. `price_list_series`  
Columns: `series_code`, `series_name`, `models`, `options`

22. `telematics_packages`  
Columns: `id`, `name`, `description`, `tags`, `cost_zar`

23. `container_mappings`  
Columns: `id`, `series_code`, `category`, `model`, `qty_per_container`, `container_type`, `container_cost_eur`, `notes`

24. `configuration_matrices`  
Columns: `id`, `base_model_family`, `variants`, `created_at`, `updated_at`

25. `leads`  
Columns: `id`, `company_name`, `trading_name`, `industry`, `website`, `company_size`, `annual_revenue_estimate`, `address`, `city`, `province`, `country`, `decision_maker_name`, `decision_maker_title`, `decision_maker_email`, `decision_maker_phone`, `decision_maker_linkedin`, `source_name`, `source_url`, `ai_confidence`, `ai_reasoning`, `scraped_at`, `buy_probability`, `qualification_status`, `qualified_by`, `qualified_at`, `rejection_reason`, `converted_company_id`, `converted_contact_id`, `converted_at`, `converted_by`, `tags`, `notes`, `assigned_to`, `created_by`, `created_at`, `updated_at`

### 3.2 Typed database functions (RPC)

From `Database.public.Functions`:

- `generate_next_quote_ref() -> text`
- `save_quote_if_version(p_id uuid, p_expected_version integer, p_data json/jsonb) -> json/jsonb`
- `merge_companies(p_primary_id uuid, p_secondary_id uuid, p_merged_data json/jsonb) -> void`

Also in migrations:

- Sequence `quote_ref_seq` is created/managed by `supabase-migrations-round4.sql`.

### 3.3 Relationships used by the application (logical)

`database.types.ts` has empty `Relationships` arrays, but code uses these logical links:

- `quotes.created_by`, `quotes.assigned_to`, `quotes.updated_by`, `quotes.current_assignee_id`, `quotes.locked_by` -> `users.id`
- `quotes.company_id` -> `companies.id`
- `quotes.customer_id` -> `customers.id`
- `quote_versions.quote_id` -> `quotes.id`
- `approval_actions.quote_id` -> `quotes.id`
- `approval_actions.performed_by` -> `users.id`
- `quote_collaborators.quote_id` -> `quotes.id`
- `quote_collaborators.user_id` -> `users.id`
- `quote_presence.quote_id` -> `quotes.id`
- `quote_presence.user_id` -> `users.id`
- `companies.assigned_to` -> `users.id`
- `contacts.company_id` -> `companies.id`
- `activities.company_id` -> `companies.id`
- `activities.contact_id` -> `contacts.id`
- `activities.quote_id` -> `quotes.id`
- `notifications.user_id` -> `users.id`
- `leads.assigned_to`, `leads.created_by`, `leads.qualified_by`, `leads.converted_by` -> `users.id`
- `leads.converted_company_id` -> `companies.id`
- `leads.converted_contact_id` -> `contacts.id`

### 3.4 Schema/runtime mismatches (resolved)

All previously documented mismatches were fixed in Phase 1:
- `users.username` added to `database.types.ts`.
- `commission_tiers` adapter aligned to `commission_pct` column.
- `residual_curves` adapter aligned to `chemistry + term_36..term_84` schema.
- `audit_log` adapter now persists `old_values`/`new_values`; phantom column reads removed.

Remaining gap: `database.types.ts` is still hand-maintained (auto-generation blocked on Supabase CLI access — see TECH-DEBT TD-6.3).

---

## 4. API endpoints (method, path, what it does)

There is no custom Express/Fastify/Nest API in this repo.

API surface = Supabase RPC + table operations from browser code.

### 4.1 RPC endpoints

| Method | Path | Purpose |
|---|---|---|
| `RPC` | `generate_next_quote_ref` | Generate next quote reference from DB sequence. |
| `RPC` | `save_quote_if_version` | Atomic quote save with optimistic lock/version guard and auth checks. |
| `RPC` | `merge_companies` | Merge secondary company into primary and re-link related records. |

### 4.2 Core table operations used in app

| Method | Path | Purpose |
|---|---|---|
| `SELECT/INSERT/UPDATE/DELETE` | `quotes` | Main quote CRUD, listing, searching, counts, revisions by `quote_ref` prefix. |
| `UPDATE` | `quotes.locked_by/locked_at` | Quote lock/unlock from `useQuoteLock` (direct Supabase calls). |
| `SELECT` | `quote_versions` | Table is typed but not currently used by implemented quote save/list flows. |
| `SELECT` | `approval_actions` | Historical approval action records; client does not write or subscribe to this table. |
| `UPSERT/DELETE` | `quote_presence` | Presence heartbeat and cleanup. |
| `SELECT/INSERT/UPDATE/DELETE` | `companies`, `contacts`, `activities` | CRM operations. |
| `SELECT/INSERT/UPDATE/DELETE` | `leads` | Lead CRUD, filtering, stats, bulk status updates. |
| `SELECT/INSERT/UPDATE` | `notifications` | In-app notification inbox and read-state updates. |
| `SELECT/INSERT/DELETE` | `templates` | Template admin operations. |
| `SELECT/INSERT/UPDATE` | `users` | User admin CRUD (public profile table). |
| `AUTH` | `auth.signInWithPassword`, `auth.signOut`, `auth.getSession`, `auth.getUser`, `auth.signUp`, `auth.resetPasswordForEmail` | Login/session and user creation/reset flows. |
| `SELECT/INSERT` | `audit_log` | Audit writes and queries. |
| `SELECT/UPSERT` | `settings` | Default config values. |
| `SELECT/INSERT/DELETE` | `commission_tiers`, `residual_curves` | Admin pricing config persistence. |
| `SELECT` | `price_list_series`, `telematics_packages`, `container_mappings`, `attachments`, `configuration_matrices` | Builder/catalog/config data. |

### 4.3 Realtime channels used

| Channel | Source | Purpose |
|---|---|---|
| `quote-updates:{quoteId}` | `quotes` `UPDATE` events | Live single-quote refresh. |
| `quote-list-updates` | `quotes` all events | Live quote list refresh. |
| `quote-presence:{quoteId}` | Realtime presence | Show active viewers. |
| `approval-status-notifications` | `quotes` `UPDATE` (filtered to approval-relevant statuses) | Detects status transitions by comparing `payload.old.status` vs `payload.new.status`. Notifies quote owners of approvals/rejections/change-requests and notifies assignees of new quotes needing review. |

---

## 5. Frontend pages/routes

Router: `HashRouter` (`#/path` URLs).

### 5.1 Top-level routes in `src/App.tsx`

| Route | Auth | Component | Notes |
|---|---|---|---|
| `/login` | Public | `LoginPage` | Email/password login page. |
| `/` | Required | `HomeDashboard` | Role-aware dashboard widgets. |
| `/crm` | Required | `CrmDashboardPage` | CRM dashboard. |
| `/quotes` | Required | `QuotesListPage` | Quote list/search/filter. |
| `/quote` | Required | `Dashboard` | Quote workspace, loads by `?id=`. |
| `/builder` | Required | `QuoteBuilder` | 8-step builder workflow. |
| `/customers` | Required | `CustomerListPage` | Company list/kanban/table. |
| `/customers/:id` | Required | `CustomerDetailPage` | Company detail, contacts, activities, linked quotes. |
| `/crm/reports` | Required | `ReportsPage` | CRM reporting/analytics. |
| `/leads` | Required | `LeadExplorerPage` | Lead list and bulk operations. |
| `/leads/dashboard` | Required | `LeadDashboardPage` | Lead stats dashboard. |
| `/leads/hot` | Required | `HotLeadsPage` | High-score lead view. |
| `/leads/:id` | Required | `LeadDetailPage` | Lead detail/qualification/conversion. |
| `/notifications` | Required | `NotificationsPage` | Full notifications inbox. |
| `/admin/*` | Required + admin gate | `AdminLayout` | Nested admin routes below. |
| `*` | Public fallback | `NotFoundPage` | 404 page. |

### 5.2 Nested admin routes in `src/components/admin/AdminLayout.tsx`

| Route | Permission gate | Component |
|---|---|---|
| `/admin` | Redirect | index redirects to `/admin/pricing` |
| `/admin/pricing` | `admin:pricing` | `PricingManagement` |
| `/admin/configuration` | `admin:catalog` | `ConfigurationMatrixManagement` |
| `/admin/approvals` | `approval:review` | `ApprovalDashboard` |
| `/admin/users` | `admin:users` | `UserManagement` |
| `/admin/templates` | `admin:templates` | `TemplateManagement` |
| `/admin/audit` | `admin:audit` | `AuditLogViewer` |
| `/admin/*` | Redirect | wildcard redirects to `/admin/pricing` |

### 5.3 Builder steps implemented

`ClientInfoStep`, `QuoteSettingsStep`, `SelectUnitsStep`, `ConfigureOptionsStep`, `CostsStep`, `CommercialStep`, `ReviewSummaryStep`, `ExportStep`.

### 5.4 Quote dashboard panels implemented

`DealOverviewPanel`, `FleetBuilderPanel`, `PricingMarginsPanel`, `SpecsViewerPanel`, `LogisticsPanel`, `FinancialAnalysisPanel`, `ApprovalWorkflowPanel`, `QuoteGeneratorPanel`, `SettingsPanel`.

---

## 6. External integrations

### Runtime integrations

1. Supabase
- Auth, PostgREST table access, RPC, Realtime, Presence.
- Configured via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

2. Vercel
- Static hosting for Vite build (`vercel.json` rewrite to `index.html`).

3. Linde product URL
- PDF QR codes link to `https://www.linde-mh.com/en/products/electric-forklift-trucks/{model}`.

### Non-runtime/operational integrations

- Local Excel ingestion and parity scripts (`xlsx`) for seeding/migration workflows.
- No third-party business API (other than Supabase) is called at runtime from the app.

---

## 7. Environment variables

### 7.1 Frontend runtime variables

| Variable | Required | Default in code | Used for |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Yes | none | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Yes | none | Supabase anon key for browser client. |
| `VITE_ENABLE_REALTIME` | No | `false` unless explicitly `"true"` | Enables realtime subscriptions. |
| `VITE_ENABLE_PRESENCE` | No | `false` unless explicitly `"true"` | Enables presence tracking. |
| `VITE_PRESENCE_HEARTBEAT_MS` | No | `30000` | Presence heartbeat interval. |
| `import.meta.env.DEV` | Built-in | Vite-managed | Dev-only UI/logging behavior. |

Note: `.env.example` sets `VITE_ENABLE_REALTIME=true` and `VITE_ENABLE_PRESENCE=true`, but code logic itself treats missing values as `false`.

### 7.2 Script/ops variables (seeding/parity scripts)

| Variable | Used by |
|---|---|
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | `scripts/seed-supabase-data.mjs`, `scripts/verify-parity.mjs`, lead batch scripts fallback |
| `SUPABASE_URL` | lead seed scripts |
| `SUPABASE_SERVICE_KEY` | lead seed scripts |
| `VITE_SUPABASE_URL` | script fallback where `SUPABASE_URL` not set |
| `VITE_SUPABASE_ANON_KEY` | fallback in `scripts/seed-leads.mjs` (not recommended for privileged seed ops) |

---

## 8. Current authentication/security setup

### 8.1 Authentication

- Provider: Supabase Auth.
- Login method: `signInWithPassword` (email/password).
- Supabase client config:
  - `persistSession: true`
  - `autoRefreshToken: true`
  - `detectSessionInUrl: true`
  - `flowType: 'pkce'`
- Session re-check on app load via `checkAuth()`.

### 8.2 Authorization and RBAC

Roles:

- `sales_rep`
- `key_account`
- `sales_manager`
- `local_leader`
- `ceo`
- `system_admin`

Controls in code:

- Route-level: `RequireAuth`, `RequireAdmin` (broad role gate).
- Admin-page-level: `RequirePermission` with `hasPermission(...)`.
- Per-user override map in `users.permission_overrides` with keys:
  - `can_view_all_quotes`
  - `can_skip_approval_levels`
  - `can_edit_any_quote`
  - `can_approve_quotes`
  - `can_manage_users`
  - `can_manage_pricing`
  - `can_view_audit_log`
  - `can_export_data`
  - `can_manage_templates`
  - `can_manage_backups`

### 8.3 Quote write/concurrency controls

- Atomic write path uses RPC `save_quote_if_version` with:
  - auth check (`auth.uid()`)
  - row lock (`FOR UPDATE`)
  - version check
  - ownership/assignee/lock checks
  - system-admin bypass
- UI lock state also managed in client + direct `quotes.locked_by/locked_at` updates.
- Realtime conflict handling warns/reloads on newer remote versions.

### 8.4 Client-side login hardening

- In-memory failed login tracker:
  - max 5 failed attempts
  - 10-minute lockout
  - progressive delay (max 4s)
- Security events logged to `audit_log` when possible.

### 8.5 Data sanitization

- Search/filter terms are sanitized via `sanitizePostgrestValue` before `.or(...)` filter construction.

### 8.6 Realtime and presence security-relevant behavior

- Realtime subscriptions are feature-flagged (`VITE_ENABLE_REALTIME`).
- Presence writes heartbeat rows to `quote_presence` and removes them on cleanup.

### 8.7 RLS and server-side policy location

- RLS policies are defined in `supabase/migrations/001_rls_policies.sql` and applied to the live Supabase instance.
- Quotes enforce ownership on insert/update/delete; notifications scoped to owning user; CRM tables restrict delete to admin roles; config tables restrict write to admin roles.
- Users table: admins can update/delete; users can update their own row.

### 8.8 Current implementation caveats

- Approval notifications subscribe to `quotes` table UPDATE events (not `approval_actions`), filtered to status transitions only. Requires full replica identity on the `quotes` table for `payload.old` to be populated; without it, notifications are skipped to avoid false positives.
- Admin user creation is handled server-side via Supabase Edge Function (`supabase/functions/admin-create-user/`). The frontend calls this function rather than using `auth.signUp` directly.
- Password reset sends a reset email via `resetPasswordForEmail`. The admin UI does not collect a new password for existing users.

---

End of spec.
