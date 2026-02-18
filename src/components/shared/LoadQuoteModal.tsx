import { useState, useEffect } from 'react';
import { X, Search, Copy, Trash2, Loader2, GitBranch, ArrowLeftRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { toast } from '../ui/Toast';
import { RevisionHistory } from './RevisionHistory';
import { QuoteComparisonModal } from './QuoteComparisonModal';
import { useQuoteDB } from '../../hooks/useQuoteDB';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import type { StoredQuote, QuoteFilter } from '../../db/interfaces';
import type { QuoteStatus } from '../../types/quote';
import { formatDate } from '../../engine/formatters';

interface LoadQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuoteLoaded?: () => void;
}

export function LoadQuoteModal({ isOpen, onClose, onQuoteLoaded }: LoadQuoteModalProps) {
  const [quotes, setQuotes] = useState<StoredQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedRevisionRef, setExpandedRevisionRef] = useState<string | null>(null);
  const [compareQuoteId, setCompareQuoteId] = useState<string | null>(null);
  const pageSize = 10;

  const { listQuotes, searchQuotes, loadFromDB, duplicateQuote, deleteQuote } = useQuoteDB();
  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  // Load quotes
  const loadQuotesList = async () => {
    setLoading(true);
    try {
      if (searchQuery.trim()) {
        // Search mode
        const results = await searchQuotes(searchQuery);
        setQuotes(results);
        setTotalPages(1);
      } else {
        // List mode with filters
        const filters: QuoteFilter = {};
        if (statusFilter) {
          filters.status = statusFilter;
        }

        const result = await listQuotes(
          {
            page: currentPage,
            pageSize,
            sortBy: 'createdAt',
            sortOrder: 'desc',
          },
          filters
        );

        setQuotes(result.items);
        setTotalPages(result.totalPages);
      }
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount and when filters change
  useEffect(() => {
    if (isOpen) {
      loadQuotesList();
    }
  }, [isOpen, currentPage, statusFilter]);

  // Search with debounce
  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      loadQuotesList();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleLoadQuote = async (id: string) => {
    const success = await loadFromDB(id);
    if (success) {
      onQuoteLoaded?.();
      onClose();
    }
  };

  const handleDuplicate = async (id: string) => {
    const confirmed = await confirm({
      title: 'Duplicate Quote',
      message: 'Create a duplicate of this quote?',
      variant: 'info',
      confirmText: 'Duplicate',
    });
    if (!confirmed) return;
    const success = await duplicateQuote(id);
    if (success) {
      onQuoteLoaded?.();
      onClose();
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Quote',
      message: 'Are you sure you want to delete this quote? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    try {
      await deleteQuote(id);
      toast.success('Quote deleted');
      loadQuotesList();
    } catch (error) {
      toast.error('Failed to delete quote');
    }
  };

  const getStatusVariant = (status: QuoteStatus) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'pending-approval':
        return 'warning';
      case 'in-review':
        return 'brand';
      case 'changes-requested':
        return 'warning';
      default:
        return 'info';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-quote-modal-title"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="glass rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-surface-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 id="load-quote-modal-title" className="text-2xl font-bold text-surface-100">Load Quote</h2>
            <button
              onClick={onClose}
              className="text-surface-400 hover:text-surface-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Search by quote ref or customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as QuoteStatus | '');
                setCurrentPage(1);
              }}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending-approval">Pending Approval</option>
              <option value="in-review">In Review</option>
              <option value="changes-requested">Changes Requested</option>
              <option value="approved">Approved</option>
              <option value="sent-to-customer">Sent to Customer</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12 text-surface-400">
              No quotes found. Create your first quote to get started!
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700">
                  <th className="text-left py-3 px-4 text-surface-300 font-medium">
                    Quote Ref
                  </th>
                  <th className="text-left py-3 px-4 text-surface-300 font-medium">
                    Customer
                  </th>
                  <th className="text-left py-3 px-4 text-surface-300 font-medium">
                    Created
                  </th>
                  <th className="text-left py-3 px-4 text-surface-300 font-medium">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 text-surface-300 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => {
                  const isExpanded = expandedRevisionRef === quote.quoteRef;
                  return (
                    <tr key={quote.id}>
                      <td colSpan={5} className="p-0">
                        <div className="border-b border-surface-800 hover:bg-surface-800/30 transition-colors">
                          <div className="flex items-center">
                            <div className="py-3 px-4 flex-shrink-0" style={{ width: '20%' }}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-brand-400">{quote.quoteRef}</span>
                                <button
                                  onClick={() => setExpandedRevisionRef(isExpanded ? null : quote.quoteRef)}
                                  className="p-1 text-surface-500 hover:text-brand-400 transition-colors"
                                  title="Show revision history"
                                >
                                  <GitBranch className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="py-3 px-4 flex-shrink-0" style={{ width: '25%' }}>
                              <div className="text-surface-100">{quote.clientName || 'No customer'}</div>
                              <div className="text-sm text-surface-400">{quote.contactName}</div>
                            </div>
                            <div className="py-3 px-4 text-surface-300 flex-shrink-0" style={{ width: '15%' }}>
                              {formatDate(new Date(quote.createdAt))}
                            </div>
                            <div className="py-3 px-4 flex-shrink-0" style={{ width: '15%' }}>
                              <Badge variant={getStatusVariant(quote.status)}>
                                {quote.status.replace('-', ' ').toUpperCase()}
                              </Badge>
                            </div>
                            <div className="py-3 px-4 flex-1">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="secondary" onClick={() => handleLoadQuote(quote.id)}>
                                  Load
                                </Button>
                                <button
                                  onClick={() => setCompareQuoteId(quote.id)}
                                  className="p-2 text-surface-400 hover:text-purple-400 transition-colors"
                                  title="Compare"
                                >
                                  <ArrowLeftRight className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDuplicate(quote.id)}
                                  className="p-2 text-surface-400 hover:text-brand-400 transition-colors"
                                  title="Duplicate"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(quote.id)}
                                  className="p-2 text-surface-400 hover:text-red-400 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="px-4 pb-3">
                              <RevisionHistory
                                quoteRef={quote.quoteRef}
                                currentQuoteId={quote.id}
                                onLoadRevision={(id) => {
                                  handleLoadQuote(id);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="border-t border-surface-700 p-4 flex items-center justify-between">
            <div className="text-sm text-surface-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
      {ConfirmDialogElement}
      <QuoteComparisonModal
        isOpen={compareQuoteId !== null}
        onClose={() => setCompareQuoteId(null)}
        initialQuoteId={compareQuoteId ?? undefined}
      />
    </div>
  );
}
