# Phase 2: SQL Schema, RPC, and Security Gates

**Tester**: Claude (Opus 4.6)
**Date**: 2026-02-19
**Environment**: Codebase analysis (SQL files + code inspection)
**Commit**: `df1e273` (working tree)

---

## Note on Methodology

This phase was conducted via **codebase analysis only** (not live Supabase SQL queries). The SQL verification queries listed in the plan require execution in the Supabase SQL editor for full evidence. Findings here are based on inspection of:
- `Project documentation/sql/company_merge_rpc.sql`
- `src/db/SupabaseAdapter.ts`
- `src/lib/supabase.ts`
- `src/store/useAuthStore.ts`

**Action Required**: Execute the 7 SQL queries from the plan in Supabase SQL editor and paste outputs here for complete evidence.

---

## 2.1 Required Tables (from code analysis)

Tables referenced in `SupabaseAdapter.ts` and other code:

| # | Table Name | Referenced In |
|---|-----------|---------------|
| 1 | `quotes` | SupabaseAdapter, multiple hooks |
| 2 | `users` | useAuthStore, UserManagement |
| 3 | `companies` | SupabaseAdapter, CRM hooks |
| 4 | `contacts` | SupabaseAdapter, useContacts |
| 5 | `activities` | SupabaseAdapter, useActivities |
| 6 | `approval_actions` | useApprovalNotifications |
| 7 | `approval_chains` | ApprovalWorkflowPanel |
| 8 | `commission_tiers` | CommissionTiersEditor |
| 9 | `residual_curves` | ResidualCurvesEditor |
| 10 | `config` | useConfigStore |
| 11 | `quote_presence` | usePresence |
| 12 | `notifications` | useNotifications |
| 13 | `audit_log` | AuditLogViewer |
| 14 | `price_list_series` | usePriceList |
| 15 | `price_list_models` | usePriceList |
| 16 | `templates` | Admin templates |

**Expected**: 16 tables. **Must verify against live Supabase** with:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

**Result**: **PENDING LIVE VERIFICATION**

---

## 2.2 Key Column Checks (from code)

Columns that must exist on `quotes` table (verified in code references):

| Column | Type (expected) | Referenced In |
|--------|----------------|---------------|
| `contact_title` | text | SupabaseAdapter serialization |
| `validity_days` | integer | useQuoteStore, SupabaseAdapter |
| `shipping_entries` | jsonb | SupabaseAdapter serialization |
| `locked_by` | uuid | useQuoteLock |
| `locked_at` | timestamptz | useQuoteLock |
| `version` | integer | useAutoSave, optimistic locking |
| `company_id` | uuid | CRM link |
| `created_by` | uuid | Ownership |
| `assigned_to` | uuid | Assignment |
| `approval_chain` | jsonb | Approval workflow |
| `slots` | jsonb | Unit configuration |
| `status` | text | Lifecycle |

**Result**: **PENDING LIVE VERIFICATION**

---

## 2.3 merge_companies RPC

### Existence Check
- File: `Project documentation/sql/company_merge_rpc.sql` defines `merge_companies(UUID, UUID, JSONB)`
- Function type: `plpgsql SECURITY DEFINER`
- Must verify it's deployed to live Supabase

### Grant Check
From SQL file:
```sql
GRANT EXECUTE ON FUNCTION merge_companies(UUID, UUID, JSONB) TO authenticated;
```

**Expected**: Grants to `authenticated` and `service_role` only. NOT `public` or `anon`.

### Field Coverage Defect
See **D-001** in `14-defects.md`. Only 7 of 20 fields are extracted from `p_merged_data`.

**Result**: **DEFECT D-001 (P1)**

---

## 2.4 RLS Status (code-inferred)

### RLS Expected
Based on code, RLS should be enabled on:
- `quotes` — role-based visibility (sales_rep sees own only, manager/admin sees all)
- `users` — visibility restrictions

### Role Visibility Logic (from code)
`src/hooks/useQuotes.ts` and `src/store/useAuthStore.ts` show role-based filtering:

| Role | Expected Quote Visibility |
|------|--------------------------|
| `sales_rep` | Own quotes only (`created_by = self OR assigned_to = self`) |
| `sales_manager` | All quotes |
| `system_admin` | All quotes + all users + all data |

**Must verify with live Supabase SQL**:
```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('quotes', 'users');

SELECT tablename, policyname, cmd, roles FROM pg_policies
WHERE schemaname = 'public' ORDER BY tablename, policyname;
```

**Result**: **PENDING LIVE VERIFICATION**

---

## 2.5 Role Name Alignment

Application role names (from `src/store/useAuthStore.ts`):
- `system_admin`
- `sales_manager`
- `sales_rep`
- `local_leader`
- `ceo`

These must match role names used in RLS policies.

**Must verify**:
```sql
SELECT DISTINCT unnest(roles) as role_used FROM pg_policies WHERE schemaname = 'public';
```

**Result**: **PENDING LIVE VERIFICATION**

---

## Phase 2 Summary

| Check | Result |
|-------|--------|
| Tables exist (16) | PENDING LIVE VERIFICATION |
| Key columns exist | PENDING LIVE VERIFICATION |
| merge_companies RPC exists | EXISTS in SQL file, deployment status TBC |
| merge_companies field coverage | **FAIL — D-001 (P1)** |
| RPC grants (no public/anon) | PENDING LIVE VERIFICATION |
| RLS enabled on quotes/users | PENDING LIVE VERIFICATION |
| CRUD policies exist | PENDING LIVE VERIFICATION |
| Role names aligned | PENDING LIVE VERIFICATION |

**Phase 2 Verdict**: **BLOCKED** — Requires live Supabase SQL queries for completion. One P1 defect confirmed (D-001).
