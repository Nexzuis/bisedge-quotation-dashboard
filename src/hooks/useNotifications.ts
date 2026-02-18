/**
 * useNotifications
 *
 * Provides notification data and mutation helpers for the current user.
 * Reads/writes to the Dexie `notifications` table via the `db` singleton.
 * Auto-refreshes every 30 seconds.
 *
 * Prerequisites:
 *   - The `notifications` table must be added to BisedgeDatabase (see
 *     src/types/notifications.ts for the migration note).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../components/auth/AuthContext';
import { db } from '../db/schema';
import type { StoredNotification } from '../types/notifications';

const REFRESH_INTERVAL_MS = 30_000;
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
      // Cast through unknown because the table is added at runtime via schema
      // migration — TypeScript won't know about it until the schema file is
      // updated by the developer.
      const table = (db as unknown as Record<string, import('dexie').Table<StoredNotification, string>>)['notifications'];

      if (!table) {
        // Table not yet migrated — silently return empty state.
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const all = await table
        .where('userId')
        .equals(user.id)
        .reverse()
        .sortBy('createdAt');

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

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchNotifications]);

  // ─── Mutations ───────────────────────────────────────────────────────────

  const markAsRead = useCallback(
    async (id: string): Promise<void> => {
      try {
        const table = (db as unknown as Record<string, import('dexie').Table<StoredNotification, string>>)['notifications'];
        if (!table) return;

        await table.update(id, { isRead: true });
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
      const table = (db as unknown as Record<string, import('dexie').Table<StoredNotification, string>>)['notifications'];
      if (!table) return;

      const unread = await table
        .where('userId')
        .equals(user.id)
        .filter((n) => !n.isRead)
        .toArray();

      await Promise.all(unread.map((n) => table.update(n.id, { isRead: true })));
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
        const table = (db as unknown as Record<string, import('dexie').Table<StoredNotification, string>>)['notifications'];
        if (!table) return;

        const record: StoredNotification = {
          ...notification,
          id: crypto.randomUUID(),
          isRead: false,
          createdAt: new Date().toISOString(),
        };

        await table.add(record);
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
