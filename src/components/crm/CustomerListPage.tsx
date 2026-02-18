import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, UserPlus, Building2, Users, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { CrmTopBar } from './CrmTopBar';
import { ViewToggle } from './list/ViewToggle';
import { StageFilter } from './list/StageFilter';
import { KanbanBoard } from './list/KanbanBoard';
import { CustomerTable } from './list/CustomerTable';
import { BulkActionsBar } from './list/BulkActionsBar';
import { CompanyForm } from './shared/CompanyForm';
import { useCrmStore } from '../../store/useCrmStore';
import { useCompanies } from '../../hooks/useCompanies';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import { staggerContainer, fadeInUp } from './shared/motionVariants';
import { db } from '../../db/schema';
import type { StoredCompany } from '../../db/interfaces';

export default function CustomerListPage() {
  const [companies, setCompanies] = useState<StoredCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showMyAccounts, setShowMyAccounts] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});

  const { user } = useAuth();
  const viewMode = useCrmStore((s) => s.viewMode);
  const stageFilters = useCrmStore((s) => s.stageFilters);
  const searchQuery = useCrmStore((s) => s.searchQuery);
  const setSearchQuery = useCrmStore((s) => s.setSearchQuery);
  const { listCompanies, searchCompanies } = useCompanies();
  const location = useLocation();

  // Load user names for display
  useEffect(() => {
    db.users.toArray().then((users) => {
      const map: Record<string, string> = {};
      for (const u of users) {
        map[u.id] = u.fullName || u.username;
      }
      setUserNameMap(map);
    });
  }, []);

  // Check if navigated with openNewLead state
  useEffect(() => {
    if ((location.state as any)?.openNewLead) {
      setShowNewForm(true);
      // Clear the state so it doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = searchQuery.trim()
        ? await searchCompanies(searchQuery)
        : await listCompanies();
      setCompanies(data);
    } catch (err) {
      console.error('Failed to load companies:', err);
      setError('Failed to load companies. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, listCompanies, searchCompanies]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = () => {
    try {
      const data = filtered.map((c) => ({
        'Company Name': c.name,
        'Industry': c.industry || '',
        'Pipeline Stage': c.pipelineStage,
        'Email': c.email || '',
        'Phone': c.phone || '',
        'Estimated Value': c.estimatedValue || 0,
        'Created': c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Companies');
      XLSX.writeFile(wb, `companies-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Companies exported successfully');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export companies');
    }
  };

  // Filter by selected stages — empty stageFilters means "All"
  const stageFiltered =
    stageFilters.length === 0
      ? companies
      : companies.filter((c) => stageFilters.includes(c.pipelineStage));
  const filtered = showMyAccounts && user
    ? stageFiltered.filter((c) => c.assignedTo === user.id)
    : stageFiltered;

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
      <motion.div
        className="max-w-7xl mx-auto p-4 space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeInUp}>
          <CrmTopBar />
        </motion.div>

        {/* Toolbar */}
        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full pl-10 text-sm"
            />
          </div>
          <ViewToggle />
          <button
            onClick={() => setShowMyAccounts((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              showMyAccounts
                ? 'bg-brand-600/30 text-surface-100 border-teal-500/50'
                : 'text-surface-100/60 hover:text-surface-100 hover:bg-surface-800/40 border-surface-600/50'
            }`}
          >
            <Users className="w-4 h-4" />
            {showMyAccounts ? 'All Accounts' : 'My Accounts'}
          </button>
          <Button variant="ghost" icon={Download} onClick={handleExport} disabled={filtered.length === 0}>
            Export
          </Button>
          <Button variant="primary" icon={UserPlus} onClick={() => setShowNewForm(true)}>
            New Lead
          </Button>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <StageFilter />
        </motion.div>

        {selectedIds.size > 0 && (
          <motion.div variants={fadeInUp}>
            <BulkActionsBar
              selectedCount={selectedIds.size}
              selectedIds={selectedIds}
              onClearSelection={() => setSelectedIds(new Set())}
              onRefresh={loadData}
            />
          </motion.div>
        )}

        {/* Content */}
        <motion.div variants={fadeInUp}>
          {error ? (
            <div className="glass rounded-xl p-8 text-center">
              <div className="text-red-400 text-lg font-semibold mb-2">Failed to load</div>
              <p className="text-surface-400 mb-4">{error}</p>
              <button onClick={loadData} className="btn btn-primary px-6 py-2">Retry</button>
            </div>
          ) : loading ? (
            viewMode === 'kanban' ? (
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-10 bg-surface-800/40 rounded-t-xl animate-pulse" />
                    <div className="space-y-2 p-2 bg-surface-800/20 rounded-b-xl min-h-[120px]">
                      {Array.from({ length: Math.max(1, 3 - i) }).map((_, j) => (
                        <div key={j} className="h-20 bg-surface-700/30 rounded-lg animate-pulse relative overflow-hidden">
                          <div className="absolute inset-0 animate-shimmer" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass rounded-xl overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="h-10 bg-surface-700/50 rounded animate-pulse" />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 bg-surface-700/30 rounded animate-pulse relative overflow-hidden">
                      <div className="absolute inset-0 animate-shimmer" />
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : filtered.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <Building2 className="w-12 h-12 text-surface-500 mx-auto mb-4" />
              <p className="text-surface-400 text-lg font-medium mb-2">No companies found</p>
              <p className="text-surface-500 text-sm mb-6">
                {showMyAccounts ? 'No accounts are assigned to you.' : 'Try adjusting your search or filters.'}
              </p>
              <Button variant="primary" icon={UserPlus} onClick={() => setShowNewForm(true)}>
                Add your first company
              </Button>
            </div>
          ) : viewMode === 'kanban' ? (
            <KanbanBoard companies={filtered} onRefresh={loadData} />
          ) : (
            <CustomerTable companies={filtered} selectedIds={selectedIds} onSelectionChange={setSelectedIds} userNameMap={userNameMap} />
          )}
        </motion.div>
      </motion.div>

      {/* New Company Modal */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-lead-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="glass rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <h2 id="new-lead-modal-title" className="text-lg font-bold text-surface-100 mb-4">New Lead</h2>
              <CompanyForm
                onSaved={() => {
                  setShowNewForm(false);
                  loadData();
                }}
                onCancel={() => setShowNewForm(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
