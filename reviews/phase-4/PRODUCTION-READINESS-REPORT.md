# BIS Edge Quotation Dashboard — Production Readiness Report

**Date:** 22 February 2026  
**Assessed by:** Independent code audit  
**Target:** 200 concurrent users, live quoting, saving, approvals, lead generation  
**Verdict:** ⛔ NOT READY for 1.0 — 8 blockers, 12 critical items, 15 improvements needed

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [🔴 BLOCKERS — Must Fix Before Go-Live](#2--blockers--must-fix-before-go-live)
3. [🟠 CRITICAL — High Risk in Production](#3--critical--high-risk-in-production)
4. [🟡 IMPORTANT — Should Fix Before 1.0](#4--important--should-fix-before-10)
5. [🟢 WORKING WELL](#5--working-well)
6. [Build & Test Health](#6-build--test-health)
7. [Deployment Checklist](#7-deployment-checklist)
8. [Recommended Fix Order](#8-recommended-fix-order)

---

## 1. Executive Summary

The application has a **solid feature set** — quote building, financial calculations, CRM, lead management, approval workflows, PDF generation, and admin panels are all implemented. Phase 1 (bug fixes) and Phase 3 (mobile responsiveness) are complete. TypeScript compiles cleanly. The build succeeds.

However, **the codebase is not production-ready for 200 users**. The critical gaps are:

| Category | Status |
|----------|--------|
| Feature completeness | ✅ Good — all core features built |
| TypeScript compilation | ✅ Clean — zero errors |
| Build | ✅ Succeeds |
| Test suite | ❌ **All 10 test suites broken** — 0/178 tests running |
| Data integrity | ❌ **Non-atomic delete+insert patterns risk data loss** |
| Security | ❌ **RLS policies not deployed, client-side-only rate limiting** |
| Concurrent access | ⚠️ Race conditions in locking and presence |
| Edge Function deployment | ❌ **admin-create-user not deployed to Supabase** |
| RPC version control | ❌ **Critical RPCs not in source control** |
| Error handling | ⚠️ Silent failures in several DB operations |

---

## 2. 🔴 BLOCKERS — Must Fix Before Go-Live

### B1. All Test Suites Are Broken (0/178 tests pass)

**Impact:** No safety net for any code changes. Cannot verify calculations, serialization, or business logic.

All 10 test files fail with `"No test suite found in file"`. Vitest detects the files but cannot find any `describe`/`it`/`test` constructs at runtime. This likely means:
- Import resolution is broken in the test environment
- OR the vitest config has changed in a way that prevents test discovery

**Files affected:**
- `src/auth/__tests__/permissions.test.ts`
- `src/hooks/__tests__/matchSeriesCode.test.ts`
- `src/engine/__tests__/formatters.test.ts`
- `src/engine/__tests__/calculationEngine.test.ts`
- `src/engine/__tests__/shippingSuggestion.test.ts`
- `src/engine/__tests__/validators.test.ts`
- `src/db/__tests__/serialization.test.ts`
- `src/db/__tests__/auditLogMapper.test.ts`
- `src/store/__tests__/safeNum.test.ts`
- `src/store/__tests__/quoteStore.test.ts`

**Fix:** Investigate vitest config, check imports, ensure test globals are configured.

---

### B2. RLS Policies Not Deployed to Supabase

**Impact:** ANY authenticated user can read/modify ANY data in ALL tables. A sales rep can see other reps' quotes, modify approvals, delete leads, etc.

The file `supabase/migrations/001_rls_policies.sql` exists in source but has **never been applied to the live database**. Without Row-Level Security:
- Quote data is accessible to all authenticated users
- Approval chains can be tampered with
- Lead data has no ownership enforcement
- Audit logs can be modified or deleted

**Fix:** Apply the RLS migration to Supabase. Test thoroughly — poorly written RLS can lock out all access.

---

### B3. Edge Function `admin-create-user` Not Deployed

**Impact:** Admin user creation is broken in production. The code in `supabase/functions/admin-create-user/` exists but was never deployed via `supabase functions deploy`.

Without this, the `UserManagement.tsx` component cannot create new users server-side, which means either:
- User creation silently fails, OR
- Falls back to client-side creation (security risk — anon key can't create users)

**Fix:** Run `supabase functions deploy admin-create-user` with proper service role key.

---

### B4. Critical RPCs Not Version-Controlled

**Impact:** The two most critical database operations — `save_quote_if_version` and `generate_next_quote_ref` — exist only on the Supabase dashboard. Their SQL is not in any migration file.

If someone modifies them on the dashboard, or if you need to recreate the database, these functions are lost. They also cannot be code-reviewed.

`save_quote_if_version` handles:
- Row-level locking (`FOR UPDATE`)
- Version conflict detection
- Ownership/auth checks
- Version increment on save

**Fix:** Export the RPC definitions from Supabase and commit them as migration files.

---

### B5. Non-Atomic Delete+Insert Causes Data Loss Risk

**Impact:** `saveCommissionTiers()` and `saveResidualCurves()` in `SupabaseAdapter.ts` both:
1. DELETE all existing rows
2. INSERT new rows

These are **two separate HTTP requests** with no transaction wrapper. If step 2 fails (network error, RLS denial, constraint violation), **all data is permanently lost**. With 200 concurrent users, a reader between steps 1 and 2 gets zero rows.

**Fix:** Wrap in a single Supabase RPC transaction, or use upsert patterns instead of delete+insert.

---

### B6. Client-Side-Only Rate Limiting

**Impact:** Login brute-force protection is purely in-memory JavaScript. Refreshing the page resets all lockout state. An attacker with a script can make unlimited login attempts.

The `LOGIN_ATTEMPTS` Map and `LOCKOUT_UNTIL` Map in `useAuthStore.ts` are wiped on every page load.

**Fix:** Implement server-side rate limiting via Supabase Edge Function or auth hook. At minimum, use Supabase's built-in auth rate limiting configuration.

---

### B7. No Email/SMTP Configuration

**Impact:** Password reset emails, approval notifications, and any email-based workflows won't work unless Supabase Auth is configured with a custom SMTP provider.

The codebase has email template types defined but no sending mechanism. Supabase's default email service has strict rate limits (2-4 emails/hour) — completely insufficient for 200 users.

**Fix:** Configure a production SMTP provider (e.g., Resend, SendGrid, Postmark) in Supabase Auth settings.

---

### B8. Diagnostic/Test Files Committed to Root

**Impact:** Files from debugging sessions are littering the project root: `_diag.test.ts`, `_vitest_diag.config.ts`, `src/_min2.test.ts`, `src/_minimal.test.ts`. These should not ship to production.

**Fix:** Delete these files and add them to `.gitignore`.

---

## 3. 🟠 CRITICAL — High Risk in Production

### C1. Quote Locking Race Condition

The `acquireLock()` in `useQuoteLock.ts` uses an atomic conditional update:
```
.update({ locked_by, locked_at }).or('locked_by.is.null,locked_by.eq.${userId}')
```
But the "stale lock" check (1 hour) is done **client-side before the atomic update**. Two users checking staleness simultaneously can both force-acquire the lock. The cleanup relies on `setInterval` which stops when the tab is closed — orphaned locks can persist until the 1-hour timeout.

**Risk:** Two users editing the same quote simultaneously, leading to save conflicts or data overwrites.

---

### C2. Auto-Save Can Silently Fail

`useAutoSave.ts` calls `saveQuote()` on a 30-second interval. If the save fails (network error, version conflict), the error is caught and logged, but:
- The user gets a toast notification, which they may miss
- The auto-save continues retrying on the same interval, potentially losing changes if the user navigates away
- There's no "unsaved changes" warning that persists after a failed auto-save

**Risk:** Users lose work without realizing it.

---

### C3. Residual Value Lookup is Async Per-Quote-Line

`calcResidualValueFromDB()` does a database fetch for EVERY quote line item on every recalculation. With 200 users and multi-unit quotes, this creates:
- N×M database calls per quote recalculation (N slots × recalc frequency)
- Race conditions if residual curves are updated while quotes are open
- Slow calculations on poor network connections

**Risk:** Performance degradation and inconsistent pricing.

---

### C4. Notification Polling Creates DB Load

`useNotifications.ts` and `useApprovalCount.ts` both poll the database on intervals (30s and 60s respectively). With 200 users:
- 200 × 2 = 400 queries/minute minimum
- Plus approval badge polling on every page
- No connection pooling or caching strategy

**Risk:** Database connection exhaustion under load.

---

### C5. Session Lifecycle Has No Server-Side Expiry Enforcement

The auth store persists to localStorage (`auth-storage`). While `checkAuth()` validates against the DB on rehydration, there's no periodic session refresh or forced logout on:
- Password change by admin
- Account deactivation
- Role change

A deactivated user's session remains valid until they refresh the page.

**Risk:** Fired employees or role-changed users retain access.

---

### C6. ~7 Files Bypass the Database Adapter

These files call `supabase` directly instead of going through the adapter pattern:
- `usePriceList.ts` — all price list / telematics / container queries
- `useApprovalCount.ts` — polls quotes table
- `usePresence.ts` — quote_presence CRUD + realtime
- `useQuoteLock.ts` — quotes.locked_by/locked_at updates
- `useCompanyMerge.ts` — direct multi-table queries + RPC
- `UserManagement.tsx` — calls Edge Function for create, direct Supabase for list/update
- `ApprovalDashboard.tsx`, `PendingApprovalsWidget.tsx` — direct queries

**Risk:** These bypass any centralized error handling, logging, or future middleware. Makes testing and mocking impossible.

---

### C7. IRR Calculation Can Return Null

The Newton-Raphson IRR implementation uses a single initial guess of 0.1. For unusual cash flow patterns (multiple sign changes, very high/low returns), it can fail to converge and return `null`. This is displayed as 0% or blank in the UI.

**Risk:** Financial calculations may be silently wrong on edge-case quotes.

---

### C8. Quote Versions and Collaborators Tables Are Dead Code

`quote_versions` and `quote_collaborators` are typed in the schema but never used. They occupy mental space and could confuse developers.

**Risk:** Low direct risk, but creates confusion about what's implemented.

---

### C9. Remaining `console.*` Calls

CLAUDE.md documents ~236 raw `console.*` calls were identified, with 60 replaced in Phase 1. Approximately **176 raw console calls remain** that bypass the structured logger, potentially leaking sensitive data in production browser consoles.

---

### C10. Supabase Realtime Connection Management

`useRealtimeQuote.ts` subscribes to realtime channels. With 200 users opening quotes:
- Each open quote creates a realtime subscription
- No connection pooling or multiplexing visible
- Channel cleanup depends on component unmount (if tab crashes, channel leaks)

**Risk:** Supabase realtime connection limits could be exceeded.

---

### C11. Price List Queries May Truncate Results

`usePriceList.ts` uses `.limit()` on price list queries. If the total number of price list items exceeds the limit, results are silently truncated. The Phase 1 review raised limits but didn't add pagination.

**Risk:** Missing products in the quote builder.

---

### C12. No Database Connection Error Recovery

If Supabase becomes temporarily unavailable (maintenance, network blip), there's no:
- Retry with backoff on failed queries
- Offline indicator in the UI
- Queue for failed operations to retry later

**Risk:** 200 users simultaneously see errors with no recovery path.

---

## 4. 🟡 IMPORTANT — Should Fix Before 1.0

### I1. No Loading/Error States on Some Admin Pages
While main pages have loading skeletons, some admin sub-pages may show blank content during data fetches.

### I2. Builder Has No Top Navigation Bar
Users in the 8-step quote wizard have no way to navigate back to the main dashboard without using browser back. This was flagged in Phase 2 planning.

### I3. PDF Product Images Are Placeholders
Generated PDFs use SVG placeholder images instead of actual forklift product photos. For a production quoting tool sent to customers, this looks unprofessional.

### I4. T&C Page Count is Hardcoded in PDFs
The terms and conditions page count is hardcoded rather than dynamically calculated from content.

### I5. No Dashboard Widget Customization
All users see the same dashboard layout. Managers vs. sales reps have different information needs.

### I6. Form Validation is Weak
Client info and cost fields allow invalid/extreme data through. A user could enter negative prices, impossibly high quantities, or invalid email addresses.

### I7. No Bulk Operations on Quotes
With 200 users generating hundreds of quotes, there's no way to bulk-approve, bulk-archive, or bulk-reassign quotes.

### I8. No Data Export for Reporting
While individual PDFs can be generated, there's no bulk data export for management reporting (CSV/Excel of all quotes, pipeline reports, etc.).

### I9. `database.types.ts` Manual Sync Risk
The types file was auto-generated once but has no CI/CD pipeline to keep it in sync with schema changes. Schema drift will cause runtime errors.

### I10. No Deployment Pipeline (CI/CD)
No GitHub Actions, Vercel hooks, or any automated pipeline for:
- Running tests before deploy
- Type checking before deploy
- Building and deploying automatically on merge to main

### I11. Missing Favicon and App Metadata
The app uses the default Vite favicon (`vite.svg`). For a production tool, needs proper branding.

### I12. No Health Check Endpoint
No way to monitor if the application is running correctly after deployment.

### I13. No User Onboarding or Help System
200 new users will need guidance. No tooltips, walkthrough, or help documentation built into the app.

### I14. No Audit Trail for Admin Config Changes
Changes to commission tiers, residual curves, and pricing configs are not audit-logged. Only quote-level actions are audited.

### I15. No Backup/Recovery Strategy Documented
No documented process for database backup, point-in-time recovery, or disaster recovery.

---

## 5. 🟢 WORKING WELL

These areas are solid and production-quality:

| Feature | Assessment |
|---------|-----------|
| **Quote CRUD** | Full create, load, save, duplicate, revision, delete with optimistic locking |
| **8-step Quote Builder** | Well-structured wizard with context, animation, step validation |
| **Financial Calculations** | PMT, NPV, margins, lease rates — Excel-compatible with `safeNum()` guards |
| **CRM Module** | Companies, contacts, activities, pipeline kanban, merge |
| **Lead Management** | CRUD, qualification, rejection, conversion, bulk operations |
| **Authentication** | PKCE flow, lockout, progressive delay, inactive user check |
| **Approval Workflow** | Submit, approve, reject, escalate, return, comment chain |
| **PDF Generation** | Multi-page client-side rendering with QR codes |
| **Admin Pages** | All 6 admin panels implemented (pricing, config, approvals, users, templates, audit) |
| **TypeScript** | Zero type errors across entire codebase |
| **Code Splitting** | Lazy routes with Suspense, manual vendor chunks |
| **Mobile Responsiveness** | Complete Phase 3 — hamburger nav, bottom sheets, touch targets |
| **UI/UX Quality** | Custom design system, glassmorphism, animations, dark theme |
| **Role-Based Access** | 6 roles with 10 permission overrides, route + component enforcement |
| **Global Search** | Ctrl+K command palette |
| **Error Boundary** | Global error boundary prevents white screen crashes |
| **Security Headers** | Clickjacking protection, CSP, HSTS via Vercel config |

---

## 6. Build & Test Health

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ **PASS** — zero errors |
| `npm run build` | ✅ **PASS** — builds successfully |
| `npm run test` | ❌ **FAIL** — 10/10 suites fail ("No test suite found in file") |
| `npm run lint` | ⚠️ Needs verification |

---

## 7. Deployment Checklist

Before going live with 200 users, these MUST be done:

- [ ] **Fix test suite** — all 178 tests must pass
- [ ] **Apply RLS migration** — `001_rls_policies.sql` to Supabase
- [ ] **Deploy Edge Function** — `supabase functions deploy admin-create-user`
- [ ] **Export & commit RPCs** — `save_quote_if_version`, `generate_next_quote_ref` to migration files
- [ ] **Fix delete+insert atomicity** — commission tiers and residual curves
- [ ] **Configure SMTP** — production email provider in Supabase Auth
- [ ] **Server-side rate limiting** — replace client-only login protection
- [ ] **Clean up diagnostic files** — remove `_diag.test.ts`, `_vitest_diag.config.ts`, `src/_min2.test.ts`, `src/_minimal.test.ts`
- [ ] **Set up `.env.production`** — verify all env vars are configured on Vercel
- [ ] **Load test** — simulate 200 concurrent users (especially quote saves and polling)
- [ ] **Set up database backups** — Supabase pro plan or manual backup schedule
- [ ] **Configure Supabase connection pooling** — for 200+ concurrent connections
- [ ] **Set up error monitoring** — Sentry or similar for production error tracking
- [ ] **Set up CI/CD** — automated tests + typecheck before deploy
- [ ] **User acceptance testing** — have real users test all workflows end-to-end
- [ ] **Documentation** — user guide or in-app help for 200 users

---

## 8. Recommended Fix Order

### Sprint 1: Foundation (Blockers)
1. Fix test suite (B1) — 2-4 hours
2. Clean up diagnostic files (B8) — 15 minutes
3. Export & commit RPCs (B4) — 2 hours
4. Apply RLS policies (B2) — 4-8 hours (test thoroughly)
5. Deploy Edge Function (B3) — 1 hour

### Sprint 2: Data Integrity
6. Fix delete+insert atomicity (B5) — 4-6 hours
7. Fix quote locking race condition (C1) — 4 hours
8. Add auto-save failure handling (C2) — 4 hours
9. Cache residual value lookups (C3) — 4 hours

### Sprint 3: Security & Reliability
10. Server-side rate limiting (B6) — 4-8 hours
11. Configure SMTP (B7) — 2 hours
12. Session lifecycle enforcement (C5) — 4 hours
13. Replace remaining console.* calls (C9) — 4 hours
14. Add DB connection error recovery (C12) — 8 hours

### Sprint 4: Scale & Polish
15. Optimize notification polling → WebSocket/Realtime (C4) — 8 hours
16. Route adapter-bypassing files through adapter (C6) — 8 hours
17. Add form validation (I6) — 8 hours
18. Add builder top nav (I2) — 4 hours
19. Set up CI/CD (I10) — 4 hours

### Post-1.0
20. Product images in PDFs (I3)
21. Dashboard customization (I5)
22. Bulk quote operations (I7)
23. Data export/reporting (I8)
24. User onboarding (I13)

---

## Summary

**What's great:** Feature-complete application with solid architecture, clean TypeScript, good UI/UX, and comprehensive admin tools.

**What's blocking 1.0:** Security (no RLS deployed), data integrity (non-atomic saves), broken test suite, and missing server-side infrastructure (Edge Function, SMTP, rate limiting).

**Estimated effort to reach 1.0:** 3-4 focused sprints (roughly 80-120 hours of development + testing).

**The app is ~75% of the way to production.** The remaining 25% is the critical infrastructure that separates a demo from a production system handling real money calculations for 200 people.