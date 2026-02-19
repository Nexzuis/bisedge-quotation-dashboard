# Defects Register

**Tester**: Claude (Opus 4.6)
**Date**: 2026-02-19
**Commit**: `df1e273` (working tree)

---

## Defect Summary

| ID | Severity | Category | Title | Status |
|----|----------|----------|-------|--------|
| D-001 | **P1** | Data Integrity | `merge_companies` RPC silently drops 13 of 20 merged fields | FIXED |
| D-002 | **P1** | Concurrency | `isLockedByOther` has no stale lock timeout — permanent lock on crash | FIXED |
| D-003 | **P1** | Security | SupabaseTestPage exposed in production builds | FIXED |
| D-004 | **P2** | Operations | Console.log debug noise in production (30+ instances in hooks) | FIXED |
| D-005 | **P2** | Hygiene | Extraneous `bcryptjs` and `@types/bcryptjs` in node_modules | FIXED |

---

## D-001: merge_companies RPC Silent Field Drop

**Severity**: P1 (Major — data loss during merge operation)
**Category**: Data Integrity
**Status**: FIXED (2026-02-19) — 13 missing fields added to UPDATE clause with NULLIF wrapping on casted fields

### Description
The `merge_companies` SQL RPC function only extracts 7 of the 20 fields that the frontend sends in `p_merged_data`. The remaining 13 fields are silently dropped during a company merge, meaning user selections for those fields have no effect.

### Evidence

**Frontend sends** (from `src/hooks/useCompanyMerge.ts`, MERGEABLE_FIELDS):
1. name, 2. trading_name, 3. registration_number, 4. vat_number, 5. industry, 6. website, 7. address, 8. city, 9. province, 10. postal_code, 11. country, 12. phone, 13. email, 14. pipeline_stage, 15. assigned_to, 16. estimated_value, 17. credit_limit, 18. payment_terms, 19. tags, 20. notes

**SQL function extracts** (from `Project documentation/sql/company_merge_rpc.sql`):
1. name, 2. trading_name, 3. industry, 4. website, 5. notes, 6. phone, 7. email

**Silently dropped fields** (13):
registration_number, vat_number, address, city, province, postal_code, country, pipeline_stage, assigned_to, estimated_value, credit_limit, payment_terms, tags

### Impact
When a user merges two companies and selects field values from the secondary company for any of the 13 dropped fields, those selections are ignored. The primary company retains its original values for those fields. This is a silent data loss — no error is shown.

### Fix Required
Add 13 missing fields to the `UPDATE companies SET` clause in the SQL function:
```sql
registration_number = COALESCE(p_merged_data->>'registration_number', registration_number),
vat_number = COALESCE(p_merged_data->>'vat_number', vat_number),
address = COALESCE(p_merged_data->'address', address),
city = COALESCE(p_merged_data->>'city', city),
province = COALESCE(p_merged_data->>'province', province),
postal_code = COALESCE(p_merged_data->>'postal_code', postal_code),
country = COALESCE(p_merged_data->>'country', country),
pipeline_stage = COALESCE(p_merged_data->>'pipeline_stage', pipeline_stage),
assigned_to = COALESCE((p_merged_data->>'assigned_to')::UUID, assigned_to),
estimated_value = COALESCE((p_merged_data->>'estimated_value')::NUMERIC, estimated_value),
credit_limit = COALESCE((p_merged_data->>'credit_limit')::NUMERIC, credit_limit),
payment_terms = COALESCE((p_merged_data->>'payment_terms')::INTEGER, payment_terms),
tags = COALESCE(p_merged_data->'tags', tags),
```

### Files
- `Project documentation/sql/company_merge_rpc.sql` (SQL definition)
- `src/hooks/useCompanyMerge.ts` (frontend caller)

---

## D-002: No Stale Lock Timeout in isLockedByOther

**Severity**: P1 (Major — permanent lock on browser crash)
**Category**: Concurrency
**Status**: FIXED (2026-02-19) — LOCK_STALE_MS (1 hour) added to isLockedByOther + stale override logging in useQuoteLock

### Description
The `isLockedByOther` function in `useQuoteStore.ts` (line 830) checks if a quote is locked by another user but has no staleness check on `lockedAt`. If a user's browser crashes or they close the tab without proper cleanup, the lock is never released and the quote becomes permanently locked for all other users.

### Evidence
```typescript
// Current code (src/store/useQuoteStore.ts:830-833)
isLockedByOther: (currentUserId) => {
  const state = get();
  return !!(state.lockedBy && state.lockedBy !== currentUserId);
},
```

No reference to `lockedAt` timestamp. No timeout mechanism.

