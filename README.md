# Bisedge Quotation Dashboard

Offline-first quotation and CRM platform for Bisedge South Africa.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Core Commands

```bash
npm run typecheck
npm run test
npm run build
npm run lint
```

## Documentation

Start here at each session:
- `WHAT_THIS_TOOL_IS.md`

Canonical project docs:
- `Project documentation/01_PROJECT_CONTEXT.md`
- `Project documentation/02_ARCHITECTURE_AND_DATA_MODEL.md`
- `Project documentation/03_SUPABASE_AND_SYNC.md`
- `Project documentation/SUPABASE_MASTER_CURRENT_STATE.sql`
- `Project documentation/04_OPERATIONS_RUNBOOK.md`
- `Project documentation/05_TESTING_AND_RELEASE_CHECKLIST.md`
- `Project documentation/06_SESSION_LOG.md`
- `Project documentation/07_STATUS_BOARD.md`

Remediation and audit research (kept as-is):
- `codex/index.md`
- `codex/readiness-audit-report.md`
- `codex/readiness-remediation-plan.md`
- `codex/researchcodex.md`
- `claude-audit/index.md`

Legacy historical docs are archived under:
- `legacy documents/2026-02-doc-consolidation/`

## Runtime Notes

- Router: `HashRouter`
- Database: Dexie IndexedDB (`BisedgeQuotationDB`, schema v6)
- Adapters: `local`, `cloud`, `hybrid` via `VITE_APP_MODE`
- Local-first with optional Supabase sync
