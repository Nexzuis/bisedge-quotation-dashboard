import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from '../components/ui/Toast';
import { useQuoteStore } from '../store/useQuoteStore';
import { getQuoteRepository } from '../db/repositories';
import type { SaveResult } from '../db/interfaces';
import { logger } from '../utils/logger';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseAutoSaveResult {
  status: SaveStatus;
  lastSavedAt: Date | null;
  saveNow: () => Promise<void>;
  error: string | null;
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

  // Subscribe only to the fields that indicate a change, not the entire store
  const updatedAt = useQuoteStore((state) => state.updatedAt);
  const quoteRef = useQuoteStore((state) => state.quoteRef);

  // Use NodeJS.Timeout for better compatibility
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdatedAtRef = useRef<Date>(updatedAt);
  const isSavingRef = useRef(false);

  const repository = getQuoteRepository();

  /**
   * Save the quote immediately
   */
  const saveNow = useCallback(async () => {
    if (isSavingRef.current) return;

    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        logger.warn('Autosave paused: waiting for authenticated Supabase session');
        return;
      }
    } catch (err) {
      logger.warn('Autosave paused: failed to check Supabase session', err);
      return;
    }

    // If quote still has default ref, auto-assign a real one before saving
    if (quoteRef === '0000.0') {
      try {
        const nextRef = await repository.getNextQuoteRef();
        useQuoteStore.getState().setQuoteRef(nextRef);
      } catch (err) {
        logger.error('Failed to assign quote ref:', err);
        return;
      }
    }

    isSavingRef.current = true;
    setStatus('saving');
    setError(null);

    try {
      // Read full state only at save time
      const quote = useQuoteStore.getState();
      const result: SaveResult = await repository.save(quote);

      if (result.success) {
        setStatus('saved');
        setLastSavedAt(new Date());
        lastUpdatedAtRef.current = quote.updatedAt;

        // Update version in store to prevent version conflicts
        useQuoteStore.getState().setVersion(result.version);

        // Reset to idle after 3 seconds
        setTimeout(() => {
          setStatus('idle');
        }, 3000);
      } else {
        setStatus('error');
        setError(result.error || 'Unknown error');

        // Handle version conflict
        if (result.error?.includes('Version conflict')) {
          toast.warning('Quote modified in another tab', {
            description: 'Please refresh to get the latest version'
          });
        }
      }
    } catch (err) {
      logger.error('Error saving quote:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      isSavingRef.current = false;
    }
  }, [quoteRef, repository]);

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
  }, [updatedAt, debounceMs, saveNow]);

  return {
    status,
    lastSavedAt,
    saveNow,
    error,
  };
}
