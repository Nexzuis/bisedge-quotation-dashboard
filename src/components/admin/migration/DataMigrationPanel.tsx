/**
 * Data Migration Panel
 *
 * UI for migrating data from local IndexedDB to Supabase.
 * Shows progress, handles errors, validates results.
 */

import { useState } from 'react';
import { Database, Download, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import {
  migrateLocalDataToSupabase,
  downloadBackup,
  validateMigration,
  type MigrationProgress,
  type MigrationResult,
} from '../../../utils/migrateToSupabase';
import { toast } from 'sonner';

export function DataMigrationPanel() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  const handleDownloadBackup = async () => {
    try {
      await downloadBackup();
    } catch (error) {
      toast.error('Backup failed');
    }
  };

  const handleMigrate = async () => {
    if (!confirm('Are you sure you want to migrate all local data to Supabase?\n\nThis will:\n- Export all quotes, customers, and config\n- Import to Supabase cloud database\n- Take 1-5 minutes depending on data size\n\nMake sure you have a backup first!')) {
      return;
    }

    setIsMigrating(true);
    setResult(null);
    setValidationResult(null);

    try {
      const migrationResult = await migrateLocalDataToSupabase(setProgress);
      setResult(migrationResult);

      if (migrationResult.success) {
        toast.success('Migration completed successfully!', {
          description: `${migrationResult.summary.quotes.imported} quotes, ${migrationResult.summary.customers.imported} customers migrated`,
          duration: 10000,
        });

        // Run validation
        const validation = await validateMigration();
        setValidationResult(validation);
      } else {
        toast.error('Migration completed with errors', {
          description: `${migrationResult.errors.length} errors occurred`,
          duration: 10000,
        });
      }
    } catch (error) {
      toast.error('Migration failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleValidate = async () => {
    setValidationResult(null);
    toast.info('Validating migration...');

    try {
      const validation = await validateMigration();
      setValidationResult(validation);

      if (validation.isValid) {
        toast.success('Validation passed!', {
          description: 'All data migrated correctly',
        });
      } else {
        toast.warning('Validation issues found', {
          description: 'Check details below',
        });
      }
    } catch (error) {
      toast.error('Validation failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-surface-800 flex items-center gap-2">
          <Database className="w-6 h-6" />
          Data Migration
        </h2>
        <p className="text-surface-500 text-sm mt-1">
          Migrate your local IndexedDB data to Supabase cloud database
        </p>
      </div>

      {/* Warning Box */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800 mb-1">Before You Migrate</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>✅ Create a backup first (click "Download Backup" below)</li>
              <li>✅ Ensure you have a stable internet connection</li>
              <li>✅ Close all other browser tabs with this app open</li>
              <li>✅ Make sure you're logged into Supabase</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={handleDownloadBackup}
          disabled={isMigrating}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Download Backup
        </button>

        <button
          onClick={handleMigrate}
          disabled={isMigrating}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMigrating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Migrating...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Start Migration
            </>
          )}
        </button>

        <button
          onClick={handleValidate}
          disabled={isMigrating || !result}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle className="w-4 h-4" />
          Validate
        </button>
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className="bg-white border border-surface-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-surface-700">{progress.stage}</span>
            <span className="text-sm text-surface-500">
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-surface-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-xs text-surface-500">{progress.message}</p>
        </div>
      )}

      {/* Migration Result */}
      {result && (
        <div
          className={`border-2 rounded-lg p-4 ${
            result.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <h3
            className={`font-semibold mb-3 flex items-center gap-2 ${
              result.success ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {result.success ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Migration Successful!
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5" />
                Migration Completed with Errors
              </>
            )}
          </h3>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-surface-500">Quotes</p>
              <p className="text-lg font-semibold text-surface-800">
                {result.summary.quotes.imported} / {result.summary.quotes.exported}
              </p>
              {result.summary.quotes.failed > 0 && (
                <p className="text-xs text-red-600">{result.summary.quotes.failed} failed</p>
              )}
            </div>
            <div>
              <p className="text-xs text-surface-500">Customers</p>
              <p className="text-lg font-semibold text-surface-800">
                {result.summary.customers.imported} / {result.summary.customers.exported}
              </p>
              {result.summary.customers.failed > 0 && (
                <p className="text-xs text-red-600">{result.summary.customers.failed} failed</p>
              )}
            </div>
            <div>
              <p className="text-xs text-surface-500">Config</p>
              <p className="text-lg font-semibold text-surface-800">
                {result.summary.config.imported} / {result.summary.config.exported}
              </p>
            </div>
          </div>

          <p className="text-xs text-surface-600">
            Duration: {(result.duration / 1000).toFixed(1)}s
          </p>

          {result.errors.length > 0 && (
            <div className="mt-3 p-3 bg-red-100 rounded text-xs">
              <p className="font-semibold text-red-800 mb-1">Errors:</p>
              <ul className="list-disc list-inside space-y-1 text-red-700">
                {result.errors.slice(0, 10).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {result.errors.length > 10 && (
                  <li>... and {result.errors.length - 10} more errors</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Validation Result */}
      {validationResult && (
        <div
          className={`border-2 rounded-lg p-4 ${
            validationResult.isValid
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}
        >
          <h3
            className={`font-semibold mb-3 ${
              validationResult.isValid ? 'text-green-800' : 'text-yellow-800'
            }`}
          >
            {validationResult.isValid ? '✅ Validation Passed' : '⚠️ Validation Issues'}
          </h3>
          <ul className="text-sm space-y-1">
            {validationResult.details.map((detail: string, i: number) => (
              <li key={i} className="text-surface-700">
                {detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-surface-50 border border-surface-200 rounded-lg p-4">
        <h3 className="font-semibold text-surface-800 mb-2">Migration Steps</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-surface-600">
          <li>Click "Download Backup" to save a local copy (safety first!)</li>
          <li>Ensure you're logged into Supabase cloud mode</li>
          <li>Click "Start Migration" and wait for completion</li>
          <li>Click "Validate" to verify all data migrated correctly</li>
          <li>If validation passes, you can safely delete local data (optional)</li>
        </ol>
      </div>
    </div>
  );
}
