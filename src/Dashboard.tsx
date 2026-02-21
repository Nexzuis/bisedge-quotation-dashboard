import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { CrmTopBar } from './components/crm/CrmTopBar';
import { useQuoteDB } from './hooks/useQuoteDB';
import { useQuoteStore } from './store/useQuoteStore';
import { useQuoteLock } from './hooks/useQuoteLock';
import { useRealtimeQuote } from './hooks/useRealtimeQuote';
import { ReadOnlyProvider } from './hooks/ReadOnlyContext';

function Dashboard() {
  const [searchParams] = useSearchParams();
  const { loadFromDB, loadMostRecent } = useQuoteDB();
  const [isLoadingQuote, setIsLoadingQuote] = useState(true);
  const [quoteLoadError, setQuoteLoadError] = useState<string | null>(null);

  const quoteId = searchParams.get('id');
  const storeQuoteId = useQuoteStore((s) => s.id);

  // Lock & realtime: gate on load state to avoid hooking before quote is ready
  const shouldLock = !isLoadingQuote && !quoteLoadError;
  const { isLocked, lockedByName, hasLock } = useQuoteLock(storeQuoteId, shouldLock, true);
  useRealtimeQuote(storeQuoteId, shouldLock);

  const isReadOnly = shouldLock && isLocked && !hasLock;
  const readOnlyReason = isReadOnly
    ? `This quote is currently being edited by ${lockedByName || 'another user'}.`
    : null;

  useEffect(() => {
    let cancelled = false;

    const loadQuoteForRoute = async () => {
      setIsLoadingQuote(true);
      setQuoteLoadError(null);

      try {
        const loaded = quoteId ? await loadFromDB(quoteId) : await loadMostRecent();
        if (!loaded && !cancelled) {
          if (quoteId) {
            useQuoteStore.getState().resetQuote();
          }
          setQuoteLoadError(
            quoteId
              ? `Quote with id ${quoteId} was not found.`
              : 'No existing quote was found. Create a new quote to continue.'
          );
        }
      } catch (error) {
        if (!cancelled) {
          setQuoteLoadError(
            error instanceof Error ? error.message : 'Failed to load quote.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingQuote(false);
        }
      }
    };

    loadQuoteForRoute();
    return () => {
      cancelled = true;
    };
  }, [quoteId, loadFromDB, loadMostRecent]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
      <div className="max-w-7xl mx-auto p-4">
        <CrmTopBar />
        {quoteLoadError && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {quoteLoadError}
          </div>
        )}
      </div>
      {isReadOnly && (
        <div className="max-w-7xl mx-auto px-4">
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            This quote is currently being edited by {lockedByName || 'another user'}. You are viewing in read-only mode.
          </div>
        </div>
      )}
      {!isLoadingQuote && (
        <ReadOnlyProvider isReadOnly={isReadOnly} readOnlyReason={readOnlyReason}>
          <DashboardLayout />
        </ReadOnlyProvider>
      )}
    </div>
  );
}

export default Dashboard;
