import { useEffect } from 'react';
import { useQuoteStore } from '../store/useQuoteStore';

/**
 * Hook to warn users about unsaved changes before they leave the page
 */
export const useUnsavedChanges = (lastSavedAt: Date | null) => {
  const updatedAt = useQuoteStore((state) => state.updatedAt);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if there are unsaved changes
      const hasUnsavedChanges = updatedAt && lastSavedAt && updatedAt > lastSavedAt;

      if (hasUnsavedChanges) {
        // Modern browsers require returnValue to be set
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [updatedAt, lastSavedAt]);
};
