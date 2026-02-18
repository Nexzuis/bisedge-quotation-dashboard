/**
 * Supabase Connection Test Utility
 *
 * Run this to verify your Supabase configuration is working correctly.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

/**
 * Test basic Supabase connectivity
 */
export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  console.log('🔍 Testing Supabase connection...');

  // Step 1: Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase not configured',
      error: 'Environment variables are missing or invalid. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local',
    };
  }

  console.log('✅ Environment variables configured');

  // Step 2: Test database connectivity
  try {
    console.log('🔗 Attempting to connect to database...');

    // Simple query to test connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      return {
        success: false,
        message: 'Database connection failed',
        error: error.message,
        details: error,
      };
    }

    console.log('✅ Database connection successful');

    // Step 3: Test authentication state
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      return {
        success: false,
        message: 'Auth session check failed',
        error: sessionError.message,
      };
    }

    console.log('✅ Auth system accessible');

    return {
      success: true,
      message: 'Supabase connection successful!',
      details: {
        authenticated: !!session,
        user: session?.user?.email || 'Not logged in',
      },
    };
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return {
      success: false,
      message: 'Unexpected error during connection test',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test database schema (verify tables exist)
 */
export async function testDatabaseSchema(): Promise<ConnectionTestResult> {
  console.log('🔍 Testing database schema...');

  try {
    const tablesToCheck = [
      'users',
      'customers',
      'quotes',
      'commission_tiers',
      'residual_curves',
      'companies',
      'contacts',
      'activities',
      'notifications',
      'templates',
      'settings',
      'price_list_series',
      'telematics_packages',
      'container_mappings',
      'configuration_matrices',
    ];

    const results: Record<string, boolean> = {};

    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase
          .from(table as any)
          .select('count')
          .limit(1);

        results[table] = !error;

        if (error) {
          console.warn(`⚠️ Table '${table}' not accessible:`, error.message);
        } else {
          console.log(`✅ Table '${table}' exists`);
        }
      } catch (err) {
        results[table] = false;
        console.warn(`⚠️ Error checking table '${table}':`, err);
      }
    }

    const allTablesExist = Object.values(results).every((exists) => exists);

    return {
      success: allTablesExist,
      message: allTablesExist
        ? 'All required tables exist'
        : 'Some tables are missing - did you run SUPABASE_SCHEMA.sql?',
      details: results,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Schema verification failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test RLS policies (Row-Level Security)
 */
export async function testRLSPolicies(): Promise<ConnectionTestResult> {
  console.log('🔍 Testing RLS policies...');

  try {
    // Test 1: Anonymous access (should be blocked)
    const { data: anonData, error: anonError } = await supabase
      .from('quotes')
      .select('count')
      .limit(1);

    // If we're not authenticated, we shouldn't be able to access quotes
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      if (anonError && anonError.message.includes('row-level security')) {
        console.log('✅ RLS blocking unauthenticated access correctly');
        return {
          success: true,
          message: 'RLS policies are active and protecting data',
        };
      } else if (!anonError) {
        console.warn('⚠️ Unauthenticated user can access data - RLS might not be configured');
        return {
          success: false,
          message: 'RLS policies may not be configured - run SUPABASE_RLS_POLICIES.sql',
        };
      }
    }

    return {
      success: true,
      message: 'RLS policies check completed',
      details: {
        authenticated: !!session,
        note: 'Full RLS testing requires authentication',
      },
    };
  } catch (error) {
    return {
      success: false,
      message: 'RLS policy test failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run all connection tests
 */
export async function runAllTests(): Promise<{
  connection: ConnectionTestResult;
  schema: ConnectionTestResult;
  rls: ConnectionTestResult;
  overall: boolean;
}> {
  console.log('🚀 Running Supabase connection tests...\n');

  const connection = await testSupabaseConnection();
  const schema = await testDatabaseSchema();
  const rls = await testRLSPolicies();

  const overall = connection.success && schema.success && rls.success;

  console.log('\n📊 Test Results:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Connection: ${connection.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Schema:     ${schema.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`RLS:        ${rls.success ? '✅ PASS' : '⚠️  CHECK'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Overall:    ${overall ? '✅ PASS' : '❌ FAIL'}\n`);

  return { connection, schema, rls, overall };
}
