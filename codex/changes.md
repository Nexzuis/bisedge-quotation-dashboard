# Changes Implemented (Codex)

Date: 2026-02-19  
Scope: Execute the agreed remediation plan with focus on go-live blockers and immediate hardening.

## Implemented Fixes

### P0-1 Deep-link quote loading
- Implemented query-param aware loading in `src/Dashboard.tsx`.
- `/quote?id=<id>` now attempts `loadFromDB(id)`.
- `/quote` with no `id` now loads most recent quote.
- Missing/invalid `id` now shows a visible error and resets in-memory quote to avoid editing stale data.
- Prevented global startup loader from overriding `/quote` route loading logic in `src/App.tsx`.

### P0-2 Autosave singleton + race reduction
- Enforced single autosave instance at app level in `src/App.tsx`.
- Added shared autosave context in `src/hooks/AutoSaveContext.tsx`.
- Switched `TopBar` and builder export step to consume shared autosave context:
  - `src/components/layout/TopBar.tsx`
  - `src/components/builder/steps/ExportStep.tsx`
- Updated unsaved-changes hook to consume shared autosave state instead of creating a second autosave instance:
  - `src/hooks/useUnsavedChanges.ts`
- Replaced full `loadQuote(...)` mutations during autosave with narrow store actions:
  - Added `setQuoteRef` and `setVersion` in `src/store/useQuoteStore.ts`
  - Updated `src/hooks/useAutoSave.ts` to use them

### P0-3 Financial correctness (landed-cost basis + PMT guard)
- Added PMT safety guard for invalid terms (`nPeriods <= 0`) in `src/engine/calculationEngine.ts`.
- Changed slot margin basis to landed cost:
  - `src/store/useQuoteStore.ts`
  - `src/engine/calculationEngine.ts` (`calcSlotPricingFull`)
- Changed IRR initial outlay basis to landed cost in quote totals:
  - `src/store/useQuoteStore.ts`
- Updated PMT edge-case test expectation:
  - `src/engine/__tests__/calculationEngine.test.ts`

### P0-4 Permission override deny fix
- Implemented explicit deny semantics in `hasPermission` so `override === false` revokes access:
  - `src/auth/permissions.ts`
- Added tests for role/default, grant, deny, and unrelated override behavior:
  - `src/auth/__tests__/permissions.test.ts`

### P0-5 PDF field correctness and quote type consistency
- PDF generator now defaults `quoteType` from quote state, not hardcoded rental:
  - `src/pdf/generatePDF.tsx`
- Removed hardcoded signatory defaults in PDF generation.
- Replaced deprecated monthly fields in PDF line items with current computed fields:
  - maintenance from pricing engine
  - telematics/operator from active commercial fields
- Quote Generator panel now uses persisted quote `quoteType` from store:
  - `src/components/panels/QuoteGeneratorPanel.tsx`

### P0-6 Logistics shipping persistence
- Added typed shipping model:
  - `src/types/quote.ts` (`ShippingEntry`, `shippingEntries` on `QuoteState`)
- Added quote store shipping actions:
  - `addShippingEntry`, `updateShippingEntry`, `removeShippingEntry`
  - `src/store/useQuoteStore.ts`
- Moved Logistics panel from local state to quote store state:
  - `src/components/panels/LogisticsPanel.tsx`
- Added shipping serialization/deserialization:
  - `src/db/interfaces.ts`
  - `src/db/serialization.ts`
- Added/updated serialization tests:
  - `src/db/__tests__/serialization.test.ts`
- Added shipping fallback for Supabase-loaded quotes:
  - `src/db/SupabaseAdapter.ts`
- Added Supabase write mapping for shipping:
  - `src/db/SupabaseAdapter.ts` now includes `shipping_entries: JSON.stringify(quote.shippingEntries ?? [])` in `saveQuote(...)`
  - prevents cloud/hybrid shipping data loss on device change or local cache reset
  - read path now handles both text and JSONB array shapes for `shipping_entries`

### P0-7 CRM ownership enforcement (low-role restriction)
- Added role-aware access filtering in company data hook:
  - `src/hooks/useCompanies.ts`
  - `sales_rep` and `key_account` now restricted to assigned companies
- Enforced default “My Accounts” behavior and disabled broad toggle for restricted roles:
  - `src/components/crm/CustomerListPage.tsx`

### P0-8 Backup/restore completeness hardening
- Expanded backup manifest coverage across active operational stores:
  - `priceListSeries`, `forkliftModels`, `batteryModels`, `containerMappings`, `telematicsPackages`, `attachments`, `notifications`
- Added backup metadata:
  - `schemaVersion`, `appVersion`, backup `version`
- Added import compatibility guard for newer schema backups.
- Expanded replace-mode clear and import restore paths for newly covered stores.
- Expanded import preview UI counts for covered stores.
- File:
  - `src/components/admin/backup/BackupRestore.tsx`

### P1-2 Login rate limiting / lockout (implemented early)
- Added progressive delay, failed-attempt tracking, and temporary lockout in auth store.
- Added audit events for `login_failed` and `lockout`.
- Extended audit action type union.
- Files:
  - `src/store/useAuthStore.ts`
  - `src/db/interfaces.ts`

## Validation Results

Executed successfully:
1. `npm run typecheck`
2. `npm run test` (96 tests passed)
3. `npm run build`

## Files Added
- `src/hooks/AutoSaveContext.tsx`
- `src/auth/__tests__/permissions.test.ts`
- `codex/changes.md`

## Notes
- Shipping data is now persisted and survives save/load cycles. Financial totals were not forcibly changed to include shipping by default to avoid introducing unapproved pricing side effects.
- Backup restore continues to protect against user-password data loss patterns; password hashes are still excluded from backup payloads.
