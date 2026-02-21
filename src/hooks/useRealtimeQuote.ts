/**
 * Real-Time Quote Updates Hook
 *
 * Subscribes to quote changes and automatically refreshes when other users edit.
 * Prevents editing conflicts and keeps all users in sync.
 */

import { useEffect, useCallback } from 'react';
import { useQuoteStore } from '../store/useQuoteStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase, FEATURES } from '../lib/supabase';
import { getDb } from '../db/DatabaseAdapter';
import { toast } from 'sonner';
import { logger } from '../utils/logger';

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

  useEffect(() => {
    if (!enabled || !FEATURES.realtime || !quoteId) {
      return;
    }

    logger.debug('Setting up real-time subscription for quote:', quoteId);

    // Subscribe to changes on this specific quote
    const subscription = supabase
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
          logger.debug('Real-time updates active for quote:', quoteId);
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Real-time subscription error');
        }
      });

    return () => {
      logger.debug('Unsubscribing from real-time updates:', quoteId);
      subscription.unsubscribe();
    };
  }, [quoteId, enabled, handleRemoteUpdate]);
}

/**
 * Subscribe to real-time updates for quote list
 * Refreshes the list when any quote changes
 */
export function useRealtimeQuoteList(onUpdate?: () => void) {
  const { user } = useAuthStore();

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

          if (onUpdate) {
            onUpdate();
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
  }, [user, onUpdate]);
}
