import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useQuoteStore } from '../store/useQuoteStore';
import { setAutoSaveInProgress } from '../store/useAuthStore';
import { getQuoteRepository } from '../db/repositories';
import type { SaveResult } from '../db/interfaces';
import { withQuoteSaveRetry } from '../utils/resilientFetch';
import { logger } from '../utils/logger';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Number of consecutive failures before `persistentError` is raised. */
const PERSISTENT_ERROR_THRESHOLD = 3;

export interface UseAutoSaveResult {
  status: SaveStatus;
  lastSavedAt: Date | null;
  saveNow: () => Promise<boolean>;
  error: string | null;
  /** True after 3+ consecutive save failures without a successful save in between. */
  persistentError: boolean;
}

/**
 * Auto-save hook that watches for quote changes and saves automatically
 * with debouncing and optimistic locking.
 *
 * Only subscribes to updatedAt and quoteRef to avoid re-renders on every keystroke.
 */
export function useAutoSave(debounceMs: number = 2000): UseAutoSaveResult {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [persistentError, setPersistentError] = useState(false);

  // Tracks consecutive save failures; reset to 0 on any successful save
  const consecutiveFailuresRef = useRef(0);

  // Subscribe only to the fields that indicate a change, not the entire store
  const updatedAt = useQuoteStore((state) => state.updatedAt);
  const quoteRef = useQuoteStore((state) => state.quoteRef);

  // Use NodeJS.Timeout for better compatibility
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdatedAtRef = useRef<Date>(updatedAt);
  const isSavingRef = useRef(false);
  const prevQuoteRefRef = useRef(quoteRef);

  // Bug #1 fix: capture the quoteRef at the time the debounce timeout was scheduled
  const scheduledQuoteRefRef = useRef(quoteRef);

  const repository = getQuoteRepository();

  /**
   * Save the quote immediately
   */
  const saveNow = useCallback(async (): Promise<boolean> => {
    if (isSavingRef.current) return false;

    // Bug #1 fix: if the quoteRef has changed since the save was scheduled,
    // skip this save — the data belongs to a different quote
    const currentQuoteRef = useQuoteStore.getState().quoteRef;
    if (currentQuoteRef !== scheduledQuoteRefRef.current) {
      logger.debug('Autosave skipped: quoteRef changed since save was scheduled');
      return false;
    }

    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        logger.warn('Autosave paused: waiting for authenticated Supabase session');
        return false;
      }
    } catch (err) {
      logger.warn('Autosave paused: failed to check Supabase session', err);
      return false;
    }

    // If quote still has default ref, auto-assign a real one before saving
    if (currentQuoteRef === '0000.0') {
      try {
        const nextRef = await repository.getNextQuoteRef();
        useQuoteStore.getState().setQuoteRef(nextRef);
      } catch (err) {
        logger.error('Failed to assign quote ref:', err);
        return false;
      }
    }

    isSavingRef.current = true;
    setAutoSaveInProgress(true);
    setStatus('saving');
    setError(null);

    try {
      // Read full state only at save time
      const quote = useQuoteStore.getState();
      const result: SaveResult = await withQuoteSaveRetry(
        () => repository.save(quote),
        quote.id,
        quote.version
      );

      if (result.success) {
        setStatus('saved');
        setLastSavedAt(new Date());
        lastUpdatedAtRef.current = quote.updatedAt;

        // Reset consecutive failure tracking on a clean save
        consecutiveFailuresRef.current = 0;
        setPersistentError(false);

        // Update version in store to prevent version conflicts
        useQuoteStore.getState().setVersion(result.version);

        // Bug #3 fix: mark the quote as saved so the realtime dirty-check knows
        useQuoteStore.getState().markSaved();

        // Reset to idle after 3 seconds
        setTimeout(() => {
          setStatus('idle');
        }, 3000);

        return true;
      } else {
        const errorMessage = result.error || 'Unknown error';
        setStatus('error');
        setError(errorMessage);

        // Increment failure counter and check threshold
        consecutiveFailuresRef.current += 1;
        if (consecutiveFailuresRef.current >= PERSISTENT_ERROR_THRESHOLD) {
          setPersistentError(true);
        }

        // Lock enforcement: quote locked by another user
        if (result.error?.includes('locked by another user')) {
          toast.error('Cannot save: quote is locked', {
            description: 'Another user is currently editing this quote.',
            duration: 5000,
          });
        // Bug #11 fix: version conflict with recovery action
        } else if (result.error?.includes('Version conflict')) {
          const quoteId = useQuoteStore.getState().id;
          toast.warning('Quote modified in another tab', {
            description: 'Your version is out of date.',
            action: {
              label: 'Reload Latest',
              onClick: async () => {
                try {
                  const latest = await repository.load(quoteId);
                  if (latest) {
                    useQuoteStore.getState().loadQuote(latest);
                    toast.success('Quote reloaded to latest version');
                  }
                } catch {
                  toast.error('Failed to reload quote');
                }
              },
            },
            duration: 10000,
          });
        } else {
          // Generic network / server failure — always notify the user
          toast.error('Auto-save failed', {
            description: 'Your changes could not be saved. Check your connection.',
            duration: 5000,
          });
        }

        return false;
      }
    } catch (err) {
      logger.error('Error saving quote:', err);
      const errorMessage = err instanceof Error ? err.message : 'Save failed';
      setStatus('error');
      setError(errorMessage);

      // Increment failure counter and check threshold
      consecutiveFailuresRef.current += 1;
      if (consecutiveFailuresRef.current >= PERSISTENT_ERROR_THRESHOLD) {
        setPersistentError(true);
      }

      toast.error('Auto-save failed', {
        description: 'An unexpected error occurred. Your changes may not be saved.',
        duration: 5000,
      });

      return false;
    } finally {
      isSavingRef.current = false;
      setAutoSaveInProgress(false);
    }
  }, [repository]);

  /**
   * When quoteRef changes (quote loaded from DB or new quote created),
   * treat the current state as "clean" so that hasUnsavedChanges starts
   * from a known baseline. Without this, lastSavedAt stays null after a
   * load and unsaved-change detection never triggers.
   *
   * Bug #1 fix: also clear any pending save timeout so a debounced save
   * for the *previous* quote doesn't fire after navigation.
   */
  useEffect(() => {
    if (quoteRef !== prevQuoteRefRef.current) {
      prevQuoteRefRef.current = quoteRef;
      scheduledQuoteRefRef.current = quoteRef;
      setLastSavedAt(new Date());
      lastUpdatedAtRef.current = updatedAt;

      // Clear any pending save from the previous quote
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    }
  }, [quoteRef, updatedAt]);

  /**
   * Fix #5: Sync autosave baseline when the store is marked as saved externally
   * (e.g. after loadQuote from realtime or markSaved from approval path).
   * This prevents realtime reload from triggering an unnecessary autosave.
   */
  const _lastSavedAt = useQuoteStore((state) => state._lastSavedAt);

  useEffect(() => {
    if (_lastSavedAt) {
      lastUpdatedAtRef.current = useQuoteStore.getState().updatedAt;
      setLastSavedAt(_lastSavedAt);
    }
  }, [_lastSavedAt]);

  /**
   * Watch for changes and trigger debounced save
   */
  useEffect(() => {
    // Check if updatedAt has changed
    if (updatedAt.getTime() !== lastUpdatedAtRef.current.getTime()) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Bug #1 fix: capture quoteRef at schedule time
      scheduledQuoteRefRef.current = quoteRef;

      // Set new timeout
      saveTimeoutRef.current = setTimeout(() => {
        saveNow();
      }, debounceMs);
    }

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [updatedAt, quoteRef, debounceMs, saveNow]);

  return {
    status,
    lastSavedAt,
    saveNow,
    error,
    persistentError,
  };
}
