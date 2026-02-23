# FUTURE-PLANS.md — Scalability Roadmap for 200 Users

Created: 2026-02-23
Source: 4-agent deep scalability audit (quote ref generation, save/lock concurrency, auth/session/realtime, CRM/leads/search)

---

## Current Status

The codebase is functionally complete through Phase 7 (25 workflow bugs fixed). However, a scalability audit targeting 200 concurrent users identified several areas that need hardening before a large-scale rollout.

**What's already safe:**
- Quote ref generation (PostgreSQL `nextval()` sequence — collision-impossible)
- Quote save atomicity (`save_quote_if_version` uses `FOR UPDATE` row lock)
- Per-quote row-level locking (no table contention between different quotes)
- Version conflict detection with ghost-success reconciliation
- Lead list pagination (proper `.range()` server-side)

---

## Phase 8: Scalability Hardening

### Priority 1 — Critical (Must Fix Before 200-User Rollout)

#### S1. GlobalSearch calls `listCompanies()` — full table scan on every keystroke
- **Where:** `GlobalSearch.tsx:67`
- **Impact:** 200 users using Ctrl+K = 200 full company table dumps per 200ms debounce cycle
- **Fix:** One-line change — replace `listCompanies()` with `getDb().searchCompanies(q)` which already exists with `.ilike()` and `.limit(20)`
- **Effort:** Trivial

#### S2. Supabase connection pooling not configured
- **Where:** Supabase dashboard (no code change)
- **Impact:** Dashboard mount fires 5-7 queries per user. 200 users = 1,000-1,400 concurrent connections. Free tier limit: 60. Pro: 200. Will cause 503 errors.
- **Fix:** Configure PgBouncer in transaction mode via Supabase dashboard. Pool size 50-100.
- **Effort:** Configuration only

#### S3. Realtime WebSocket connections exceed limits
- **Where:** 3-4 channels per user minimum (`useNotifications.ts:63`, `useApprovalCount.ts:69`, `useApprovalNotifications.tsx:45`, `useRealtimeQuote.ts:260`)
- **Impact:** 200 users × 3 channels = 600+ WebSocket connections. Free tier: 200 limit. Pro: 500 limit.
- **Fix:** Move to Supabase Pro + Realtime add-on. Add visibility-change pause to `useRealtimeQuoteList` (mirror the pattern from `useApprovalCount.ts:135-144`).
- **Effort:** Small (code) + Plan upgrade (infra)

---

### Priority 2 — High (Should Fix Before 200-User Rollout)

#### S4. No jitter on retry backoff — thundering herd risk
- **Where:** `resilientFetch.ts:252` (`withRetry` function)
- **Impact:** If 200 users hit a transient DB spike, all retries fire at t+1s, t+3s, t+7s simultaneously, worsening the overload.
- **Fix:** Add jitter to backoff: `baseDelayMs * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5)`
- **Effort:** Trivial

#### S5. Dashboard widgets fetch oversized datasets and aggregate in JS
- **Where:**
  - `QuoteStatsWidget.tsx:49-52` — fetches 200 rows just to count by status in JS
  - `QuotesListPage.tsx:70` — fetches 500 full rows then sorts in JS (overrides server sort at line 140)
  - `SupabaseAdapter.ts:1649-1712` (`getLeadStats`) — fetches entire leads table to aggregate in JS
  - `SupabaseAdapter.ts:853-870` (`listCompanies`) — no limit, no pagination, full table every call
- **Impact:** 200 users opening dashboard = 400 quote list queries + 200 full company scans + 200 full lead scans in a 2-3 second burst
- **Fix:**
  - Replace `getLeadStats` with a Postgres `GROUP BY` aggregate RPC
  - Replace `QuoteStatsWidget` counting with a single count-by-status RPC or `.in()` query
  - Reduce `QuotesListPage` pageSize from 500 to 50, add real UI page controls
  - Add `.limit(500)` ceiling to `listCompanies` as a guard, then add proper pagination
  - Consider a consolidated `dashboard-stats` RPC that returns all widget data in one call
- **Effort:** Medium (new RPCs + migration)

