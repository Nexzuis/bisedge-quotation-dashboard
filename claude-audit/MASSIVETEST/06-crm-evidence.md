# Phase 5: CRM Validation

**Tester**: Claude (Opus 4.6)
**Date**: 2026-02-19
**Environment**: Codebase analysis
**Commit**: `df1e273` (working tree)

---

## Methodology

Phase 5 requires Playwright browser testing. This captures code analysis and critical defect D-001.

---

## Code Analysis: CRM Architecture

### Company Operations
- CRUD: `SupabaseAdapter.ts` methods for companies
- Pipeline: Kanban drag-and-drop in `CustomerListPage.tsx`
- Merge: `src/hooks/useCompanyMerge.ts` -> `merge_companies` RPC

### Contact Operations
- CRUD: Managed via `useContacts` hook
- Primary contact: `is_primary` flag on contacts table

### Activity Operations
- Types: call, email, meeting, note
- Timeline: Activity feed in customer detail

---

## Company Merge RPC - CRITICAL DEFECT

**See D-001 in 14-defects.md**

The `merge_companies` RPC drops 13 of 20 user-selected merge fields. This is the most critical CRM defect.

### Frontend Field Coverage (useCompanyMerge.ts)
20 mergeable fields defined in `MERGEABLE_FIELDS` constant.

### SQL Function Coverage (company_merge_rpc.sql)
Only 7 fields extracted: name, trading_name, industry, website, notes, phone, email.

### Dropped Fields (13)
registration_number, vat_number, address, city, province, postal_code, country, pipeline_stage, assigned_to, estimated_value, credit_limit, payment_terms, tags

---

## Required Browser Tests

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5.1 | Company CRUD (all fields) | Create, read, update, delete | **PENDING** |
| 5.2 | Contact CRUD + primary | Add, edit, set primary, delete | **PENDING** |
| 5.3 | Activity CRUD | Log call/email/meeting/note | **PENDING** |
| 5.4 | Pipeline stage drag | Stage persists after drag | **PENDING** |
| 5.5 | Company search | Search by name/industry | **PENDING** |
| 5.6 | Excel export | XLSX downloads, correct columns | **PENDING** |
| 5.7 | Company merge (all 20 fields) | **BLOCKED BY D-001** | **BLOCKED** |

---

## Phase 5 Verdict: **BLOCKED** — D-001 (merge_companies field drop) must be fixed first. Other tests pending live browser testing.