### Impact
A browser crash, tab close, or network disconnect creates a permanent lock. The only recovery path is manual database intervention to clear `locked_by` and `locked_at` in the quotes table.

### Fix Required
Add 1-hour stale lock timeout:
```typescript
isLockedByOther: (currentUserId) => {
  const state = get();
  if (!state.lockedBy || state.lockedBy === currentUserId) return false;
  if (state.lockedAt) {
    const lockAge = Date.now() - new Date(state.lockedAt).getTime();
    if (lockAge > 60 * 60 * 1000) return false; // 1-hour timeout
  }
  return true;
},
```

### Files
- `src/store/useQuoteStore.ts` (line 830)
- `src/hooks/useQuoteLock.ts` (should log stale lock override)

---

## D-003: SupabaseTestPage Exposed in Production

**Severity**: P1 (Security — diagnostic page in production)
**Category**: Security
**Status**: FIXED (2026-02-19) — SupabaseTestPage import and /test-supabase route removed from App.tsx

### Description
`SupabaseTestPage` is imported unconditionally in `src/App.tsx` (line 18) and registered as a route at `/test-supabase` (lines 169-172). This diagnostic page is accessible in production builds to any authenticated admin user. It exposes Supabase connection details and internal system information.

### Evidence
```typescript
// src/App.tsx:18
import SupabaseTestPage from './components/SupabaseTestPage';

// src/App.tsx:169-172
<Route path="/test-supabase" element={
  <RequireAuth><RequireAdmin><SupabaseTestPage /></RequireAdmin></RequireAuth>
} />
```

While it's gated behind `RequireAuth` + `RequireAdmin`, it should not be present in production bundles at all.

### Impact
- Exposes internal Supabase connection details to admin users
- Increases production bundle size unnecessarily
- Potential information disclosure

### Fix Required
Gate the import and route behind `import.meta.env.DEV`:
```typescript
const SupabaseTestPage = import.meta.env.DEV
  ? lazy(() => import('./components/SupabaseTestPage'))
  : null;

// In routes:
{import.meta.env.DEV && SupabaseTestPage && (
  <Route path="/test-supabase" element={...} />
)}
```

### Files
- `src/App.tsx` (lines 18, 169-172)

---

## D-004: Console.log Debug Noise in Production

**Severity**: P2 (Minor — operational noise)
**Category**: Operations
**Status**: FIXED (2026-02-19) — console.log/warn/error migrated to logger in 7 priority files

### Description
Multiple hook files use `console.log` with emoji prefixes for debug output. In production builds, these are not silenced. A `logger.ts` utility exists at `src/utils/logger.ts` that silences `debug`/`info` in production, but it's not used in these files.

### Evidence (30+ instances across hooks)

| File | console.log count | console.warn count |
|------|-------------------|-------------------|
| `useRealtimeQuote.ts` | 12 | 0 |
| `useApprovalNotifications.tsx` | 9 | 0 |
| `useQuoteLock.ts` | 4 | 2 |
| `usePresence.ts` | 2 | 0 |
| `useQuotes.ts` | 2 | 1 |
| `useAutoSave.ts` | 0 | 2 |

### Impact
- Console noise in production makes debugging harder
- Emoji prefixes in logs are unprofessional
- Sensitive data (user emails, quote IDs) logged to console

### Fix Required
Replace `console.log` with `logger.debug`, `console.error` with `logger.error` in all 7 listed files. Remove emoji prefixes.

### Files
- `src/hooks/useQuoteLock.ts`
- `src/hooks/useRealtimeQuote.ts`
- `src/hooks/usePresence.ts`
- `src/hooks/useAutoSave.ts`
- `src/hooks/useQuoteDB.ts`
- `src/hooks/useApprovalNotifications.tsx`
- `src/store/useQuoteStore.ts`

---

## D-005: Extraneous Legacy Packages

**Severity**: P2 (Minor — hygiene)
**Category**: Hygiene
**Status**: FIXED (2026-02-19) — npm prune removed extraneous packages

### Description
`bcryptjs@3.0.3` and `@types/bcryptjs@2.4.6` are present in `node_modules/` as extraneous packages. They are not listed in `package.json` dependencies or devDependencies but remain in the installed tree.

### Impact
- No production impact (not bundled by Vite)
- Clutters dependency tree
- Could cause confusion during audits

### Fix Required
Run `npm prune` to remove extraneous packages, or manually `npm uninstall bcryptjs @types/bcryptjs`.

---

## Defect Statistics

| Severity | Count | Blocking? |
|----------|-------|-----------|
| P0 | 0 | N/A |
| P1 | 3 | ALL FIXED (D-001, D-002, D-003) |
| P2 | 2 | ALL FIXED (D-004, D-005) |
| **Total** | **5** | **0 blockers remaining** |
