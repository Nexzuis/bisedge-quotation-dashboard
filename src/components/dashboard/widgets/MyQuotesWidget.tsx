import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2, Inbox } from 'lucide-react';
import { motion } from 'framer-motion';
import { QuoteStatusBadge } from '../../shared/QuoteStatusBadge';
import { useAuthStore } from '../../../store/useAuthStore';
import { getDb } from '../../../db/DatabaseAdapter';
import { fadeInUp } from '../../crm/shared/motionVariants';
import type { StoredQuote } from '../../../db/interfaces';
import type { QuoteStatus } from '../../../types/quote';

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function MyQuotesWidget() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [quotes, setQuotes] = useState<StoredQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadMyQuotes();
  }, [user]);

  const loadMyQuotes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const db = getDb();
      const result = await db.listQuotes(
        { page: 1, pageSize: 50, sortBy: 'updatedAt', sortOrder: 'desc' },
        {}
      );
      // Filter to user's own quotes
      const myQuotes = result.items.filter(
        (q: any) => q.createdBy === user.id || q.assignedTo === user.id
      );
      setQuotes(myQuotes.slice(0, 10));
    } catch (err) {
      console.error('Error loading my quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div variants={fadeInUp} className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-surface-300 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          My Quotes
        </h3>
        <button
          onClick={() => navigate('/quotes')}
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          View All
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-surface-500">
          <Inbox className="w-10 h-10 text-surface-600 mb-3" />
          <div className="text-sm font-medium text-surface-400">No quotes yet</div>
          <div className="text-xs text-surface-600 mt-1">Create your first quote to get started</div>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {quotes.map((quote) => (
            <div
              key={quote.id}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-700/30 transition-colors cursor-pointer group"
              onClick={() => navigate(`/quote?id=${quote.id}`)}
            >
              <span className="font-mono text-sm text-brand-400 group-hover:text-brand-300 transition-colors min-w-[80px]">
                {quote.quoteRef}
              </span>
              <span className="text-sm text-surface-200 truncate flex-1">
                {quote.clientName || 'No customer'}
              </span>
              <QuoteStatusBadge status={quote.status as QuoteStatus} />
              <span className="text-xs text-surface-500 whitespace-nowrap hidden sm:block">
                {formatDate(quote.updatedAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
