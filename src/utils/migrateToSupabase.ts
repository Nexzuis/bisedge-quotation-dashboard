/**
 * Data Migration Utility
 *
 * Exports data from local IndexedDB and imports to Supabase.
 * Handles quotes, customers, users, and configuration data.
 */

import { db } from '../db/schema';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export interface MigrationProgress {
  stage: string;
  current: number;
  total: number;
  percentage: number;
  status: 'running' | 'success' | 'error';
  message: string;
}

export interface MigrationResult {
  success: boolean;
  summary: {
    quotes: { exported: number; imported: number; failed: number };
    customers: { exported: number; imported: number; failed: number };
    config: { exported: number; imported: number; failed: number };
  };
  errors: string[];
  duration: number;
}

/**
 * Export all local data to JSON (backup)
 */
export async function exportLocalDataToJSON(): Promise<{
  quotes: any[];
  customers: any[];
  commissionTiers: any[];
  residualCurves: any[];
  exportedAt: string;
}> {
  console.log('📦 Exporting local data to JSON...');

  const [quotes, customers, commissionTiers, residualCurves] = await Promise.all([
    db.quotes.toArray(),
    db.customers.toArray(),
    db.commissionTiers.toArray(),
    db.residualCurves.toArray(),
  ]);

  const exportData = {
    quotes,
    customers,
    commissionTiers,
    residualCurves,
    exportedAt: new Date().toISOString(),
  };

  console.log(`✅ Exported ${quotes.length} quotes, ${customers.length} customers`);

  return exportData;
}

/**
 * Download export as JSON file
 */
