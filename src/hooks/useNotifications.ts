/**
 * useNotifications
 *
 * Provides notification data and mutation helpers for the current user.
 * Reads/writes via the DatabaseAdapter.
 * Uses Supabase Realtime subscription for INSERT events on the notifications
 * table instead of polling every 60 seconds, which eliminates ~200 DB
 * queries/minute at 200 users. Pauses when tab is hidden.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../components/auth/AuthContext';
import { supabase, FEATURES } from '../lib/supabase';
import { getDb } from '../db/DatabaseAdapter';
import type { StoredNotification } from '../types/notifications';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const MAX_RECENT = 20; // notifications shown in the dropdown

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isActiveRef = useRef(true);

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setIsLoading(true);
    try {
      const all = await getDb().getNotifications(user.id);

      const recent = all.slice(0, MAX_RECENT);
      const unread = all.filter((n) => !n.isRead).length;

      setNotifications(recent);
      setUnreadCount(unread);
    } catch (err) {
      logger.error('[useNotifications] fetch error:', { error: err });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // ─── Subscribe / unsubscribe helpers ─────────────────────────────────────

  const subscribe = useCallback(() => {
    if (!user?.id || !FEATURES.realtime) return;
    if (channelRef.current) return; // Already subscribed

    logger.debug('[useNotifications] Setting up realtime subscription');

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          // Filter to only receive notifications for the current user
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          logger.debug('[useNotifications] New notification received', payload);
          // Re-fetch to get the fully-mapped StoredNotification shape via DatabaseAdapter
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Catches read-status updates (e.g. markAsRead from another tab)
          fetchNotifications();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('[useNotifications] Realtime subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('[useNotifications] Realtime subscription error');
        }
      });

    channelRef.current = channel;
  }, [user?.id, fetchNotifications]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      logger.debug('[useNotifications] Removing realtime subscription');
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }, []);

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  useEffect(() => {
    isActiveRef.current = true;

    // Initial fetch
    fetchNotifications();

    // Set up realtime subscription
    subscribe();

    // Pause subscription when tab hidden, resume on return (saves server resources)
    const handleVisibility = () => {
      if (document.hidden) {
        unsubscribe();
      } else {
        if (isActiveRef.current) {
          fetchNotifications();
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
  }, [fetchNotifications, subscribe, unsubscribe]);

  // ─── Mutations ───────────────────────────────────────────────────────────

  const markAsRead = useCallback(
    async (id: string): Promise<void> => {
      try {
        await getDb().markNotificationRead(id);
        await fetchNotifications();
      } catch (err) {
        logger.error('[useNotifications] markAsRead error:', { error: err });
      }
    },
    [fetchNotifications]
  );

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!user?.id) return;
    try {
      await getDb().markAllNotificationsRead(user.id);
      await fetchNotifications();
    } catch (err) {
      logger.error('[useNotifications] markAllAsRead error:', { error: err });
    }
  }, [user?.id, fetchNotifications]);

  const createNotification = useCallback(
    async (
      notification: Omit<StoredNotification, 'id' | 'createdAt' | 'isRead'>
    ): Promise<void> => {
      try {
        const record: StoredNotification = {
          ...notification,
          id: crypto.randomUUID(),
          isRead: false,
          createdAt: new Date().toISOString(),
        };

        await getDb().saveNotification(record);
        // Realtime INSERT event will trigger fetchNotifications automatically;
        // call explicitly here as a fallback for the non-realtime path
        await fetchNotifications();
      } catch (err) {
        logger.error('[useNotifications] createNotification error:', { error: err });
      }
    },
    [fetchNotifications]
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    createNotification,
    refresh: fetchNotifications,
  };
}
