import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Loader2, ArrowLeft, ArrowUpDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { CrmTopBar } from '../crm/CrmTopBar';
import { QuoteStatusBadge } from '../shared/QuoteStatusBadge';
import { useAuthStore } from '../../store/useAuthStore';
import { getDb } from '../../db/DatabaseAdapter';
import { ROLE_HIERARCHY, type Role } from '../../auth/permissions';
import { staggerContainer, fadeInUp } from '../crm/shared/motionVariants';
import type { StoredQuote } from '../../db/interfaces';
import type { QuoteStatus } from '../../types/quote';

const ALL_STATUSES: { value: QuoteStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending-approval', label: 'Pending Approval' },
  { value: 'in-review', label: 'In Review' },
  { value: 'changes-requested', label: 'Changes Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'sent-to-customer', label: 'Sent to Customer' },
  { value: 'expired', label: 'Expired' },
];

type SortField = 'quoteRef' | 'clientName' | 'status' | 'updatedAt' | 'createdAt';

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

export default function QuotesListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  // Read initial filter from navigation state (from stat card clicks)
  const initialStatus = (location.state as any)?.filterStatus || '';
  const filterThisMonth = (location.state as any)?.filterThisMonth || false;

  const [quotes, setQuotes] = useState<StoredQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | ''>(initialStatus);
  const [onlyThisMonth, setOnlyThisMonth] = useState(filterThisMonth);
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const isManager = user && (ROLE_HIERARCHY[user.role as Role] || 0) >= 2;

  useEffect(() => {
    loadQuotes();
  }, [user, statusFilter, onlyThisMonth]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      loadQuotes();
      return;
    }
    const timer = setTimeout(() => searchForQuotes(), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadQuotes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const db = getDb();
      const filter: any = {};
      if (statusFilter) filter.status = statusFilter;

      const result = await db.listQuotes(
        { page: 1, pageSize: 500, sortBy: 'updatedAt', sortOrder: 'desc' },
        filter
      );

      let items = result.items;

      // Role-based filtering
      if (!isManager) {
        items = items.filter(
          (q: any) => q.createdBy === user.id || q.assignedTo === user.id
        );
      }

      // "This month" filtering
      if (onlyThisMonth) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        items = items.filter((q) => q.createdAt >= monthStart);
      }

      setQuotes(items);
    } catch (err) {
      console.error('Error loading quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchForQuotes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const db = getDb();
      let results = await db.searchQuotes(searchQuery);

      if (!isManager) {
        results = results.filter(
          (q: any) => q.createdBy === user.id || q.assignedTo === user.id
        );
      }

      if (statusFilter) {
        results = results.filter((q) => q.status === statusFilter);
      }

      setQuotes(results);
    } catch (err) {
      console.error('Error searching quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Client-side sorting
  const sortedQuotes = [...quotes].sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="text-left py-3 px-4 text-surface-300 font-medium"
      aria-sort={sortField === field ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className="flex items-center gap-1 hover:text-surface-100 transition-colors"
        onClick={() => handleSort(field)}
      >
        {label}
        {sortField === field && (
          <ArrowUpDown className="w-3 h-3 text-brand-400" />
        )}
      </button>
    </th>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
      <motion.div
        className="max-w-7xl mx-auto p-4 space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <CrmTopBar />

        <motion.div variants={fadeInUp} className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-surface-400 hover:text-surface-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-surface-100">
            {isManager ? 'All Quotes' : 'My Quotes'}
          </h1>
        </motion.div>

        {/* Filters */}
        <motion.div variants={fadeInUp} className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search by quote ref or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {onlyThisMonth && (
              <button
                onClick={() => setOnlyThisMonth(false)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-600 text-white transition-colors"
              >
                This Month &times;
              </button>
            )}
            {ALL_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === s.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-700/50 text-surface-400 hover:text-surface-200 hover:bg-surface-600/50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Table */}
        <motion.div variants={fadeInUp} className="glass rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
          ) : sortedQuotes.length === 0 ? (
            <div className="text-center py-16 text-surface-400">
              No quotes found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-700">
                    <SortHeader field="quoteRef" label="Quote Ref" />
                    <SortHeader field="clientName" label="Customer" />
                    <SortHeader field="status" label="Status" />
                    <SortHeader field="updatedAt" label="Updated" />
                    <SortHeader field="createdAt" label="Created" />
                  </tr>
                </thead>
                <tbody>
                  {sortedQuotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="border-b border-surface-800/50 hover:bg-surface-700/20 transition-colors cursor-pointer"
                      onClick={() => navigate(`/quote?id=${quote.id}`)}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-brand-400 hover:text-brand-300 transition-colors">
                          {quote.quoteRef}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-surface-100 text-sm">{quote.clientName || 'No customer'}</div>
                        {quote.contactName && (
                          <div className="text-xs text-surface-500">{quote.contactName}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <QuoteStatusBadge status={quote.status as QuoteStatus} />
                      </td>
                      <td className="py-3 px-4 text-sm text-surface-400">
                        {formatDate(quote.updatedAt)}
                      </td>
                      <td className="py-3 px-4 text-sm text-surface-400">
                        {formatDate(quote.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeInUp} className="text-sm text-surface-500 text-center pb-4">
          Showing {sortedQuotes.length} quote{sortedQuotes.length !== 1 ? 's' : ''}
        </motion.div>
      </motion.div>
    </div>
  );
}
