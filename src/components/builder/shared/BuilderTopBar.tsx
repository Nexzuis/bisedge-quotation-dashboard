import { ArrowLeft, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { useQuoteStore } from '../../../store/useQuoteStore';
import { useAutoSaveContext } from '../../../hooks/AutoSaveContext';

/**
 * Top navigation bar for the quote builder.
 *
 * Left   — ArrowLeft + "Exit" button that returns to the dashboard (/#/)
 * Center — Quote reference number (hidden on mobile)
 * Right  — Inline save status indicator
 */
export function BuilderTopBar() {
  const quoteRef = useQuoteStore((s) => s.quoteRef);
  const { status, persistentError } = useAutoSaveContext();

  const handleExit = () => {
    // Navigate to root using the hash-based URL so HashRouter stays consistent
    window.location.hash = '/';
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 mb-4 glass rounded-xl">
      {/* Left — exit button */}
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 text-sm text-surface-300 hover:text-surface-50 transition-colors"
        aria-label="Exit quote builder"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Exit</span>
      </button>

      {/* Center — quote reference (hidden on small screens) */}
      <span className="hidden md:block font-mono text-sm text-surface-400 select-none">
        {quoteRef || 'New Quote'}
      </span>

      {/* Right — save status */}
      <div className="flex items-center gap-1.5 text-sm min-w-[6rem] justify-end">
        {(status === 'error' || persistentError) && (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-danger-400 shrink-0" />
            <span className="text-danger-400">Save failed</span>
          </>
        )}
        {status === 'saving' && !persistentError && (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-surface-400 shrink-0" />
            <span className="text-surface-400">Saving…</span>
          </>
        )}
        {status === 'saved' && !persistentError && (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-success-400 shrink-0" />
            <span className="text-success-400">Saved</span>
          </>
        )}
        {status === 'idle' && !persistentError && (
          <span className="text-surface-500 text-xs">All changes saved</span>
        )}
      </div>
    </div>
  );
}
