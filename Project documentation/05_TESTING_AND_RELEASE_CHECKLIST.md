# 05 - Testing and Release Checklist

Last Updated: 2026-02-19
Owner: Documentation Maintainers
Source of Truth Inputs: `package.json`, `vitest.config.ts`, tests under `src/**/*.test.ts`, `src/App.tsx`, build/lint scripts

## Automated Checks

Run from repo root:

```bash
npm run typecheck
npm run test
npm run build
npm run lint
```

Expected suite scope (current):
- `src/auth/__tests__/permissions.test.ts`
- `src/db/__tests__/serialization.test.ts`
- `src/engine/__tests__/calculationEngine.test.ts`
- `src/engine/__tests__/formatters.test.ts`

## Functional Smoke Checklist

Authentication and shell:
1. Login page loads
2. Authenticated redirect to `/`
3. Unauthorized users cannot access protected routes

Core routes:
1. `/` home dashboard renders
2. `/quote` quote dashboard renders and loads current quote
3. `/builder` wizard loads and navigates across steps
4. `/quotes` list page loads and can open quote context
5. `/customers` and `/customers/:id` load CRM data
6. `/crm/reports` renders reporting
7. `/admin/*` renders for admin-level users
8. `/notifications` loads notification inbox

Data and persistence (Supabase-only):
1. Quote save/load roundtrip works via Supabase
2. Config load after startup works
3. All CRUD operations execute against Supabase tables

Supabase checks:
1. `.env.local` contains valid Supabase URL/key
2. In local dev, Supabase test page reports successful connectivity
3. CRUD path works for at least one protected table under current role
4. Company merge RPC function executes correctly

## Release Gate Checklist

Block release if any of the following are true:
1. Typecheck fails
2. Build fails
3. Automated tests fail
4. Critical route smoke test fails
5. Supabase data persistence fails (CRUD operations against cloud tables)
6. Quote locking does not include stale timeout (1 hour)
7. `merge_companies` RPC does not handle all 20 frontend fields
8. Priority hook files contain `console.log`/`console.warn`/`console.error` calls (must use `logger`)
9. Supabase `settings` table is empty (must have 9 default value rows)
10. Supabase `price_list_series` table is empty (must have 81 series rows)
11. Quotes list shows "No customer" or "NaN" dates (snake_case mapping must be active in SupabaseAdapter)

## Documentation Gate

Before tagging/releasing:
1. Update `06_SESSION_LOG.md` with release summary
2. Update `07_STATUS_BOARD.md` to match current shipped behavior
3. Update any impacted canonical topic docs

## Frontend Regression Checks (Post-Remediation 2026-02-19)

| Test | Result | Notes |
|---|---|---|
| `npx tsc --noEmit` | Pass (0 errors) | Full typecheck after all fixes |
| `npx vitest run` | Pass (96/96) | All existing tests still green |
| `npx vite build` | Pass | Build succeeds; pre-existing Vite dynamic-vs-static import warnings remain (not introduced by these changes) |
| LinkedQuotes row click loads correct quote | Manual | Click should navigate to `/quote?id=<quoteId>` |
| Builder Export button lands on `/#/quote` | Manual | Button text should say "Back to Quote" |
| Company picker "Create New" navigates to customers | Manual | Should open `/customers` with new lead form |
| Direct URL `/admin/backup` blocked for non-permitted roles | Manual | Sales rep should see "Access Denied" |
| Approval chain parse errors logged in console | Manual | Check browser console for `Failed to parse...` messages |
| No accidental form submits from shared Button | Manual | Buttons default to `type="button"` |
| `/admin/approvals` shows only one active nav highlight | Manual | Admin tab and Approvals tab should not both highlight |
| Negative numbers clamped in QuoteSettingsStep | Manual | Enter -5 in ROE field, should clamp to 0 |
| LoadQuoteModal reopens with clean state | Manual | Close and reopen, search/filter should be reset |
| Most modals close on Escape and backdrop click | Manual | Test each modal; New Lead modal on CustomerListPage now included |
| Quote save persists to Supabase with `created_by` | Manual | Save quote after login, confirm row appears in Supabase `quotes` table |
| Company merge RPC executes correctly | Manual | Merge two companies, confirm contacts/quotes reassigned and source deleted |
| Login password field has `autocomplete=\"current-password\"` | Manual | Inspect login form DOM attributes |

## Validation Basis

Validated from npm scripts, test config, existing test files, and active route surface.

## Out-of-Date Risk

Update this file when changing:
- scripts in `package.json`
- test file locations/patterns
- route map in `src/App.tsx`
- release criteria used by team

## QA Round 1 Regression Checks (2026-02-20)

- [ ] Admin → Users: shows full names, Active/Inactive status correct, valid dates
- [ ] Quote with 0% markup: blocked at Review step with red error message
- [ ] Quote with <5% markup: shows warning but allows proceed
- [ ] Specs panel: shows model data for configured units (or helpful error with model code)
- [ ] Admin → Audit Log: shows user names, not raw UUIDs
- [ ] Cost fields: clearing/local charges clamp at R2,000,000; battery/attachment at R5,000,000
- [ ] Commercial fields: markup clamps at 200%, residual/finance at 100%, rates at R10K/hr, telematics at R100K/mo
- [ ] Typing Infinity or non-numeric values in cost/commercial fields: safely handled (NaN/Infinity blocked)
- [ ] Dashboard: reduced network calls (check network tab — no 1000/10000 page sizes)
- [ ] Notifications: poll interval is 60s, pauses when tab is hidden, resumes on tab return
- [ ] CrmTopBar approval badge: updates via shared useApprovalCount hook, pauses when tab hidden
- [ ] Presence heartbeat: pauses when tab is hidden, resumes on tab return
- [ ] CRM → Kanban: empty columns render with stage headers
- [ ] Quote Export (approved): "Send to Customer" button visible and functional
- [ ] Quote Export (approved/sent): "Mark Expired" button visible and functional
- [ ] Browser tab: shows "BIS Edge — Quotation Dashboard" title
- [ ] getTableCounts: no 503 errors (HEAD fallback active)

## Related Docs

- `01_PROJECT_CONTEXT.md`
- `02_ARCHITECTURE_AND_DATA_MODEL.md`
- `03_SUPABASE_AND_SYNC.md`
- `04_OPERATIONS_RUNBOOK.md`
- `06_SESSION_LOG.md`
- `07_STATUS_BOARD.md`
