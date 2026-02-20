import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, LayoutGrid, TableProperties, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CrmTopBar } from '../crm/CrmTopBar';
import { LeadCard } from './shared/LeadCard';
import { LeadFilters } from './shared/LeadFilters';
import { LeadForm } from './shared/LeadForm';
import { LeadStatusBadge } from './shared/LeadStatusBadge';
import { LeadScoreBadge } from './shared/LeadScoreBadge';
import { useLeads } from '../../hooks/useLeads';
import { useLeadStore } from '../../store/useLeadStore';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import { staggerContainer, fadeInUp } from '../crm/shared/motionVariants';
import type { StoredLead } from '../../db/interfaces';
import type { LeadFilter, QualificationStatus, LeadSourceName } from '../../types/leads';
import { useNavigate } from 'react-router-dom';

export default function LeadExplorerPage() {
  const [leads, setLeads] = useState<StoredLead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<QualificationStatus>('reviewing');

  const navigate = useNavigate();
  const { listLeads, saveLead, bulkUpdateStatus } = useLeads();

  const viewMode = useLeadStore((s) => s.viewMode);
  const setViewMode = useLeadStore((s) => s.setViewMode);
  const searchQuery = useLeadStore((s) => s.searchQuery);
  const setSearchQuery = useLeadStore((s) => s.setSearchQuery);
  const statusFilter = useLeadStore((s) => s.statusFilter);
  const sourceFilter = useLeadStore((s) => s.sourceFilter);
  const provinceFilter = useLeadStore((s) => s.provinceFilter);
  const industryFilter = useLeadStore((s) => s.industryFilter);
  const minScoreFilter = useLeadStore((s) => s.minScoreFilter);
  const sortBy = useLeadStore((s) => s.sortBy);
  const sortOrder = useLeadStore((s) => s.sortOrder);
  const setSortBy = useLeadStore((s) => s.setSortBy);
  const setSortOrder = useLeadStore((s) => s.setSortOrder);
  const page = useLeadStore((s) => s.page);
  const pageSize = useLeadStore((s) => s.pageSize);
  const setPage = useLeadStore((s) => s.setPage);

  type SortField = 'companyName' | 'buyProbability' | 'createdAt';
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'companyName' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3 h-3 inline ml-0.5" />
      : <ArrowDown className="w-3 h-3 inline ml-0.5" />;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: LeadFilter = {};
      if (searchQuery.trim()) filters.search = searchQuery.trim();
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (sourceFilter !== 'all') filters.source = sourceFilter;
      if (provinceFilter) filters.province = provinceFilter;
      if (industryFilter) filters.industry = industryFilter;
      if (minScoreFilter > 0) filters.minScore = minScoreFilter;

      const result = await listLeads({ page, pageSize, sortBy, sortOrder }, filters);
      setLeads(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, sourceFilter, provinceFilter, industryFilter, minScoreFilter, sortBy, sortOrder, page, pageSize, listLeads]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveNew = async (data: any) => {
    await saveLead(data);
    toast.success('Lead created');
    setShowNewForm(false);
    loadData();
  };

  const handleBulkAction = async () => {
    if (selectedIds.size === 0) return;
    await bulkUpdateStatus(Array.from(selectedIds), bulkStatus);
    toast.success(`Updated ${selectedIds.size} leads`);
    setSelectedIds(new Set());
    loadData();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

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
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full pl-10 text-sm"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-surface-800/50 border border-surface-600 rounded-lg">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-l-lg transition-colors ${viewMode === 'cards' ? 'bg-brand-600/30 text-brand-400' : 'text-surface-400 hover:text-surface-200'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-r-lg transition-colors ${viewMode === 'table' ? 'bg-brand-600/30 text-brand-400' : 'text-surface-400 hover:text-surface-200'}`}
            >
              <TableProperties className="w-4 h-4" />
            </button>
          </div>

          <Button variant="primary" icon={Plus} onClick={() => setShowNewForm(true)}>
            Add Lead
          </Button>
        </motion.div>

        {/* Filters */}
        <motion.div variants={fadeInUp}>
          <LeadFilters />
        </motion.div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <motion.div variants={fadeInUp} className="glass rounded-xl p-3 flex items-center gap-3">
            <span className="text-sm text-surface-300">{selectedIds.size} selected</span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as QualificationStatus)}
              className="bg-surface-800/50 border border-surface-600 rounded-lg px-3 py-1.5 text-sm text-surface-200"
            >
              <option value="reviewing">Reviewing</option>
              <option value="qualified">Qualified</option>
              <option value="rejected">Rejected</option>
              <option value="contacted">Contacted</option>
              <option value="stale">Stale</option>
            </select>
            <Button variant="primary" onClick={handleBulkAction}>Apply</Button>
            <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </motion.div>
        )}

        {/* Content */}
        <motion.div variants={fadeInUp}>
          {loading ? (
            viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="glass rounded-xl p-4 h-56 animate-pulse">
                    <div className="h-4 bg-surface-700/50 rounded w-1/3 mb-3" />
                    <div className="h-5 bg-surface-700/50 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-surface-700/40 rounded w-1/2 mb-4" />
                    <div className="h-3 bg-surface-700/30 rounded w-full mb-2" />
                    <div className="h-3 bg-surface-700/30 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass rounded-xl overflow-hidden p-4 space-y-3">
                <div className="h-10 bg-surface-700/50 rounded animate-pulse" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-surface-700/30 rounded animate-pulse" />
                ))}
              </div>
            )
          ) : leads.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <p className="text-surface-400 text-lg font-medium mb-2">No leads found</p>
              <p className="text-surface-500 text-sm mb-6">Try adjusting your search or filters, or add a new lead.</p>
              <Button variant="primary" icon={Plus} onClick={() => setShowNewForm(true)}>Add your first lead</Button>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  selected={selectedIds.has(lead.id)}
                  onSelect={toggleSelect}
                />
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="glass rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700">
                      <th className="text-left p-3 text-surface-400 font-medium w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === leads.length && leads.length > 0}
                          onChange={() => {
                            if (selectedIds.size === leads.length) setSelectedIds(new Set());
                            else setSelectedIds(new Set(leads.map((l) => l.id)));
                          }}
                          className="w-4 h-4 rounded border-surface-500 bg-surface-800"
                        />
                      </th>
                      <th className="text-left p-3 text-surface-400 font-medium cursor-pointer hover:text-surface-200 select-none" onClick={() => handleSort('companyName')}>Company<SortIcon field="companyName" /></th>
                      <th className="text-left p-3 text-surface-400 font-medium">Decision Maker</th>
                      <th className="text-left p-3 text-surface-400 font-medium cursor-pointer hover:text-surface-200 select-none" onClick={() => handleSort('buyProbability')}>Score<SortIcon field="buyProbability" /></th>
                      <th className="text-left p-3 text-surface-400 font-medium">Status</th>
                      <th className="text-left p-3 text-surface-400 font-medium">Source</th>
                      <th className="text-left p-3 text-surface-400 font-medium">Province</th>
                      <th className="text-left p-3 text-surface-400 font-medium cursor-pointer hover:text-surface-200 select-none" onClick={() => handleSort('createdAt')}>Created<SortIcon field="createdAt" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        className="border-b border-surface-700/50 hover:bg-surface-700/20 cursor-pointer transition-colors"
                      >
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(lead.id)}
                            onChange={() => toggleSelect(lead.id)}
                            className="w-4 h-4 rounded border-surface-500 bg-surface-800"
                          />
                        </td>
                        <td className="p-3">
                          <div className="text-surface-100 font-medium">{lead.companyName}</div>
                          {lead.industry && <div className="text-surface-500 text-xs">{lead.industry}</div>}
                        </td>
                        <td className="p-3">
                          <div className="text-surface-200 text-xs">{lead.decisionMakerName}</div>
                          {lead.decisionMakerEmail && <div className="text-surface-500 text-xs">{lead.decisionMakerEmail}</div>}
                        </td>
                        <td className="p-3">
                          <LeadScoreBadge buyProbability={lead.buyProbability} compact />
                        </td>
                        <td className="p-3">
                          <LeadStatusBadge status={lead.qualificationStatus} />
                        </td>
                        <td className="p-3 text-surface-400 text-xs capitalize">{lead.sourceName.replace('_', ' ')}</td>
                        <td className="p-3 text-surface-400 text-xs">{lead.province}</td>
                        <td className="p-3 text-surface-500 text-xs">{timeAgo(lead.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div variants={fadeInUp} className="flex items-center justify-between">
            <span className="text-sm text-surface-500">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-surface-300">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* New Lead Modal */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="glass rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-surface-100 mb-4">New Lead</h2>
              <LeadForm onSave={handleSaveNew} onCancel={() => setShowNewForm(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
