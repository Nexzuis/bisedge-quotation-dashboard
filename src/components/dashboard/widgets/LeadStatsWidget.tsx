import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Flame, ArrowRightCircle, ChevronRight } from 'lucide-react';
import { useLeadStats } from '../../../hooks/useLeadStats';
import { useLeadStore } from '../../../store/useLeadStore';
import { fadeInUp } from '../../crm/shared/motionVariants';
import type { LeadStats } from '../../../types/leads';

export function LeadStatsWidget() {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const { getStats } = useLeadStats();
  const navigate = useNavigate();
  const setStatusFilter = useLeadStore((s) => s.setStatusFilter);
  const resetFilters = useLeadStore((s) => s.resetFilters);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  if (!stats || stats.total === 0) return null;

  return (
    <motion.div variants={fadeInUp} className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-400" />
          Lead Pipeline
        </h3>
        <button
          onClick={() => navigate('/leads')}
          className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
        >
          View All <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div
          onClick={() => { resetFilters(); setStatusFilter('new'); navigate('/leads'); }}
          className="text-center cursor-pointer hover:bg-surface-700/20 rounded-lg p-2 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mx-auto mb-1.5">
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-xl font-bold text-surface-100">{stats.byStatus.new}</p>
          <p className="text-xs text-surface-500">New</p>
        </div>

        <div
          onClick={() => navigate('/leads/hot')}
          className="text-center cursor-pointer hover:bg-surface-700/20 rounded-lg p-2 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center mx-auto mb-1.5">
            <Flame className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-xl font-bold text-surface-100">{stats.hotLeads}</p>
          <p className="text-xs text-surface-500">Hot</p>
        </div>

        <div
          onClick={() => { resetFilters(); setStatusFilter('converted'); navigate('/leads'); }}
          className="text-center cursor-pointer hover:bg-surface-700/20 rounded-lg p-2 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mx-auto mb-1.5">
            <ArrowRightCircle className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-surface-100">{stats.byStatus.converted}</p>
          <p className="text-xs text-surface-500">Converted</p>
        </div>
      </div>
    </motion.div>
  );
}
