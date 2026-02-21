/**
 * useApprovalCount
 *
 * Shared hook for pending-approval + in-review quote count.
 * Polls every 30 seconds, pauses when tab is hidden.
 * Consumed by CrmTopBar (badge) and optionally other components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../components/auth/AuthContext';
import { supabase } from '../lib/supabase';
import { ROLE_HIERARCHY, type Role } from '../auth/permissions';

const POLL_INTERVAL_MS = 30_000;

export function useApprovalCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const roleLevel = ROLE_HIERARCHY[(user?.role || 'sales_rep') as Role] || 0;
  const isManager = roleLevel >= 2;

  const loadCount = useCallback(async () => {
    if (!user || !isManager) return;
    try {
      // Server-side count queries — no client-side filtering needed
      let pendingQuery = supabase.from('quotes').select('id', { count: 'exact', head: true })
        .eq('status', 'pending-approval');
      let reviewQuery = supabase.from('quotes').select('id', { count: 'exact', head: true })
        .eq('status', 'in-review');

      // Server-side assignee filter for non-admins
      if (user.role !== 'system_admin') {
        pendingQuery = pendingQuery.eq('current_assignee_id', user.id);
        reviewQuery = reviewQuery.eq('current_assignee_id', user.id);
      }

      const [pendingResult, reviewResult] = await Promise.all([pendingQuery, reviewQuery]);
      const total = (pendingResult.count ?? 0) + (reviewResult.count ?? 0);
      setCount(total);
    } catch {
      // Non-critical — badge will show stale count
    }
  }, [user, isManager]);

  useEffect(() => {
    if (!isManager) return;
    loadCount();

    intervalRef.current = setInterval(loadCount, POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        loadCount();
        intervalRef.current = setInterval(loadCount, POLL_INTERVAL_MS);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadCount, isManager]);

  return { count, isManager, refresh: loadCount };
}
