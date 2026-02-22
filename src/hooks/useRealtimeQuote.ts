/**
 * Real-Time Quote Updates Hook
 *
 * Subscribes to quote changes and automatically refreshes when other users edit.
 * Prevents editing conflicts and keeps all users in sync.
 *
 * Sprint 2.4: Added module-level channel registry to prevent duplicate channels
 * for the same quote, with a maximum of 5 concurrent channels (oldest evicted
 * when the cap is breached).
 */

import { useEffect, useCallback, useRef } from 'react';
import { useQuoteStore } from '../store/useQuoteStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase, FEATURES } from '../lib/supabase';
import { getDb } from '../db/DatabaseAdapter';
import { toast } from 'sonner';
import { logger } from '../utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Module-level channel registry ────────────────────────────────────────────
//
// Keyed by quoteId. Prevents multiple React renders from opening duplicate
// Supabase channels to the same quote — each channel costs a server-side
// connection slot.

const MAX_CONCURRENT_CHANNELS = 5;

interface RegistryEntry {
  channel: RealtimeChannel;
  /** Monotonically increasing counter used to evict the oldest entry. */
  createdAt: number;
  /** Number of hook instances currently using this channel. */
  refCount: number;
}

const channelRegistry = new Map<string, RegistryEntry>();
let registrySequence = 0;

/**
 * Evict the oldest channel when MAX_CONCURRENT_CHANNELS is exceeded.
 * Logs the eviction so it surfaces in debug builds.
 */
function evictOldestIfNeeded(): void {
  if (channelRegistry.size < MAX_CONCURRENT_CHANNELS) return;

  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  channelRegistry.forEach((entry, key) => {
    if (entry.createdAt < oldestTime) {
      oldestTime = entry.createdAt;
      oldestKey = key;
    }
  });

  if (oldestKey !== null) {
    const entry = channelRegistry.get(oldestKey)!;
    logger.debug(
      `[useRealtimeQuote] Evicting oldest channel (quoteId=${oldestKey}, refCount=${entry.refCount})`
    );
    entry.channel.unsubscribe();
    channelRegistry.delete(oldestKey);
  }
}

/**
 * Acquire a channel for the given quoteId.
 * Returns an existing channel if one is already registered; otherwise creates
 * a new one after evicting the oldest entry if the cap would be exceeded.
 */
