/**
 * Live Presence Hook
 *
 * Tracks and displays who is currently viewing each quote in real-time.
 * Uses Supabase real-time channels for live updates.
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase, FEATURES, CONFIG } from '../lib/supabase';
import { logger } from '../utils/logger';

export interface Viewer {
  userId: string;
  userName: string;
  userEmail: string;
  lastSeen: Date;
}

/**
 * Track presence on a quote
 *
 * @param quoteId - Quote ID to track presence on
 * @param enabled - Whether to enable presence tracking (default: true)
 */
export function usePresence(quoteId: string, enabled: boolean = true) {
  const { user } = useAuthStore();
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (!user || !enabled || !FEATURES.presence) {
      return;
    }

    let heartbeatInterval: NodeJS.Timeout | null = null;
    let channel: any = null;
    let handleVisibility: (() => void) | null = null;

    const startPresence = async () => {
      setIsTracking(true);

      // Update presence in database
      const updatePresence = async () => {
        try {
          await supabase.from('quote_presence').upsert({
            quote_id: quoteId,
            user_id: user.id,
            last_seen_at: new Date().toISOString(),
          });
        } catch (error) {
          logger.error('Failed to update presence:', error);
        }
      };

      // Initial presence update
      await updatePresence();

      // Set up heartbeat (update every 30 seconds)
      heartbeatInterval = setInterval(updatePresence, CONFIG.presenceHeartbeatMs);

      // Pause heartbeat when tab is hidden, resume on return
      handleVisibility = () => {
        if (document.hidden) {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
        } else {
          updatePresence();
          heartbeatInterval = setInterval(updatePresence, CONFIG.presenceHeartbeatMs);
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);

      // Subscribe to presence changes via real-time channel
      channel = supabase.channel(`quote-presence:${quoteId}`)
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const viewers: Viewer[] = [];

          Object.keys(state).forEach((key) => {
            const presences = state[key];
            presences.forEach((presence: any) => {
              if (presence.user_id !== user.id) {
                viewers.push({
                  userId: presence.user_id,
                  userName: presence.user_name || 'Unknown User',
                  userEmail: presence.user_email || '',
                  lastSeen: new Date(presence.last_seen_at || Date.now()),
                });
              }
            });
          });

          setViewers(viewers);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            logger.debug('Presence tracking active for quote:', quoteId);

            // Track our own presence
            await channel.track({
              user_id: user.id,
              user_name: user.fullName,
              user_email: user.email,
              last_seen_at: new Date().toISOString(),
            });
          }
        });
    };

    startPresence();

    // Cleanup on unmount
    return () => {
      setIsTracking(false);

      // Remove visibility listener
      if (handleVisibility) {
        document.removeEventListener('visibilitychange', handleVisibility);
      }

      // Clear heartbeat
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      // Unsubscribe from channel
      if (channel) {
        channel.unsubscribe();
      }

      // Remove presence from database
      Promise.resolve(
        supabase
          .from('quote_presence')
          .delete()
          .eq('quote_id', quoteId)
          .eq('user_id', user.id)
      )
        .then(() => logger.debug('Presence removed'))
        .catch((err: Error) => logger.error('Failed to remove presence:', err));
    };
  }, [quoteId, user, enabled]);

  return {
    viewers,
    isTracking,
    viewerCount: viewers.length,
  };
}

/**
 * Hook to show presence indicator
 */
export function usePresenceIndicator(quoteId: string) {
  const { viewers, viewerCount } = usePresence(quoteId);

  const getPresenceText = () => {
    if (viewerCount === 0) return null;
    if (viewerCount === 1) return `${viewers[0].userName} is viewing`;
    if (viewerCount === 2) return `${viewers[0].userName} and 1 other viewing`;
    return `${viewers[0].userName} and ${viewerCount - 1} others viewing`;
  };

  return {
    viewers,
    viewerCount,
    presenceText: getPresenceText(),
  };
}
