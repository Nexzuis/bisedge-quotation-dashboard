# Supabase Cutover Verification Test Results

- Timestamp: 2026-02-19 17:49:03 +02:00
- Verifier: Codex
- Commit: `df1e273`

## Commands Run

1. `npm.cmd run typecheck`
2. `npm.cmd run test`
3. `npm.cmd run build`

## Results

## 1) Typecheck

Command:

```powershell
npm.cmd run typecheck
```

Outcome:

1. PASS
2. `tsc --noEmit` completed with 0 errors.

## 2) Test Suite

Command:

```powershell
npm.cmd run test
```

Outcome:

1. PASS
2. 4 test files passed.
3. 96 tests passed.

Observed files:

1. `src/auth/__tests__/permissions.test.ts`
2. `src/db/__tests__/serialization.test.ts`
3. `src/engine/__tests__/calculationEngine.test.ts`
4. `src/engine/__tests__/formatters.test.ts`

## 3) Production Build

Command:

```powershell
npm.cmd run build
```

Outcome:

1. PASS
2. Vite build completed successfully.
3. Output generated under `dist/`.

Warnings:

1. Non-blocking Vite warnings about modules imported both dynamically and statically (chunking optimization warning class).

## Static Gate Checks

All checks run against `src/`:

1. `SyncQueue|syncQueue => 0`
2. `VITE_APP_MODE => 0`
3. `isCloudMode|isLocalMode|isHybridMode => 0`
4. `useLiveQuery => 0`
5. `from '../db/schema'|from '../../db/schema'|from '../../../db/schema' => 0`
6. `dexie-react-hooks => 0`
7. `navigator\.onLine => 0`
8. `seedDatabaseIfEmpty => 0`
9. `LocalAdapter|HybridAdapter|IndexedDBRepository => 0`

## Dependency Cleanup Checks

1. `package.json => 0 matches for dexie/dexie-react-hooks`
2. `package-lock.json => 0 matches for dexie/dexie-react-hooks`

## Test Gate Decision

Automated verification gates: PASS.
