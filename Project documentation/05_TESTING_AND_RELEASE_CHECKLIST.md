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

Data and persistence:
1. Quote save/load roundtrip works
2. Config load after startup works
3. In hybrid mode, queue operations appear and process when online/authenticated

Supabase checks (cloud/hybrid):
1. `.env.local` contains valid Supabase URL/key
2. `/test-supabase` reports successful connectivity
3. CRUD path works for at least one protected table under current role

## Release Gate Checklist

Block release if any of the following are true:
1. Typecheck fails
2. Build fails
3. Automated tests fail
4. Critical route smoke test fails
5. Mode-specific data persistence fails in target deployment mode

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

## Validation Basis

Validated from npm scripts, test config, existing test files, and active route surface.

## Out-of-Date Risk

Update this file when changing:
- scripts in `package.json`
- test file locations/patterns
- route map in `src/App.tsx`
- release criteria used by team

## Related Docs

- `01_PROJECT_CONTEXT.md`
- `02_ARCHITECTURE_AND_DATA_MODEL.md`
- `03_SUPABASE_AND_SYNC.md`
- `04_OPERATIONS_RUNBOOK.md`
- `06_SESSION_LOG.md`
- `07_STATUS_BOARD.md`
