import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from '../components/ui/Toast';
import { useQuoteStore } from '../store/useQuoteStore';

export interface KeyboardShortcutOptions {
  /**
   * Called when Ctrl+S is pressed. Typically bound to the saveNow function
   * from useAutoSave so the shortcut reuses the same save path as auto-save.
   */
  onSave: () => Promise<boolean>;
}

/**
 * Global keyboard shortcuts hook.
 *
 * Shortcuts handled here:
 *   Ctrl+S  — Save the current quote immediately
 *   Ctrl+N  — Reset (new) quote, only when on the /builder route
 *   Ctrl+P  — Dispatch a 'generate-pdf' CustomEvent, only when on the /builder route
 *
 * NOTE: Ctrl+K is intentionally excluded — it is already handled exclusively
 * by GlobalSearch.tsx via its own window keydown listener.
 *
 * Must be called inside a component that is already within a <Router> context.
 */
export function useKeyboardShortcuts({ onSave }: KeyboardShortcutOptions): void {
  const location = useLocation();
  const onSaveRef = useRef(onSave);

  // Keep ref current so the event listener closure never goes stale.
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Ctrl (Windows/Linux). Ignore Meta (Mac Cmd) to avoid
      // conflicting with OS-native shortcuts like Cmd+S (Save As) on macOS.
      if (!e.ctrlKey) return;

      // Skip when the user is typing inside an input, textarea, or
      // contenteditable element so we do not steal keystrokes from form fields.
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable
        ) {
          return;
        }
      }

      const isBuilderRoute = location.pathname === '/builder';

      switch (e.key) {
        case 's': {
          e.preventDefault();
          void onSaveRef.current().then((success) => {
            if (success) {
              toast.success('Quote saved', {
                description: 'All changes have been saved successfully.',
                duration: 3000,
              });
            }
          });
          break;
        }

        case 'n': {
          if (!isBuilderRoute) break;
          e.preventDefault();
          useQuoteStore.getState().resetQuote();
          toast.success('New quote started', {
            description: 'The quote has been reset to defaults.',
            duration: 3000,
          });
          break;
        }

        case 'p': {
          if (!isBuilderRoute) break;
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('generate-pdf'));
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // location.pathname is the only reactive dependency — the listener is
    // re-registered whenever the route changes so isBuilderRoute stays correct.
  }, [location.pathname]);
}
