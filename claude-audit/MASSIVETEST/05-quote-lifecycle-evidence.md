# Phase 4: Core Quote Lifecycle Validation

**Tester**: Claude (Opus 4.6)
**Date**: 2026-02-19
**Environment**: Codebase analysis
**Commit**: `df1e273` (working tree)

---

## Methodology

Phase 4 requires Playwright browser testing with live Supabase. This document captures code analysis findings and test specifications.

---

## Code Analysis: Quote Lifecycle Architecture

### Save/Load Path
- **Save**: `useAutoSave.ts` -> `getQuoteRepository().save()` -> `SupabaseAdapter.saveQuote()`
- **Load**: `useQuoteDB.ts` -> `getQuoteRepository().load()` -> `SupabaseAdapter.loadQuote()`
- **Optimistic locking**: Version field incremented on each save, conflict detection on version mismatch

### Quote Status Flow (from useQuoteStore.ts)
```
draft -> pending-approval -> approved -> sent-to-customer
                          -> rejected -> changes-requested -> (resubmit)
                          -> expired
```

### Builder Steps (8)
1. Client Info
2. Select Units
3. Configure Options
4. Costs
5. Commercial
6. Quote Settings
7. Review Summary
8. Export

### Key Data Integrity Points
- `created_by`: Set on initial save, should not change on update
- `assigned_to`: Set on submission
- `company_id`: Links to CRM company
- `shipping_entries`: JSONB, persists shipping data
- `slots`: JSONB, contains all unit configurations
- `approval_chain`: JSONB, contains approval workflow state
- `version`: Integer, incremented on each save

---

## Required Browser Tests

| # | Test | Expected | Status |
|---|------|----------|--------|
| 4.1 | Create quote through 8-step builder | Quote created, saved to Supabase | **PENDING** |
| 4.2 | Save at step 8, reload from list | All data intact | **PENDING** |
| 4.3 | Duplicate existing quote | New ref, draft status, data copied | **PENDING** |
| 4.4 | Create revision | Ref incremented (e.g., 2140.1) | **PENDING** |
| 4.5 | Edit saved quote, save again | Version incremented | **PENDING** |
| 4.6 | Status flow: draft -> pending -> approved | Status transitions work | **PENDING** |
| 4.7 | Quotes list, search by ref/client | Results match | **PENDING** |
| 4.8 | CRM company -> linked quotes -> open quote | Navigation works | **PENDING** |

### Data Integrity Checks
| Check | Status |
|-------|--------|
| `created_by` persists on update | **PENDING** |
| `shipping_entries` round-trips as JSON | **PENDING** |
| `contact_title` and `validity_days` persist | **PENDING** |
| `slots` JSON parses without crash | **PENDING** |
| Version increments on each save | **PENDING** |

---

## Phase 4 Verdict: **PENDING** — Requires live browser testing
