# Supabase Cutover Verification File Inventory

- Timestamp: 2026-02-19 17:49:03 +02:00
- Verifier: Codex
- Commit: `df1e273`

## Git Status Totals

From `git status --porcelain`:

1. Modified: 53
2. Deleted: 12
3. Added: 1

## Deleted Files (verified)

1. `src/components/admin/backup/BackupRestore.tsx`
2. `src/components/admin/migration/DataMigrationPanel.tsx`
3. `src/components/shared/SyncStatusIndicator.tsx`
4. `src/db/HybridAdapter.ts`
5. `src/db/IndexedDBRepository.ts`
6. `src/db/LocalAdapter.ts`
7. `src/db/schema.ts`
8. `src/db/seed.ts`
9. `src/hooks/useOnlineStatus.ts`
10. `src/sync/ConflictResolver.ts`
11. `src/sync/SyncQueue.ts`
12. `src/utils/migrateToSupabase.ts`

Absence check result for all required deleted files: PASS

## Added Files

1. `Project documentation/sql/company_merge_rpc.sql`

## Modified Files (tracked)

1. `.env.example`
2. `Project documentation/01_PROJECT_CONTEXT.md`
3. `Project documentation/02_ARCHITECTURE_AND_DATA_MODEL.md`
4. `Project documentation/03_SUPABASE_AND_SYNC.md`
5. `Project documentation/04_OPERATIONS_RUNBOOK.md`
6. `Project documentation/05_TESTING_AND_RELEASE_CHECKLIST.md`
7. `Project documentation/06_SESSION_LOG.md`
8. `Project documentation/07_STATUS_BOARD.md`
9. `package-lock.json`
10. `package.json`
11. `src/App.tsx`
12. `src/components/SupabaseTestPage.tsx`
13. `src/components/admin/AdminLayout.tsx`
14. `src/components/admin/audit/AuditLogViewer.tsx`
15. `src/components/admin/layout/AdminSidebar.tsx`
16. `src/components/admin/pricing/CommissionTiersEditor.tsx`
17. `src/components/admin/pricing/ResidualCurvesEditor.tsx`
18. `src/components/admin/pricing/validators.ts`
19. `src/components/admin/users/UserManagement.tsx`
20. `src/components/auth/LoginPage.tsx`
21. `src/components/crm/CustomerListPage.tsx`
22. `src/components/crm/detail/LinkedQuotes.tsx`
23. `src/components/dashboard/widgets/SystemHealthWidget.tsx`
24. `src/components/shared/QuoteComparisonModal.tsx`
25. `src/components/shared/RevisionHistory.tsx`
26. `src/db/ConfigurationMatrixRepository.ts`
27. `src/db/DatabaseAdapter.ts`
28. `src/db/SupabaseAdapter.ts`
29. `src/db/interfaces.ts`
30. `src/db/repositories.ts`
31. `src/engine/calculationEngine.ts`
32. `src/engine/commissionEngine.ts`
33. `src/hooks/useApprovalNotifications.tsx`
34. `src/hooks/useAutoSave.ts`
35. `src/hooks/useCompanyMerge.ts`
36. `src/hooks/useConfigurationMatrix.ts`
37. `src/hooks/useNotifications.ts`
38. `src/hooks/usePipelineMetrics.ts`
39. `src/hooks/usePresence.ts`
40. `src/hooks/usePriceList.ts`
41. `src/hooks/usePricingConfig.ts`
42. `src/hooks/useQuoteLock.ts`
43. `src/hooks/useQuotes.ts`
44. `src/hooks/useRealtimeQuote.ts`
45. `src/hooks/useReportingData.ts`
46. `src/lib/supabase.ts`
47. `src/pdf/generatePDF.tsx`
48. `src/store/useAuthStore.ts`
49. `src/store/useConfigStore.ts`
50. `src/store/useQuoteStore.ts`
51. `src/types/notifications.ts`
52. `src/utils/notificationHelpers.ts`
53. `vite.config.ts`

## Inventory Result

Inventory is consistent with cutover scope and includes extra cleanup edits beyond the minimum planned list.
