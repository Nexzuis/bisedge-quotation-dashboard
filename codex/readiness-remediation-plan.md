# Readiness Remediation Plan (`codex/readiness-remediation-plan.md`)

## Goal
Harden the dashboard for safe multi-user production use (target: 30 users) by fixing correctness blockers first, then stabilizing operations, then scaling maintainability.

## Implementation Principles
1. Do not break offline-first behavior.
2. Parent-child sync order remains guaranteed.
3. No silent data loss in save/sync/backup paths.
4. RBAC behavior must match stated business rules.
5. Every P0/P1 change requires regression tests.

## Wave 0 - Same Day (Release Blockers)

### 0.1 Quote deep-link loading contract
Scope:
- Add query ID loading for `/quote?id=<id>`.
- If `id` absent, keep current fallback behavior.

Implementation:
- Parse query params in quote dashboard route layer.
- Call `useQuoteDB().loadFromDB(id)` on mount and query change.
- Add visible error toast + fallback when quote is missing.

Acceptance criteria:
- Clicking any quote from list/widgets/notifications always opens that exact quote.

---

### 0.2 Autosave singleton
Scope:
- Remove multiple timer/save writers from component tree.

Implementation:
- Create a single autosave manager (provider or global service).
- Expose read-only save state to UI surfaces.
- Keep explicit `saveNow` action centralized.

Acceptance criteria:
- One save operation per debounce interval.
- No self-induced version conflicts from parallel autosave hooks.

---

### 0.3 Persist logistics shipping model
Scope:
- Move Logistics panel data from local component state to quote state.

Implementation:
- Add typed shipping entries to `QuoteState`.
- Add store actions for add/update/remove shipping lines.
- Serialize shipping data into stored quote.
- Include shipping in totals where business-approved.

Acceptance criteria:
- Shipping data survives save/load/revision/duplicate.
- Shipping values appear consistently after reload and in exports where required.

---

### 0.4 Enforce CRM ownership rules
Scope:
- `sales_rep` and `key_account` see assigned accounts only by default and on direct route access.

Implementation:
- Enforce list and detail filters in data retrieval layer.
- Add role-aware guard in customer detail loader.
- Keep manager/admin full visibility.

Acceptance criteria:
- Low roles cannot view unassigned companies from list or URL.

---

### 0.5 Backup/restore coverage completion
Scope:
- Include all required stores in backup/export/import.

Implementation:
- Build explicit store manifest sourced from schema contract.
- Add `schemaVersion` and `appVersion` metadata.
- Add replace-mode clear coverage for all included stores.
- Add import validation with fail-fast reporting.

Acceptance criteria:
- Full round-trip restore reproduces all store counts and sampled data.

## Wave 1 - 72 Hours (Stability and Correctness)

### 1.1 Legacy field cleanup for model and battery references
Scope:
- Standardize model identity and battery selection fields.

Implementation:
- Stop overloading `modelCode` with display name.
- Use canonical `modelMaterialNumber` + explicit display fields.
- Update workflow/spec logic to current battery model fields.

Acceptance criteria:
- Workflow completion aligns with actual configured data.
- Specs panel resolves selected model and battery correctly.

---

### 1.2 Config and auth bootstrap alignment
Scope:
- Remove default credential/default-value ambiguity.

Implementation:
- Define deterministic bootstrap strategy for local/hybrid mode.
- Align documented default ROE and seeded defaults, or document override source clearly.
- Replace console-only random password output with explicit setup flow.

Acceptance criteria:
- Fresh install onboarding is deterministic and documented.

---

### 1.3 Lint error burn-down to zero errors
Scope:
- Resolve all ESLint errors first; warnings handled by priority.

Implementation sequence:
1. `react-hooks/set-state-in-effect` and hook safety errors.
2. `no-unused-vars`, `no-empty`, `prefer-const`.
3. fast-refresh export-structure errors.
4. then warning classes in batches (`console`, `any`, hook deps).

Acceptance criteria:
- `npm run lint` returns zero errors.

---

### 1.4 Local mode resilience to missing Supabase env
Scope:
- Decouple local startup from cloud env checks.

Implementation:
- Lazy-load/create Supabase client only for cloud/hybrid code paths.
- Guard realtime/presence/sync hooks with mode checks before client access.

Acceptance criteria:
- Local mode runs without `VITE_SUPABASE_*` vars.

## Wave 2 - 1 to 2 Weeks (Scale and Operability)

### 2.1 Sync durability hardening
Scope:
- Move queue persistence from localStorage to IndexedDB.

Implementation:
- Add `syncQueue` store in Dexie schema.
- Migrate queue read/write paths and failure blocklist.
- Add size/age retention policy and observability counters.

Acceptance criteria:
- Queue survives long sessions and large operation volume reliably.

---

### 2.2 Test expansion for critical workflows
Scope:
- Add integration tests around business-critical paths.

Priority tests:
1. Deep-link quote loading (`/quote?id=`)
2. Autosave single-writer behavior
3. CRM ownership enforcement
4. Backup/restore full manifest
5. Offline queue ordering and replay

Acceptance criteria:
- CI gate includes these tests and blocks regressions.

---

### 2.3 Performance and bundle optimization
Scope:
- Reduce initial payload and improve feature chunking.

Implementation:
- Lazy-load PDF-heavy and admin-heavy modules.
- Remove static imports that defeat intended code splitting.
- Re-check build chunk outputs and warning set.

Acceptance criteria:
- Reduced main bundle size and cleaner chunking profile.

## Cross-Cutting Acceptance Matrix
For each wave item, verify in all applicable modes:
1. Local mode
2. Hybrid mode online
3. Hybrid mode offline then reconnect

And across role sets:
1. `sales_rep`
2. `key_account`
3. manager/admin roles

## Rollout Sequence
1. Deploy Wave 0 behind tight smoke tests.
2. Run targeted UAT on quote creation, CRM access, backup/restore.
3. Promote Wave 1 after lint error zero and onboarding alignment.
4. Schedule Wave 2 with CI test coverage and sync durability milestones.

## Exit Criteria for 30-User Launch
1. All P0 items closed and verified.
2. No lint errors.
3. RBAC behavior proven in list and deep-link detail flows.
4. Backup/restore full round-trip verified.
5. Autosave stable with no internal save races.
6. Team can onboard a fresh environment without hidden bootstrap steps.
