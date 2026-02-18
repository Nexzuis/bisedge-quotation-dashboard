/**
 * Quote Locking Hook
 *
 * Manages quote locks to prevent concurrent editing by multiple users.
 * When a user opens a quote for editing, a lock is acquired.
 * Other users see the quote as read-only until the lock is released.
 */

import { useEffect, useState, useRef } from 'react';
import { useQuoteStore } from '../store/useQuoteStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase, isCloudMode } from '../lib/supabase';
import { toast } from 'sonner';

export interface QuoteLockStatus {
  isLocked: boolean;
  lockedBy: string | null;
  lockedByName: string | null;
  canEdit: boolean;
  hasLock: boolean;
}

/**
 * Acquire and manage quote lock
 *
 * @param quoteId - ID of the quote to lock
 * @param autoAcquire - Automatically acquire lock on mount (default: true)
 * @param autoRelease - Automatically release lock on unmount (default: true)
 */
export function useQuoteLock(
  quoteId: string,
  autoAcquire: boolean = true,
  autoRelease: boolean = true
): QuoteLockStatus {
  const { user } = useAuthStore();
  const { lockedBy, lockedAt, acquireLock, releaseLock, isLockedByOther, canEdit } = useQuoteStore();

  const [lockedByName, setLockedByName] = useState<string | null>(null);
  const [hasLock, setHasLock] = useState(false);
  const hasLockRef = useRef(false);

  useEffect(() => {
    hasLockRef.current = hasLock;
  }, [hasLock]);

  useEffect(() => {
    if (!user || !autoAcquire) return;

    const acquireQuoteLock = async () => {
      // Check if already locked
      if (isLockedByOther(user.id)) {
        // Someone else has the lock
        console.warn(`Quote ${quoteId} is locked by another user`);

        // Fetch the user's name who has the lock
        if (isCloudMode() && lockedBy) {
          try {
            const { data: lockOwner } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', lockedBy)
              .single();

            if (lockOwner) {
              setLockedByName(lockOwner.full_name);
              toast.warning('Quote is being edited', {
                description: `${lockOwner.full_name} is currently editing this quote`,
                duration: 5000,
              });
            }
          } catch (error) {
            console.error('Error fetching lock owner name:', error);
          }
        }

        setHasLock(false);
        return;
      }

      // Try to acquire lock
      const acquired = acquireLock(user.id);

      if (acquired) {
        console.log(`🔒 Lock acquired for quote ${quoteId}`);
        setHasLock(true);

        // Sync lock to cloud if in cloud/hybrid mode
        if (isCloudMode()) {
          try {
            await supabase
              .from('quotes')
              .update({
                locked_by: user.id,
                locked_at: new Date().toISOString(),
              })
              .eq('id', quoteId);

            console.log('☁️  Lock synced to cloud');
          } catch (error) {
            console.error('Failed to sync lock to cloud:', error);
          }
        }
      } else {
        console.warn(`❌ Failed to acquire lock for quote ${quoteId}`);
        setHasLock(false);
      }
    };

    acquireQuoteLock();

    // Release lock on unmount
    return () => {
      if (autoRelease && hasLockRef.current && user) {
        releaseLock(user.id);

        // Sync lock release to cloud
        if (isCloudMode()) {
          supabase
            .from('quotes')
            .update({
              locked_by: null,
              locked_at: null,
            })
            .eq('id', quoteId)
            .eq('locked_by', user.id)
            .then(() => console.log('☁️  Lock released from cloud'))
            .catch((err) => console.error('Failed to release lock from cloud:', err));
        }
      }
    };
  }, [quoteId, user, autoAcquire, autoRelease]);

  return {
    isLocked: !!lockedBy,
    lockedBy,
    lockedByName,
    canEdit: user ? canEdit(user.id) : false,
    hasLock,
  };
}

/**
 * Hook to manually control quote lock (no auto-acquire)
 */
export function useManualQuoteLock(quoteId: string) {
  const { user } = useAuthStore();
  const { acquireLock, releaseLock } = useQuoteStore();

  const handleAcquire = async () => {
    if (!user) return false;

    const acquired = acquireLock(user.id);

    if (acquired && isCloudMode()) {
      try {
        await supabase
          .from('quotes')
          .update({
            locked_by: user.id,
            locked_at: new Date().toISOString(),
          })
          .eq('id', quoteId);
      } catch (error) {
        console.error('Failed to sync lock:', error);
      }
    }

    return acquired;
  };

  const handleRelease = async () => {
    if (!user) return;

    releaseLock(user.id);

    if (isCloudMode()) {
      try {
        await supabase
          .from('quotes')
          .update({
            locked_by: null,
            locked_at: null,
          })
          .eq('id', quoteId)
          .eq('locked_by', user.id);
      } catch (error) {
        console.error('Failed to release lock:', error);
      }
    }
  };

  return {
    acquireLock: handleAcquire,
    releaseLock: handleRelease,
  };
}