#### S6. Missing trigram indexes on search columns
- **Where:** `ilike('%term%')` on quotes (`SupabaseAdapter.ts:320`), contacts (`:972`), companies (`:877`), leads (`:1624`)
- **Impact:** Every search = full sequential scan at 10,000+ rows. Leading wildcard `%term%` cannot use B-tree indexes.
- **Fix:** Add migration:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX idx_quotes_client_name_trgm ON quotes USING gin (client_name gin_trgm_ops);
  CREATE INDEX idx_quotes_quote_ref_trgm ON quotes USING gin (quote_ref gin_trgm_ops);
  CREATE INDEX idx_contacts_names_trgm ON contacts USING gin ((first_name || ' ' || last_name) gin_trgm_ops);
  CREATE INDEX idx_companies_name_trgm ON companies USING gin (name gin_trgm_ops);
  CREATE INDEX idx_leads_company_trgm ON leads USING gin (company_name gin_trgm_ops);
  ```
- **Effort:** Migration only

#### S7. Stale lock timeout too wide (1 hour)
- **Where:** `useQuoteStore.ts:33` (`LOCK_STALE_MS = 60 * 60 * 1000`)
- **Impact:** Crashed browser = lock held for 1 hour. At 200 users, multiple ghost locks per day. `beforeunload` handler is best-effort — mobile/crashes don't fire it.
- **Fix:**
  - Reduce `LOCK_STALE_MS` to 15-30 minutes
  - Add lock heartbeat (periodic `locked_at` refresh while quote is open)
  - Enforce server-side expiry in `save_quote_if_version` RPC:
    ```sql
    IF current_lock_holder IS NOT NULL
       AND current_lock_holder != calling_user
       AND COALESCE(current_locked_at, NOW()) > NOW() - INTERVAL '30 minutes'
    ```
- **Effort:** Small (code) + Migration (RPC update)

#### S8. Deploy pending migrations
- **Where:** CLAUDE.md "Not Yet Implemented" section
- **Impact:** `005_stale_lock_cleanup.sql` not deployed = zero server-side lock cleanup. `003_atomic_saves.sql` not deployed = pricing config saves not atomic. `004_presence_cleanup.sql` not deployed = presence rows accumulate.
- **Fix:** Run `supabase db push` or apply migrations via dashboard
- **Effort:** Deployment only

---

### Priority 3 — Medium (Performance & Reliability Improvements)

#### S9. `checkAuth()` called twice on page load
- **Where:** `onRehydrateStorage` (`useAuthStore.ts:544`) AND `AuthContext.useEffect` (`AuthContext.tsx:33`)
- **Impact:** 200 users × 2 DB queries each = 400 user-table queries on mass page refresh
- **Fix:** Gate the `AuthContext` `useEffect` call behind `!isAuthLoading`, or remove it (let `onRehydrateStorage` handle it exclusively)
- **Effort:** Trivial

#### S10. No jitter on 5-minute re-validation interval
- **Where:** `AuthContext.tsx:87` (`setInterval` with fixed `REVALIDATION_INTERVAL_MS`)
- **Impact:** If 200 users all log in at 9:00 AM, all intervals fire simultaneously at 9:05, 9:10, etc. — 200 queries every 5 minutes in a single burst
- **Fix:** Add jitter: `REVALIDATION_INTERVAL_MS + Math.random() * 60_000`
- **Effort:** Trivial

#### S11. No jitter on network-restore ping
- **Where:** `useConnectionStatus.ts:123-128` (`handleOnline` callback)
- **Impact:** When a Wi-Fi glitch resolves, all 200 browsers fire `window.online` simultaneously = 200 pings + 600 WebSocket reconnects at once
- **Fix:** Delay the immediate ping by `Math.random() * 10_000` (0-10 seconds random spread)
- **Effort:** Trivial

#### S12. `audit_log` INSERT awaited serially in save path
- **Where:** `SupabaseAdapter.ts:197-203`
- **Impact:** Each save holds its PostgREST connection slot until the audit INSERT completes (~5-10ms extra). At 100 saves/second, this adds unnecessary connection pressure.
- **Fix:** Make `logAudit` fire-and-forget (do not `await` it in `saveQuote`)
- **Effort:** Trivial

#### S13. Redundant re-SELECT queries in save RPC ownership check
- **Where:** `002_schema_and_rpcs.sql:98-100`
- **Impact:** 3 additional SELECT statements per save that re-read columns already available from the initial `SELECT FOR UPDATE`. At 100 saves/second = 300 wasted queries/second.
- **Fix:** Store `assigned_to`, `current_assignee_id`, `locked_by` in local variables from the initial `SELECT FOR UPDATE` row
- **Effort:** Migration (RPC update)

#### S14. `getQuotesByCompany` has no limit
- **Where:** `SupabaseAdapter.ts:1189-1207`
- **Impact:** A company with 200+ quotes dumps all full rows (including `slots` JSONB blobs) onto one page load
- **Fix:** Add `.limit(50)` with pagination support
- **Effort:** Small

#### S15. GlobalSearch debounce too short (200ms)
- **Where:** `GlobalSearch.tsx:119`
- **Impact:** At fast typing speed, almost every character fires 3 parallel queries. 200 users typing = up to 600 queries per 200ms cycle.
- **Fix:** Increase to 400ms minimum
- **Effort:** Trivial

#### S16. Presence heartbeat interval too aggressive
- **Where:** `usePresence.ts:67` (default 30s via `CONFIG.presenceHeartbeatMs`)
- **Impact:** If `FEATURES.presence = true`, 200 users × 2 upserts/min = 400 DB writes/minute just for heartbeats
- **Fix:** Increase `VITE_PRESENCE_HEARTBEAT_MS` to 60000 (60s) to halve the write rate
- **Effort:** Configuration only

#### S17. No circuit breaker on auto-save retries
- **Where:** `useAutoSave.ts:131-135`
- **Impact:** After `PERSISTENT_ERROR_THRESHOLD` (3 failures), `persistentError` is set but retries continue indefinitely. During sustained outage with 200 users: 200 × 4 attempts = 800 RPC calls per 2-second debounce window.
- **Fix:** Stop scheduling retries once `persistentError` is true. Resume only on manual user action or connectivity change.
- **Effort:** Small

---

### Priority 4 — Low (Nice to Have)

#### S18. `countPendingApprovals` fires 2 queries instead of 1
- **Where:** `SupabaseAdapter.ts:2312-2330`
- **Fix:** Replace with `.in('status', ['pending-approval', 'in-review'])` single query

#### S19. `getPrimary` in contact repo fetches all contacts then JS-filters
- **Where:** `repositories.ts:144-147`
- **Fix:** Query `.eq('is_primary', true).limit(1)` directly

#### S20. `listCustomers` and `listAllActivities` have no pagination
- **Where:** `SupabaseAdapter.ts:536-553`, `SupabaseAdapter.ts:1245-1262`
- **Fix:** Add `.limit()` guards and pagination support

#### S21. `useRealtimeQuoteList` has no visibility-change pause
- **Where:** `useRealtimeQuote.ts:250-291`
- **Fix:** Mirror the pattern from `useApprovalCount.ts:135-144` to pause when tab is hidden

#### S22. Sequence initialization reset risk on migration re-run
- **Where:** `002_schema_and_rpcs.sql:29` — `ELSE` branch calls `setval('quote_ref_seq', max_ref)` without checking in-flight sequences
- **Impact:** Migration-time risk only, not runtime. UNIQUE constraint catches actual collisions.
- **Fix:** Guard migration so `ELSE` branch never runs in production, or use `GREATEST(max_ref, last_value)` from `pg_sequences`

---

## Numbers at a Glance (200 Users)

| Metric | Current | After Fixes |
|--------|---------|-------------|
| Auto-save DB queries/sec (all editing) | ~300/s | ~200/s (audit fire-and-forget, RPC cleanup) |
| Dashboard mount burst | 1,000-1,400 queries | ~400 (consolidated RPCs) |
| Realtime WebSocket connections | 600-1,200 | 600-800 (needs Pro + add-on) |
| GlobalSearch queries per keystroke | 3 (1 full table scan) | 3 (all limited + indexed) |
| Stale lock window | 1 hour | 15-30 min with heartbeat |
| Retry jitter | None | 50-100% random spread |
| Re-validation thundering herd | 200 simultaneous | Spread over 60s window |
| Network-restore storm | 200 simultaneous pings | Spread over 10s window |

---

## Recommended Implementation Order

| Step | Items | Effort | Impact |
|------|-------|--------|--------|
| 1 | S2 (PgBouncer config) | Config only | Unblocks everything |
| 2 | S1 (GlobalSearch fix) | 1 line | Eliminates worst query |
| 3 | S6 (trigram indexes) | Migration | Makes all search fast |
| 4 | S4, S10, S11 (jitter everywhere) | 3 trivial edits | Prevents thundering herds |
| 5 | S8 (deploy pending migrations) | Deployment | Enables lock cleanup, atomic saves |
| 6 | S7 (lock timeout + heartbeat) | Small + migration | Reduces ghost lock window |
| 7 | S5 (dashboard RPCs) | Medium | Cuts dashboard load 70% |
| 8 | S3 (Supabase Pro + Realtime) | Plan upgrade | Raises connection ceiling |
| 9 | S9, S12, S15, S17 (quick wins) | Trivial each | Polish and reliability |
| 10 | S13, S14, S16-S22 (cleanup) | Small each | Long-term scalability |

---

## Quote Numbering Note

Quote refs use PostgreSQL `nextval('quote_ref_seq')` — atomic, lock-free, collision-impossible at any concurrency level. Gaps in numbering are expected and normal (failed saves, abandoned drafts, browser crashes). Quote numbers are unique and monotonically increasing but not gapless. This is standard for sequence-based systems and should be communicated to business stakeholders if gapless numbering is expected.

---

## Infrastructure Requirements for 200 Users

| Requirement | Current | Needed |
|-------------|---------|--------|
| Supabase Plan | Free | **Pro** (minimum) |
| PgBouncer | Not configured | **Transaction mode, pool 50-100** |
| Realtime connections | 200 (Free) | **500+** (Pro + add-on) |
| Postgres connections | 60 (Free) | **200** (Pro) |
| `pg_trgm` extension | Not enabled | **Required** for search indexes |
| `pg_cron` extension | Not enabled | Recommended for automated cleanup (Pro plan) |
| Pending migrations | 3 not deployed | **Must deploy** (003, 004, 005) |
| Edge Function | Not deployed | **Must deploy** (`admin-create-user`) |
