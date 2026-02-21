/**
 * Supabase Client Configuration
 *
 * This module initializes the Supabase client with authentication
 * and real-time subscriptions configured.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Bug #29 fix: collect missing env var messages instead of throwing
const missingEnvVars: string[] = [];

if (!supabaseUrl) {
  missingEnvVars.push(
    'Missing VITE_SUPABASE_URL environment variable. ' +
    'Please add it to your .env.local file. ' +
    'Get this value from: https://supabase.com/dashboard → Your Project → Settings → API'
  );
}

if (!supabaseAnonKey) {
  missingEnvVars.push(
    'Missing VITE_SUPABASE_ANON_KEY environment variable. ' +
    'Please add it to your .env.local file. ' +
    'Get this value from: https://supabase.com/dashboard → Your Project → Settings → API'
  );
}

/** Error message if env vars are missing, null otherwise */
export const supabaseConfigError: string | null =
  missingEnvVars.length > 0 ? missingEnvVars.join('\n') : null;

/**
 * Supabase client instance
 * Type-safe with Database schema types
 *
 * Will be a real client when env vars are present, or a dummy/null when missing.
 */
export const supabase: SupabaseClient<Database> = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Persist session in localStorage for automatic login
        persistSession: true,

        // Automatically refresh tokens when they expire
        autoRefreshToken: true,

        // Detect session changes (login/logout) in other tabs
        detectSessionInUrl: true,

        // Flow type for PKCE authentication
        flowType: 'pkce',
      },

      realtime: {
        params: {
          // Limit events per second to avoid overwhelming the client
          eventsPerSecond: 10,
        },
      },

      global: {
        headers: {
          // Add custom headers if needed
        },
      },
    })
  // Provide a placeholder that will never be used — App.tsx shows an error screen
  : (null as unknown as SupabaseClient<Database>);

/**
 * Helper to check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://xxxxx.supabase.co' &&
    !supabaseAnonKey.includes('...')
  );
}

/**
 * Helper to get the current user session
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return session;
}

/**
 * Helper to get the current authenticated user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
}

/**
 * Feature flags
 */
export const FEATURES = {
  realtime: import.meta.env.VITE_ENABLE_REALTIME === 'true',
  presence: import.meta.env.VITE_ENABLE_PRESENCE === 'true',
};

/**
 * Configuration constants
 */
export const CONFIG = {
  presenceHeartbeatMs: parseInt(import.meta.env.VITE_PRESENCE_HEARTBEAT_MS || '30000'),
};
