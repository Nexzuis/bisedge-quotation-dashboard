/**
 * useConnectionStatus
 *
 * Monitors two distinct connectivity layers:
 *
 * 1. Browser online / offline state — reported by `navigator.onLine` and kept
 *    current via the `online` / `offline` window events.
 *
 * 2. Supabase reachability — periodically probes the Supabase project with a
 *    lightweight query (every 30 seconds while online). If the query fails for
 *    any reason the hook reports `isSupabaseReachable = false` and retries on
 *    the next scheduled tick.
 *
 * Usage:
 *   const { isOnline, isSupabaseReachable } = useConnectionStatus();
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

/** How often (in milliseconds) to ping Supabase when the browser is online. */
const PING_INTERVAL_MS = 30_000;

export interface ConnectionStatus {
  /** True when `navigator.onLine` reports an active network interface. */
  isOnline: boolean;
  /**
   * True when the most recent Supabase health check succeeded.
   * Resets to false immediately when the browser goes offline.
   * Undefined until the first probe has completed.
   */
  isSupabaseReachable: boolean;
}

/**
 * Hook that returns the current browser online state and Supabase reachability.
 *
 * The Supabase probe uses the lightest possible query: a `.limit(0)` select
 * against the `users` table (which exists in every BIS Edge project). This
 * produces a round-trip to PostgREST without fetching any data rows, and
 * exercises both the network path and Supabase's auth/RLS layer.
 *
 * The probe runs:
 *   - Once immediately on mount (if online).
 *   - Every 30 seconds while online (paused while the tab is hidden).
 *   - Once immediately when the browser regains network connectivity.
 *   - Stops when the browser goes offline (sets `isSupabaseReachable = false`).
 */
export function useConnectionStatus(): ConnectionStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSupabaseReachable, setIsSupabaseReachable] = useState<boolean>(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks whether a probe is already in flight to avoid concurrent pings.
  const isProbingRef = useRef(false);

  // ── Supabase probe ────────────────────────────────────────────────────────

  const pingSupabase = useCallback(async (): Promise<void> => {
    if (isProbingRef.current) return;
    if (!navigator.onLine) {
      setIsSupabaseReachable(false);
      return;
    }

    isProbingRef.current = true;
    try {
      // Lightweight query: fetch zero rows from `users`.
      // The table always exists in the BIS Edge schema.
      const { error } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .limit(0);

      if (error) {
        // A PostgREST / RLS error still means Supabase responded — it is
        // reachable. Only treat it as unreachable on a network-level failure.
        const isNetworkError =
          error.message?.toLowerCase().includes('fetch') ||
          error.message?.toLowerCase().includes('network') ||
          error.message?.toLowerCase().includes('failed to fetch');

        if (isNetworkError) {
          logger.warn('[useConnectionStatus] Supabase ping failed (network):', error.message);
          setIsSupabaseReachable(false);
        } else {
          // Auth/RLS/PostgREST error — Supabase is up, just rejecting the query.
          logger.debug('[useConnectionStatus] Supabase ping returned DB error (reachable):', error.message);
          setIsSupabaseReachable(true);
        }
      } else {
        setIsSupabaseReachable(true);
      }
    } catch (err) {
      // Thrown errors (TypeError from Fetch API) indicate a network failure.
      logger.warn('[useConnectionStatus] Supabase ping threw:', err);
      setIsSupabaseReachable(false);
    } finally {
      isProbingRef.current = false;
    }
  }, []);

  // ── Interval management ───────────────────────────────────────────────────

  const startPingInterval = useCallback(() => {
    if (intervalRef.current !== null) return; // already running
    intervalRef.current = setInterval(pingSupabase, PING_INTERVAL_MS);
  }, [pingSupabase]);

  const stopPingInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── Online / offline event handlers ──────────────────────────────────────

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Probe immediately when connectivity is restored, then resume interval.
      pingSupabase();
      startPingInterval();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSupabaseReachable(false);
      stopPingInterval();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pingSupabase, startPingInterval, stopPingInterval]);

  // ── Visibility-aware interval ─────────────────────────────────────────────
  // Pause the interval when the tab is hidden; resume (with an immediate ping)
  // when the user returns to the tab. This matches the pattern used by
  // useNotifications and useApprovalCount in this codebase.

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        stopPingInterval();
      } else if (navigator.onLine) {
        pingSupabase();
        startPingInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [pingSupabase, startPingInterval, stopPingInterval]);

  // ── Initial probe on mount ────────────────────────────────────────────────

  useEffect(() => {
    if (navigator.onLine && !document.hidden) {
      pingSupabase();
      startPingInterval();
    }

    return () => {
      stopPingInterval();
    };
  }, [pingSupabase, startPingInterval, stopPingInterval]);

  return { isOnline, isSupabaseReachable };
}
