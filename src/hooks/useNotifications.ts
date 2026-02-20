/**
 * useNotifications
 *
 * Provides notification data and mutation helpers for the current user.
 * Reads/writes via the DatabaseAdapter.
 * Auto-refreshes every 60 seconds. Pauses when tab is hidden.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../components/auth/AuthContext';
import { getDb } from '../db/DatabaseAdapter';
import type { StoredNotification } from '../types/notifications';

const REFRESH_INTERVAL_MS = 60000;
const MAX_RECENT = 20; // notifications shown in the dropdown

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      console.error('[useNotifications] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetchNotifications();

    intervalRef.current = setInterval(fetchNotifications, REFRESH_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        fetchNotifications();
        intervalRef.current = setInterval(fetchNotifications, REFRESH_INTERVAL_MS);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchNotifications]);

  // ─── Mutations ───────────────────────────────────────────────────────────

  const markAsRead = useCallback(
    async (id: string): Promise<void> => {
      try {
        await getDb().markNotificationRead(id);
        await fetchNotifications();
      } catch (err) {
        console.error('[useNotifications] markAsRead error:', err);
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
      console.error('[useNotifications] markAllAsRead error:', err);
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
        await fetchNotifications();
      } catch (err) {
        console.error('[useNotifications] createNotification error:', err);
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