function acquireChannel(quoteId: string, handleRemoteUpdate: (payload: any) => void): RealtimeChannel {
  const existing = channelRegistry.get(quoteId);
  if (existing) {
    existing.refCount += 1;
    logger.debug(`[useRealtimeQuote] Reusing existing channel for quote ${quoteId} (refCount=${existing.refCount})`);
    return existing.channel;
  }

  // Evict if we are at capacity before creating the new entry
  evictOldestIfNeeded();

  logger.debug(`[useRealtimeQuote] Creating new channel for quote ${quoteId}`);

  const channel = supabase
    .channel(`quote-updates:${quoteId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'quotes',
        filter: `id=eq.${quoteId}`,
      },
      handleRemoteUpdate
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.debug('[useRealtimeQuote] Real-time updates active for quote:', quoteId);
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('[useRealtimeQuote] Real-time subscription error for quote:', quoteId);
      }
    });

  channelRegistry.set(quoteId, {
    channel,
    createdAt: ++registrySequence,
    refCount: 1,
  });

  return channel;
}

/**
 * Release a channel for the given quoteId.
 * If refCount reaches zero the channel is unsubscribed and removed from the
 * registry; otherwise only the refCount is decremented.
 */
function releaseChannel(quoteId: string): void {
  const entry = channelRegistry.get(quoteId);
  if (!entry) return;

  entry.refCount -= 1;
  logger.debug(`[useRealtimeQuote] Released channel for quote ${quoteId} (refCount=${entry.refCount})`);

  if (entry.refCount <= 0) {
    logger.debug(`[useRealtimeQuote] Unsubscribing channel for quote ${quoteId}`);
    entry.channel.unsubscribe();
    channelRegistry.delete(quoteId);
  }
}

// ─── Hook: useRealtimeQuote ───────────────────────────────────────────────────

/**
 * Subscribe to real-time updates for a specific quote
 *
 * @param quoteId - Quote ID to watch for changes
 * @param enabled - Whether to enable real-time updates (default: true)
 */
export function useRealtimeQuote(quoteId: string, enabled: boolean = true) {
  const { user } = useAuthStore();
  const loadQuote = useQuoteStore((state) => state.loadQuote);
  const currentVersion = useQuoteStore((state) => state.version);

  const handleRemoteUpdate = useCallback(
    async (payload: any) => {
      logger.debug('Remote update detected for quote:', quoteId);

      // Don't reload if we made the change
      if (payload.new.updated_by === user?.id) {
        logger.debug('Update was made by us, skipping reload');
        return;
      }

      // Check version
      const remoteVersion = payload.new.version;
      if (remoteVersion <= currentVersion) {
        logger.debug('Remote version is not newer, skipping reload');
        return;
      }

      // Load updated quote
      try {
        const db = getDb();
        const updatedQuote = await db.loadQuote(quoteId);

        if (updatedQuote) {
          // Bug #3 fix: check if the user has unsaved local changes before overwriting
          const storeState = useQuoteStore.getState();
          const hasLocalChanges = storeState.updatedAt.getTime() > (storeState as any)._lastSavedAt.getTime();

          if (hasLocalChanges) {
            // Show conflict prompt instead of silently overwriting
            toast.warning('Remote changes detected', {
              description: 'Another user modified this quote. What would you like to do?',
              action: {
                label: 'Reload Remote',
                onClick: () => {
                  loadQuote(updatedQuote);
                  toast.success('Quote reloaded with remote changes');
                },
              },
              duration: 15000,
            });
          } else {
            // No local changes — safe to auto-reload
            logger.debug('Quote reloaded from remote update');
            loadQuote(updatedQuote);

            toast.info('Quote updated remotely', {
              description: 'Refreshed to latest version',
              duration: 3000,
            });
          }
        }
      } catch (error) {
        logger.error('Failed to reload quote after remote update:', error);
        toast.error('Failed to sync remote changes');
      }
    },
    [quoteId, user, currentVersion, loadQuote]
  );

  // Keep a stable ref to handleRemoteUpdate so the registry entry never needs
  // to be rebuilt just because the callback identity changed
  const handleRemoteUpdateRef = useRef(handleRemoteUpdate);
  useEffect(() => {
    handleRemoteUpdateRef.current = handleRemoteUpdate;
  }, [handleRemoteUpdate]);

  useEffect(() => {
    if (!enabled || !FEATURES.realtime || !quoteId) {
      return;
    }

    logger.debug('Setting up real-time subscription for quote:', quoteId);

    // Wrap the ref so the channel always calls the latest handler without
    // needing to be recreated when the callback identity changes
    const stableHandler = (payload: any) => handleRemoteUpdateRef.current(payload);

    acquireChannel(quoteId, stableHandler);

    return () => {
      logger.debug('Releasing real-time subscription for quote:', quoteId);
      releaseChannel(quoteId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId, enabled]);
}

// ─── Hook: useRealtimeQuoteList ───────────────────────────────────────────────

/**
 * Subscribe to real-time updates for quote list
 * Refreshes the list when any quote changes
 */
export function useRealtimeQuoteList(onUpdate?: () => void) {
  const { user } = useAuthStore();

  // Stabilize onUpdate via ref to prevent subscription churn
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!FEATURES.realtime || !user) {
      return;
    }

    logger.debug('Setting up real-time subscription for quote list');

    // Subscribe to all quote changes
    const subscription = supabase
      .channel('quote-list-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
        },
        (payload) => {
          logger.debug('Quote list update detected:', payload.eventType);

          if (onUpdateRef.current) {
            onUpdateRef.current();
          } else {
            toast.info('Quotes updated', {
              description: 'Refreshing list...',
              duration: 2000,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('Real-time list updates active');
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);
}
