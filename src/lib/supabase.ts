/**
 * Supabase Client Configuration
 *
 * This module initializes the Supabase client with authentication
 * and real-time subscriptions configured.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error(
    'Missing VITE_SUPABASE_URL environment variable. ' +
    'Please add it to your .env.local file. ' +
    'Get this value from: https://supabase.com/dashboard → Your Project → Settings → API'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY environment variable. ' +
    'Please add it to your .env.local file. ' +
    'Get this value from: https://supabase.com/dashboard → Your Project → Settings → API'
  );
}

/**
 * Supabase client instance
 * Type-safe with Database schema types
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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

  // Global options
  global: {
    headers: {
      // Add custom headers if needed
      // 'X-Client-Info': 'bisedge-quotation-dashboard',
    },
  },
});

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
 * App mode configuration
 */
export const APP_MODE = import.meta.env.VITE_APP_MODE || 'local';

/**
 * Feature flags
 */
export const FEATURES = {
  offline: import.meta.env.VITE_ENABLE_OFFLINE === 'true',
  realtime: import.meta.env.VITE_ENABLE_REALTIME === 'true',
  presence: import.meta.env.VITE_ENABLE_PRESENCE === 'true',
};

/**
 * Configuration constants
 */
export const CONFIG = {
  presenceHeartbeatMs: parseInt(import.meta.env.VITE_PRESENCE_HEARTBEAT_MS || '30000'),
  syncIntervalMs: parseInt(import.meta.env.VITE_SYNC_INTERVAL_MS || '5000'),
};

/**
 * Check if app is running in cloud mode
 */
export function isCloudMode(): boolean {
  return APP_MODE === 'cloud' || APP_MODE === 'hybrid';
}

/**
 * Check if app is running in local mode
 */
export function isLocalMode(): boolean {
  return APP_MODE === 'local' || APP_MODE === 'hybrid';
}

/**
 * Check if app is running in hybrid mode (both local and cloud)
 */
export function isHybridMode(): boolean {
  return APP_MODE === 'hybrid';
}
