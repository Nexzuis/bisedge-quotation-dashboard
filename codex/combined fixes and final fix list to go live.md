# Combined Fixes and Final Fix List To Go Live

## File Purpose
Final merged go-live plan combining:
1. `codex` assessment
2. `claude-audit` assessment
3. direct code verification

This is the single source for urgent production fixes.

---

## Source Files Reviewed
### Codex
- `codex/researchcodex.md`
- `codex/readiness-audit-report.md`
- `codex/readiness-remediation-plan.md`

### Claude
- `claude-audit/index.md`
- `claude-audit/codex-confirmation-report.md`
- `claude-audit/new-findings-report.md`
- `claude-audit/architecture-deep-dive.md`
- `claude-audit/remediation-plan.md`

---

## Current Reality Snapshot
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run test`: PASS (90 tests)
- `npm run lint`: FAIL (72 errors, 553 warnings)

Conclusion: app runs, but is not safe enough for immediate 30-user go-live.

---

## Priority Definitions
- P0 = must fix before go-live
- P1 = fix in first 72 hours after P0
- P2 = hardening within 1-2 weeks

---

## P0 - Urgent Fixes Before Go-Live

### P0-1: Quote deep-link loading is broken
Problem:
- Multiple views navigate to `/quote?id=<quoteId>`, but route loading does not consistently load that quote.

Impact:
- Users can open/edit/approve the wrong quote.

Primary files:
- `src/App.tsx`
- `src/Dashboard.tsx`
- link sources in list/widgets/notifications

Fix:
1. Parse `id` query param on `/quote` route view.
2. If `id` exists, call `loadFromDB(id)`.
3. Only call `loadMostRecent()` when no `id` is provided.
4. Show clear error if `id` not found.

Acceptance:
- Any `/quote?id=<id>` loads exactly that quote.

---

### P0-2: Autosave has multi-instance race behavior
Problem:
- `useAutoSave()` is mounted in multiple places simultaneously.

Impact:
- Duplicate saves, version conflicts, unstable save status.

Primary files:
- `src/App.tsx`
- `src/hooks/useUnsavedChanges.ts`
- `src/components/layout/TopBar.tsx`
- `src/components/builder/steps/ExportStep.tsx`
- `src/hooks/useAutoSave.ts`

Fix:
1. Keep exactly one autosave instance globally.
2. Expose save state/status via context/store, no per-view autosave remount.
3. Replace full `loadQuote(...)` version updates with narrow store actions (`setVersion`, `setQuoteRef`).

Acceptance:
- One save operation per debounce cycle.
- No same-tab internal conflict warnings.

---

### P0-3: Financial correctness is using the wrong cost basis
Problem:
- Margin and IRR currently use factory-cost basis where landed-cost basis is required for go-live correctness.
- Confirmed examples in code:
- margin uses `factoryCostZAR`: `src/store/useQuoteStore.ts:611`
- IRR outlay uses `pricing.factoryCost`: `src/store/useQuoteStore.ts:697`

Impact:
- Reported margins can be materially overstated.
- IRR and commission decisions can be wrong.

Primary files:
- `src/store/useQuoteStore.ts`
- `src/engine/calculationEngine.ts`
- `src/engine/commissionEngine.ts`

Fix (explicit):
1. Change margin calculation to landed basis (use `landedCostZAR` where business confirms this is the true cost basis).
2. Change IRR initial outlay accumulation to landed basis.
3. Recalculate commission tiers using corrected margin output.
4. Add PMT guard for `nPeriods <= 0`.

Acceptance (required before go-live):
- Known benchmark deals match approved expected margin/IRR/commission values.
- PMT returns safe value for zero term (no NaN/Infinity).

---

### P0-4: Permission override deny path is broken (revoke does not work)
Problem:
- In `hasPermission`, `override === false` path does nothing.
- Code block at `src/auth/permissions.ts:187-191` does not return deny.

Impact:
- Admin believes permissions are revoked, but role grants still allow access.
- RBAC behavior is misleading and unsafe for multi-user rollout.

Primary files:
- `src/auth/permissions.ts`
- admin screens that configure overrides

Fix:
1. Implement explicit deny semantics for `override === false`.
2. Add tests for grant/deny/undefined override combinations.
3. Validate UI shows effective permission correctly.

Acceptance:
- Setting an override to `false` actually blocks that permission.

---

### P0-5: Customer-facing PDF uses deprecated/incorrect cost fields
Problem:
- PDF reads deprecated fields likely initialized to zero:
- `maintenanceCostPerMonth`, `fleetMgmtCostPerMonth`, `telematicsCostPerMonth`
- at `src/pdf/generatePDF.tsx:83-86`

Impact:
- PDF line items can disagree with totals.
- Customer-facing document can show arithmetic inconsistency.

Primary files:
- `src/pdf/generatePDF.tsx`
- `src/components/builder/steps/ExportStep.tsx`
- `src/components/layout/TopBar.tsx`

Fix:
1. Use current computed pricing fields from quote/pricing engine, not deprecated legacy fields.
2. Ensure quote type is propagated correctly to PDF output.
3. Remove hardcoded signatory defaults where inappropriate.

Acceptance:
- PDF line items reconcile to monthly totals on benchmark quotes.
- Exported quote type matches user-selected quote type.

---

### P0-6: Logistics/shipping entries are not persisted
Problem:
- Logistics panel shipping entries are local component state only.

Impact:
- Shipping data disappears on reload/navigation.

Primary files:
- `src/components/panels/LogisticsPanel.tsx`
- `src/types/quote.ts`
- `src/store/useQuoteStore.ts`
- `src/db/serialization.ts`
- `src/db/interfaces.ts`

Fix:
1. Add typed shipping entries to `QuoteState`.
2. Add store actions for add/update/remove shipping entries.
3. Serialize/deserialize shipping entries in quote persistence.
4. Keep pricing impact behind approved business rule if needed.

Acceptance:
- Shipping entries survive save/load/duplicate/revision.

---

### P0-7: CRM role access is too open for low roles
Problem:
- Ownership enforcement is incomplete in list/detail paths.

Impact:
- `sales_rep`/`key_account` can access non-assigned CRM records.

Primary files:
- `src/components/crm/CustomerListPage.tsx`
- `src/components/crm/CustomerDetailPage.tsx`
- `src/hooks/useCompanies.ts`
- `src/db/SupabaseAdapter.ts`

Fix:
1. Enforce ownership filter in data layer for low roles.
2. Default low roles to "my accounts".
3. Block direct URL access to unassigned detail pages.
4. Keep manager/admin full visibility.

Acceptance:
- Low roles can list/open only assigned companies.

---

### P0-8: Backup/restore is incomplete across active stores
Problem:
- Backup/import manifest does not cover all active stores consistently.

Impact:
- Partial restore can appear successful.

Primary files:
- `src/components/admin/backup/BackupRestore.tsx`
- `src/db/schema.ts`

Fix:
1. Use explicit full required-store manifest.
2. Add metadata (`schemaVersion`, app version).
3. Validate compatibility on import.
4. Ensure replace-mode clear matches imported manifest.

Acceptance:
- Full backup/restore roundtrip reproduces required store counts and sampled records.

---

## P1 - Fix Within 72 Hours (Stability + Security)

### P1-1: Admin permission granularity per route
- Add per-route permission guards in admin routes and sensitive pages.

### P1-2: Login rate limiting / lockout
Problem:
- No failed-attempt throttling or lockout currently in `src/store/useAuthStore.ts`.

Fix:
1. Track failed attempts per account/session.
2. Add progressive delays and temporary lockout after threshold.
3. Add audit entries for lockout events.

Acceptance:
- Repeated invalid logins trigger controlled delay/lock behavior.

### P1-3: Legacy field coupling cleanup (model/battery)
- Remove critical logic dependency on deprecated fields.

### P1-4: Auth/bootstrap/default consistency
- Align seed credentials/defaults and documented operational defaults.

### P1-5: Local-mode resilience to missing Supabase env
- Lazy-init Supabase in cloud/hybrid paths only.

### P1-6: Lint errors to zero
- Fix all lint errors; warnings in follow-up batches.

---

## P2 - 1 to 2 Week Hardening

### P2-1: Sync durability and observability
- Move sync queue persistence from localStorage to IndexedDB.
- Add failure visibility and queue controls.

### P2-2: Performance and render optimization
- Reduce full-store subscriptions.
- Memoize expensive totals where appropriate.
- Improve chunking strategy for large bundles.

### P2-3: Test expansion for broader workflows
Add automated tests for:
1. deep-link loading
2. autosave singleton behavior
3. CRM ownership enforcement
4. backup/restore manifest integrity
5. admin permission guard coverage

### P2-4: Documentation cleanup
- Replace stale status docs with one maintained technical source.

---

## Exact Implementation Sequence (Updated)
1. P0-1 deep-link load
2. P0-2 autosave singleton
3. P0-3 financial correctness (explicit landed-cost basis fixes + PMT guard)
4. P0-4 permission override deny fix
5. P0-5 PDF cost-field correctness
6. P0-6 logistics persistence
7. P0-7 CRM ownership enforcement
8. P0-8 backup completeness
9. P1 cluster
10. P2 hardening

Reason: prioritize active wrong business outputs and permission correctness before feature-gap persistence work.

---

## Go-Live Gate (Must Be True)
1. All P0 items completed and validated.
2. Lint errors are zero.
3. Deep-link, save/reload, and backup roundtrip tests pass.
4. CRM role access behaves correctly for low roles.
5. Financial benchmark quotes pass margin/IRR/commission verification.
6. PDF benchmark quotes reconcile line items to totals.

If any gate fails: do not go live to 30 users.

---

## File Path For This Final Plan
`C:\Users\Nexzuis\Desktop\Louisen dashboard\bisedge-quotation-dashboard\codex\combined fixes and final fix list to go live.md`
