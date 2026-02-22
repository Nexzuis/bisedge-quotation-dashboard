/**
 * useApprovalCount
 *
 * Shared hook for pending-approval + in-review quote count.
 * Uses Supabase Realtime postgres_changes subscription instead of polling,
 * which eliminates ~600 DB queries/minute at 200 users.
 * Pauses subscription when tab is hidden, resumes on return.
 * Consumed by CrmTopBar (badge) and optionally other components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../components/auth/AuthContext';
import { supabase, FEATURES } from '../lib/supabase';
import { ROLE_HIERARCHY, type Role } from '../auth/permissions';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

export function useApprovalCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isActiveRef = useRef(true);

  const roleLevel = ROLE_HIERARCHY[(user?.role || 'sales_rep') as Role] || 0;
  const isManager = roleLevel >= 2;

  // ─── Count fetch ─────────────────────────────────────────────────────────

  const loadCount = useCallback(async () => {
    if (!user || !isManager) return;
    try {
      // Server-side count queries — no client-side filtering needed
      let pendingQuery = supabase
        .from('quotes')
        .select('id', { count: 'exact' })
        .limit(0)
        .eq('status', 'pending-approval');

      let reviewQuery = supabase
        .from('quotes')
        .select('id', { count: 'exact' })
        .limit(0)
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

  // ─── Subscribe / unsubscribe helpers ─────────────────────────────────────

  const subscribe = useCallback(() => {
    if (!user || !isManager || !FEATURES.realtime) return;
    if (channelRef.current) return; // Already subscribed

    logger.debug('[useApprovalCount] Setting up realtime subscription');

    const channel = supabase
      .channel('approval-count-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quotes',
        },
        (payload) => {
          // Only recount when a status change involves the statuses we care about
          const oldStatus = (payload.old as { status?: string })?.status;
          const newStatus = (payload.new as { status?: string })?.status;
          const relevantStatuses = new Set(['pending-approval', 'in-review']);

          if (relevantStatuses.has(oldStatus ?? '') || relevantStatuses.has(newStatus ?? '')) {
            logger.debug('[useApprovalCount] Relevant status change detected, refreshing count');
            loadCount();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quotes',
        },
        (payload) => {
          const newStatus = (payload.new as { status?: string })?.status;
          if (newStatus === 'pending-approval' || newStatus === 'in-review') {
            loadCount();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('[useApprovalCount] Realtime subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('[useApprovalCount] Realtime subscription error');
        }
      });

    channelRef.current = channel;
  }, [user, isManager, loadCount]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      logger.debug('[useApprovalCount] Removing realtime subscription');
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }, []);

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isManager) return;

    isActiveRef.current = true;

    // Initial fetch
    loadCount();

    // Set up realtime subscription
    subscribe();

    // Pause subscription when tab hidden, resume on return (saves server resources)
    const handleVisibility = () => {
      if (document.hidden) {
        unsubscribe();
      } else {
        if (isActiveRef.current) {
          loadCount();
          subscribe();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isActiveRef.current = false;
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadCount, isManager, subscribe, unsubscribe]);

  return { count, isManager, refresh: loadCount };
}
