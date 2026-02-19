# Cross-Cutting: Role x Feature Matrix and RLS Proof

**Tester**: Claude (Opus 4.6)
**Date**: 2026-02-19
**Environment**: Codebase analysis
**Commit**: `df1e273` (working tree)

---

## Role x Feature Matrix (from code analysis)

### Application Roles
| Role | Code Name | Admin Access | Quote Visibility |
|------|-----------|-------------|-----------------|
| System Admin | `system_admin` | Full | All |
| CEO | `ceo` | Full | All |
| Local Leader | `local_leader` | Full | All |
| Sales Manager | `sales_manager` | Full | All |
| Sales Rep | `sales_rep` | None | Own only |

### Feature Access Matrix (Expected)

| Feature | system_admin | sales_manager | sales_rep |
|---------|-------------|---------------|-----------|
| Home Dashboard | Y | Y | Y |
| Quote Builder | Y | Y | Y |
| Quote List | All quotes | All quotes | Own quotes |
| CRM Dashboard | Y | Y | Y |
| Customer List | Y | Y | Y |
| Reports | Y | Y | Y |
| Notifications | Y | Y | Y |
| Admin: Pricing | Y | Y | N |
| Admin: Users | Y | Y | N |
| Admin: Approvals | Y | Y | N |
| Admin: Templates | Y | Y | N |
| Admin: Audit | Y | Y | N |
| Admin: Config | Y | Y | N |

### RequireAdmin Logic (App.tsx)
```typescript
const isAdmin = user?.role === 'system_admin' ||
  user?.role === 'sales_manager' ||
  user?.role === 'local_leader' ||
  user?.role === 'ceo';
```

**Note**: `sales_rep` is the only role excluded from admin routes.

---

## RLS Verification

### Expected Policies (must verify in Supabase)

| Table | Policy | Role | Expected Behavior |
|-------|--------|------|-------------------|
| quotes | SELECT | sales_rep | `created_by = auth.uid() OR assigned_to = auth.uid()` |
| quotes | SELECT | sales_manager+ | All rows |
| quotes | INSERT | authenticated | Own rows only |
| quotes | UPDATE | authenticated | Own rows or assigned |
| users | SELECT | authenticated | Based on role |

### Must Execute in Supabase SQL Editor
```sql
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## Public Interface / Contract Checks

### IDatabaseAdapter (44 methods)
Status: Must verify all methods are callable. The interface is defined in `src/db/interfaces.ts` and implemented by `SupabaseAdapter`.

### SupabaseAdapter Snake/Camel Mapping
Status: 13 serialization tests pass (`serialization.test.ts`), confirming correct mapping for quotes.

### merge_companies RPC
Status: **DEFECT D-001** — Only 7/20 fields handled.

### getDb() Singleton
```typescript
// src/db/DatabaseAdapter.ts
export function getDb(): IDatabaseAdapter
```
Returns `SupabaseDatabaseAdapter` instance. No Dexie/local fallback.

---

## Phase Verdict: **PARTIAL** — Code analysis complete. Live RLS verification pending.
