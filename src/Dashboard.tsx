import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { CrmTopBar } from './components/crm/CrmTopBar';
import { useQuoteDB } from './hooks/useQuoteDB';
import { useQuoteStore } from './store/useQuoteStore';

function Dashboard() {
  const [searchParams] = useSearchParams();
  const { loadFromDB, loadMostRecent } = useQuoteDB();
  const [isLoadingQuote, setIsLoadingQuote] = useState(true);
  const [quoteLoadError, setQuoteLoadError] = useState<string | null>(null);

  const quoteId = searchParams.get('id');

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
      {!isLoadingQuote && <DashboardLayout />}
    </div>
  );
}

export default Dashboard;
