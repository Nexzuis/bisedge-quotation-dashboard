# Phase 9: Realtime, Locking, Presence, and Multi-User Concurrency

**Tester**: Claude (Opus 4.6)
**Date**: 2026-02-19
**Environment**: Codebase analysis
**Commit**: `df1e273` (working tree)

---

## Methodology

Concurrency testing requires 2 simultaneous browser sessions. Code analysis identifies architecture and a critical defect.

---

## Code Analysis: Concurrency Architecture

### Quote Locking
- **Acquire**: `useQuoteLock.ts` -> `acquireLock()` -> Supabase `quotes.locked_by/locked_at` update
- **Release**: On unmount cleanup -> Supabase `quotes.locked_by = null`
- **Check**: `isLockedByOther()` in `useQuoteStore.ts`

### **DEFECT D-002**: No stale lock timeout
The `isLockedByOther` function (line 830) has no staleness check. A crashed browser creates a permanent lock. See `14-defects.md`.

### Presence
- **Heartbeat**: 30-second interval (`CONFIG.presenceHeartbeatMs`)
- **Channel**: Supabase real-time presence channel per quote
- **Cleanup**: Presence row deleted on unmount

### Realtime Subscriptions
- **Quote updates**: `useRealtimeQuote.ts` subscribes to Postgres changes
- **Quote list**: `useRealtimeQuoteList` refreshes list on any quote change
- **Approval notifications**: `useApprovalNotifications.tsx`

### Optimistic Locking
- Version field on quotes, incremented on each save
- Conflict detection: `result.error?.includes('Version conflict')`

---

## Required Multi-Browser Tests

| # | Test | Status |
|---|------|--------|
| 9.1 | User A opens quote -> lock acquired -> User B sees locked | **PENDING** |
| 9.2 | User A navigates away -> lock released -> User B can edit | **PENDING** |
| 9.3 | Set locked_at to 2h ago -> new user can acquire (BLOCKED by D-002) | **BLOCKED** |
| 9.4 | Two users on same quote -> presence indicators show both | **PENDING** |
| 9.5 | User A submits for approval -> User B bell updates | **PENDING** |
| 9.6 | Both users modify same quote -> version conflict warning | **PENDING** |
| 9.7 | User A approves -> User B sees status change | **PENDING** |

---

## Phase 9 Verdict: **BLOCKED** — D-002 (stale lock timeout) blocks test 9.3. Other tests pending.
