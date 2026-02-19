/**
 * Supabase Connection Test Page
 *
 * Access this at: http://localhost:5173/test-supabase
 * Use this to verify your Supabase configuration is working
 */

import { useState } from 'react';
import { runAllTests, type ConnectionTestResult } from '../utils/testSupabaseConnection';
import { isSupabaseConfigured } from '../lib/supabase';

export default function SupabaseTestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    connection: ConnectionTestResult;
    schema: ConnectionTestResult;
    rls: ConnectionTestResult;
    overall: boolean;
  } | null>(null);

  const handleRunTests = async () => {
    setIsRunning(true);
    setResults(null);

    try {
      const testResults = await runAllTests();
      setResults(testResults);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const ResultBox = ({ result, title }: { result: ConnectionTestResult; title: string }) => (
    <div className={`p-4 rounded-lg border-2 ${result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{result.success ? '✅' : '❌'}</span>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-gray-700 mb-2">{result.message}</p>
      {result.error && (
        <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
          <strong>Error:</strong> {result.error}
        </div>
      )}
      {result.details && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
          <strong>Details:</strong>
          <pre className="mt-1 overflow-auto">{JSON.stringify(result.details, null, 2)}</pre>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Supabase Connection Test</h1>
          <p className="text-gray-600 mb-6">
            Verify your Supabase configuration is working correctly
          </p>

          {/* Environment Info */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold mb-2">Current Configuration</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <strong>App Mode:</strong> <code className="bg-blue-100 px-2 py-1 rounded">cloud</code>
              </div>
              <div>
                <strong>Supabase Configured:</strong>{' '}
                <span className={isSupabaseConfigured() ? 'text-green-600' : 'text-red-600'}>
                  {isSupabaseConfigured() ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div className="col-span-2">
                <strong>Supabase URL:</strong>{' '}
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {import.meta.env.VITE_SUPABASE_URL || 'Not set'}
                </code>
              </div>
              <div className="col-span-2">
                <strong>Anon Key:</strong>{' '}
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {import.meta.env.VITE_SUPABASE_ANON_KEY
                    ? `${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...`
                    : 'Not set'}
                </code>
              </div>
            </div>
          </div>

          {/* Run Tests Button */}
          <div className="mb-6">
            <button
              onClick={handleRunTests}
              disabled={isRunning}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Running Tests...
                </span>
              ) : (
                '🚀 Run Connection Tests'
              )}
            </button>
          </div>

          {/* Test Results */}
          {results && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border-2 ${results.overall ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}>
                <h2 className="text-xl font-bold mb-2">
                  {results.overall ? '🎉 All Tests Passed!' : '⚠️ Some Tests Failed'}
                </h2>
                <p className="text-sm">
                  {results.overall
                    ? 'Your Supabase connection is configured correctly and ready to use!'
                    : 'Please review the test results below and fix any issues.'}
                </p>
              </div>

              <ResultBox result={results.connection} title="Connection Test" />
              <ResultBox result={results.schema} title="Database Schema" />
              <ResultBox result={results.rls} title="Row-Level Security" />

              {!results.overall && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">💡 Troubleshooting Tips</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>
                      If connection failed: Check your <code>.env.local</code> file has correct credentials
                    </li>
                    <li>
                      If schema failed: Apply the schema section from <code>Project documentation/SUPABASE_MASTER_CURRENT_STATE.sql</code>
                    </li>
                    <li>
                      If RLS warning: Apply/verify the policy sections in <code>Project documentation/SUPABASE_MASTER_CURRENT_STATE.sql</code>
                    </li>
                    <li>
                      Make sure to restart your dev server after changing <code>.env.local</code>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {!results && !isRunning && (
            <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 mt-6">
              <h3 className="font-semibold mb-2">📝 Before Running Tests</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Ensure you have applied the required sections from <code>Project documentation/SUPABASE_MASTER_CURRENT_STATE.sql</code></li>
                <li>Update <code>.env.local</code> with your Supabase credentials</li>
                <li>Restart your dev server: <code>npm run dev</code></li>
                <li>Click the button above to run tests</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
