/**
 * Quote Locking Hook
 *
 * Manages quote locks to prevent concurrent editing by multiple users.
 * When a user opens a quote for editing, a lock is acquired.
 * Other users see the quote as read-only until the lock is released.
 */

import { useEffect, useState, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useQuoteStore } from '../store/useQuoteStore';
import { useAuthStore } from '../store/useAuthStore';
import { getDb } from '../db/DatabaseAdapter';
import { toast } from 'sonner';
import { logger } from '../utils/logger';

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
  const { lockedBy, lockedAt, acquireLock, releaseLock, isLockedByOther, canEdit } = useQuoteStore(
    useShallow((s) => ({
      lockedBy: s.lockedBy,
      lockedAt: s.lockedAt,
      acquireLock: s.acquireLock,
      releaseLock: s.releaseLock,
      isLockedByOther: s.isLockedByOther,
      canEdit: s.canEdit,
    }))
  );

  const [lockedByName, setLockedByName] = useState<string | null>(null);
  const [hasLock, setHasLock] = useState(false);
  const hasLockRef = useRef(false);

  useEffect(() => {
    hasLockRef.current = hasLock;
  }, [hasLock]);

  useEffect(() => {
    if (!user || !autoAcquire) return;

    // Bug #5 fix: capture user.id in a ref so the cleanup closure
    // always uses the ID that was active when the lock was acquired
    const capturedUserId = user.id;

    const acquireQuoteLock = async () => {
      // Best-effort stale presence cleanup (fallback when pg_cron is unavailable).
      // Runs as the service_role via RPC — if it fails (e.g. RPC not deployed yet)
      // we swallow the error and proceed; the lock flow is unaffected.
      try {
        await getDb().cleanupStalePresence();
      } catch {
        // Expected on free-tier where the RPC may not exist yet
      }

      // Check if already locked
      if (isLockedByOther(capturedUserId)) {
        // Someone else has the lock
        logger.warn(`Quote ${quoteId} is locked by another user`);

        // Fetch the user's name who has the lock
        if (lockedBy) {
          try {
            const ownerName = await getDb().getQuoteLockOwner(quoteId, lockedBy);

            if (ownerName) {
              setLockedByName(ownerName);
              toast.warning('Quote is being edited', {
                description: `${ownerName} is currently editing this quote`,
                duration: 5000,
              });
            }
          } catch (error) {
            logger.error('Error fetching lock owner name:', error);
          }
        }

        setHasLock(false);
        return;
      }

      // Stale lock override: lockedBy exists but isLockedByOther returned false
      if (lockedBy && lockedBy !== capturedUserId) {
        logger.warn('Stale lock override', { quoteId, previousHolder: lockedBy, lockedAt });
      }

      // Try to acquire lock
      const acquired = acquireLock(capturedUserId);

      if (acquired) {
        logger.debug(`Lock acquired for quote ${quoteId}`);
        setHasLock(true);

        // Sync lock to cloud — atomic guard: only succeed if unlocked or already ours
        try {
          const synced = await getDb().acquireQuoteLock(quoteId, capturedUserId);

          if (!synced) {
            // 0 rows updated → lock held by someone else — roll back local state
            releaseLock(capturedUserId);
            toast.warning('Quote is locked', {
              description: 'Another user is currently editing this quote.',
            });
            setHasLock(false);
            hasLockRef.current = false;
            return;
          }

          logger.debug('Lock synced to cloud');
        } catch (error) {
          // Sync failed — roll back local lock to stay consistent with DB
          logger.error('Failed to sync lock to cloud, rolling back local lock:', error);
          releaseLock(capturedUserId);
          setHasLock(false);
          hasLockRef.current = false;
        }
      } else {
        logger.warn(`Failed to acquire lock for quote ${quoteId}`);
        setHasLock(false);
      }
    };

    acquireQuoteLock();

    // Release lock on unmount
    return () => {
      // Bug #5 fix: use capturedUserId instead of user.id from closure
      if (autoRelease && hasLockRef.current) {
        releaseLock(capturedUserId);

        // Sync lock release to cloud
        getDb().releaseQuoteLock(quoteId, capturedUserId).then(() => {
          logger.debug('Lock released from cloud');
        }).catch((error) => {
          logger.error('Failed to release lock from cloud:', error);
        });
      }
    };
    // Bug #4 fix: lockedBy removed from deps to prevent acquire/release cycles.
    // The separate effect below (lines 145-156) handles external lock takeover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId, user, autoAcquire, autoRelease]);

  // Bug #4 fix: react to external lock changes (e.g. another user acquired the lock)
  useEffect(() => {
    if (!user) return;
    if (lockedBy && lockedBy !== user.id && hasLockRef.current) {
      // Someone else took the lock while we thought we had it
      setHasLock(false);
      hasLockRef.current = false;
      toast.warning('Lock lost', {
        description: 'Another user has taken over editing this quote.',
        duration: 5000,
      });
    }
  }, [lockedBy, user]);

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
  const acquireLock = useQuoteStore((s) => s.acquireLock);
  const releaseLock = useQuoteStore((s) => s.releaseLock);

  const handleAcquire = async () => {
    if (!user) return false;

    const acquired = acquireLock(user.id);

    if (acquired) {
      try {
        const synced = await getDb().acquireQuoteLock(quoteId, user.id);

        if (!synced) {
          // Lock held by someone else — roll back
          releaseLock(user.id);
          return false;
        }
      } catch (error) {
        // Sync failed — roll back local lock to stay consistent with DB
        logger.error('Failed to sync lock, rolling back:', error);
        releaseLock(user.id);
        return false;
      }
    }

    return acquired;
  };

  const handleRelease = async () => {
    if (!user) return;

    releaseLock(user.id);

    try {
      await getDb().releaseQuoteLock(quoteId, user.id);
    } catch (error) {
      logger.error('Failed to release lock:', error);
    }
  };

  return {
    acquireLock: handleAcquire,
    releaseLock: handleRelease,
  };
}