export async function downloadBackup(): Promise<void> {
  try {
    const data = await exportLocalDataToJSON();

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bisedge-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Backup downloaded!', {
      description: `${data.quotes.length} quotes backed up to JSON file`,
    });
  } catch (error) {
    console.error('Export failed:', error);
    toast.error('Export failed', {
      description: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Migrate all local data to Supabase
 */
export async function migrateLocalDataToSupabase(
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationResult> {
  const startTime = Date.now();
  const result: MigrationResult = {
    success: false,
    summary: {
      quotes: { exported: 0, imported: 0, failed: 0 },
      customers: { exported: 0, imported: 0, failed: 0 },
      config: { exported: 0, imported: 0, failed: 0 },
    },
    errors: [],
    duration: 0,
  };

  try {
    console.log('🚀 Starting migration to Supabase...');

    // Stage 1: Export local data
    onProgress?.({
      stage: 'Exporting local data',
      current: 0,
      total: 100,
      percentage: 0,
      status: 'running',
      message: 'Reading data from IndexedDB...',
    });

    const localData = await exportLocalDataToJSON();
    result.summary.quotes.exported = localData.quotes.length;
    result.summary.customers.exported = localData.customers.length;

    // Stage 2: Migrate customers first (quotes depend on them)
    onProgress?.({
      stage: 'Migrating customers',
      current: 0,
      total: localData.customers.length,
      percentage: 10,
      status: 'running',
      message: `Importing ${localData.customers.length} customers...`,
    });

    for (let i = 0; i < localData.customers.length; i++) {
      const customer = localData.customers[i];

      try {
        const { error } = await supabase.from('customers').upsert({
          id: customer.id,
          name: customer.name,
          contact_person: customer.contactPerson,
          contact_email: customer.email,
          contact_phone: customer.phone,
          address: JSON.stringify(customer.address),
          created_at: customer.createdAt,
          updated_at: customer.updatedAt,
        });

        if (error) {
          result.errors.push(`Customer ${customer.name}: ${error.message}`);
          result.summary.customers.failed++;
        } else {
          result.summary.customers.imported++;
        }

        onProgress?.({
          stage: 'Migrating customers',
          current: i + 1,
          total: localData.customers.length,
          percentage: 10 + (i / localData.customers.length) * 20,
          status: 'running',
          message: `Imported ${i + 1} of ${localData.customers.length} customers`,
        });
      } catch (error) {
        result.errors.push(
          `Customer ${customer.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        result.summary.customers.failed++;
      }
    }

    // Stage 3: Migrate quotes
    onProgress?.({
      stage: 'Migrating quotes',
      current: 0,
      total: localData.quotes.length,
      percentage: 30,
      status: 'running',
      message: `Importing ${localData.quotes.length} quotes...`,
    });

    // Get current user to assign as creator
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    const creatorId = currentUser?.id || 'unknown';

    for (let i = 0; i < localData.quotes.length; i++) {
      const quote = localData.quotes[i];

      try {
        const { error } = await supabase.from('quotes').upsert({
          id: quote.id,
          quote_ref: quote.quoteRef,
          version: quote.version,
          status: quote.status,
          created_by: creatorId, // Assign to current user
          client_name: quote.clientName,
          contact_name: quote.contactName,
          contact_email: quote.contactEmail,
          contact_phone: quote.contactPhone,
          client_address: JSON.stringify(quote.clientAddress),
          factory_roe: quote.factoryROE,
          customer_roe: quote.customerROE,
          discount_pct: quote.discountPct,
          annual_interest_rate: quote.annualInterestRate,
          default_lease_term_months: quote.defaultLeaseTermMonths,
          battery_chemistry_lock: quote.batteryChemistryLock,
          quote_type: quote.quoteType,
          slots: quote.slots, // Already JSON string
          override_irr: quote.overrideIRR,
          current_assignee_id: quote.currentAssigneeId || null,
          current_assignee_role: quote.currentAssigneeRole || null,
          approval_chain: quote.approvalChain || '[]',
          quote_date: quote.quoteDate,
          created_at: quote.createdAt,
          updated_at: quote.updatedAt,
        });

        if (error) {
          result.errors.push(`Quote ${quote.quoteRef}: ${error.message}`);
          result.summary.quotes.failed++;
        } else {
          result.summary.quotes.imported++;
        }

        onProgress?.({
          stage: 'Migrating quotes',
          current: i + 1,
          total: localData.quotes.length,
          percentage: 30 + (i / localData.quotes.length) * 50,
          status: 'running',
          message: `Imported ${i + 1} of ${localData.quotes.length} quotes`,
        });
      } catch (error) {
        result.errors.push(
          `Quote ${quote.quoteRef}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        result.summary.quotes.failed++;
      }
    }

    // Stage 4: Migrate configuration
    onProgress?.({
      stage: 'Migrating configuration',
      current: 0,
      total: 3,
      percentage: 80,
      status: 'running',
      message: 'Importing commission tiers, residual curves...',
    });

    // Commission tiers
    for (const tier of localData.commissionTiers) {
      try {
        const { error } = await supabase.from('commission_tiers').upsert({
          min_margin: tier.minMargin,
          max_margin: tier.maxMargin,
          commission_pct: tier.commissionRate,
        });

        if (!error) result.summary.config.imported++;
      } catch (error) {
        result.summary.config.failed++;
      }
    }

    // Residual curves
    for (const curve of localData.residualCurves) {
      try {
        const { error } = await supabase.from('residual_curves').upsert({
          chemistry: curve.chemistry,
          term_36: curve.term36,
          term_48: curve.term48,
          term_60: curve.term60,
          term_72: curve.term72,
          term_84: curve.term84,
        });

        if (!error) result.summary.config.imported++;
      } catch (error) {
        result.summary.config.failed++;
      }
    }

    result.summary.config.exported =
      localData.commissionTiers.length +
      localData.residualCurves.length;

    // Complete
    result.duration = Date.now() - startTime;
    result.success = result.errors.length === 0;

    onProgress?.({
      stage: 'Complete',
      current: 100,
      total: 100,
      percentage: 100,
      status: result.success ? 'success' : 'error',
      message: result.success
        ? 'Migration completed successfully!'
        : 'Migration completed with errors',
    });

    return result;
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');

    onProgress?.({
      stage: 'Failed',
      current: 0,
      total: 100,
      percentage: 0,
      status: 'error',
      message: 'Migration failed',
    });

    return result;
  }
}

/**
 * Validate migration success
 */
export async function validateMigration(): Promise<{
  isValid: boolean;
  checks: Record<string, boolean>;
  details: string[];
}> {
  const checks: Record<string, boolean> = {};
  const details: string[] = [];

  try {
    // Check quotes count
    const localQuotesCount = await db.quotes.count();
    const { count: cloudQuotesCount } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true });

    checks.quotes = cloudQuotesCount === localQuotesCount;
    details.push(
      `Quotes: Local=${localQuotesCount}, Cloud=${cloudQuotesCount} ${checks.quotes ? '✅' : '❌'}`
    );

    // Check customers count
    const localCustomersCount = await db.customers.count();
    const { count: cloudCustomersCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    checks.customers = cloudCustomersCount === localCustomersCount;
    details.push(
      `Customers: Local=${localCustomersCount}, Cloud=${cloudCustomersCount} ${checks.customers ? '✅' : '❌'}`
    );

    const isValid = Object.values(checks).every((check) => check);

    return {
      isValid,
      checks,
      details,
    };
  } catch (error) {
    return {
      isValid: false,
      checks: {},
      details: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}
