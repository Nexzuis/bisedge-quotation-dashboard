import { useState, useEffect } from 'react';
import { Clock, GitBranch, Loader2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatDate } from '../../engine/formatters';
import { getDb } from '../../db/DatabaseAdapter';
import type { StoredQuote } from '../../db/interfaces';
import type { QuoteStatus } from '../../types/quote';

interface RevisionHistoryProps {
  quoteRef: string;
  onLoadRevision: (id: string) => void;
  currentQuoteId?: string;
}

function getStatusVariant(status: QuoteStatus): 'success' | 'danger' | 'warning' | 'brand' | 'info' {
  switch (status) {
    case 'approved': return 'success';
    case 'rejected': return 'danger';
    case 'pending-approval': return 'warning';
    case 'in-review': return 'brand';
    case 'changes-requested': return 'warning';
    default: return 'info';
  }
}

export function RevisionHistory({ quoteRef, onLoadRevision, currentQuoteId }: RevisionHistoryProps) {
  const [revisions, setRevisions] = useState<StoredQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRevisions = async () => {
      setLoading(true);
      try {
        // Get the base ref number (e.g., "2142" from "2142.3")
        const baseRef = quoteRef.split('.')[0];
        if (!baseRef) {
          setRevisions([]);
          return;
        }

        // Query all quotes whose quoteRef starts with this base number
        const allQuotes = await getDb().getQuoteRevisions(baseRef);

        // Sort by revision number descending (newest first)
        allQuotes.sort((a, b) => {
          const revA = parseInt(a.quoteRef.split('.')[1] || '0');
          const revB = parseInt(b.quoteRef.split('.')[1] || '0');
          return revB - revA;
        });

        setRevisions(allQuotes);
      } catch (err) {
        console.error('Failed to load revisions:', err);
        setRevisions([]);
      } finally {
        setLoading(false);
      }
    };

    loadRevisions();
  }, [quoteRef]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-surface-400 text-sm py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading revisions...
      </div>
    );
  }

  if (revisions.length <= 1) {
    return null; // No revision history to show
  }

  return (
    <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="w-4 h-4 text-brand-400" />
        <h4 className="text-sm font-semibold text-surface-200">
          Revision History ({revisions.length} versions)
        </h4>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {revisions.map((rev) => {
          const isCurrent = rev.id === currentQuoteId;
          return (
            <div
              key={rev.id}
              className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm ${
                isCurrent
                  ? 'bg-brand-500/10 border border-brand-500/30'
                  : 'bg-surface-800/40 hover:bg-surface-700/40'
              } transition-colors`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-brand-400 whitespace-nowrap">
                  v{rev.quoteRef}
                </span>
                <Badge variant={getStatusVariant(rev.status)}>
                  {rev.status.replace('-', ' ')}
                </Badge>
                <span className="text-surface-500 flex items-center gap-1 whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {formatDate(new Date(rev.createdAt))}
                </span>
              </div>
              {isCurrent ? (
                <span className="text-xs text-brand-400 font-medium whitespace-nowrap">Current</span>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => onLoadRevision(rev.id)}
                >
                  Load
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
