import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Zap, TrendingUp, Users, CheckCircle2, ArrowRightCircle, Flame } from 'lucide-react';
import { CrmTopBar } from '../crm/CrmTopBar';
import { useLeadStats } from '../../hooks/useLeadStats';
import { staggerContainer, fadeInUp } from '../crm/shared/motionVariants';
import type { LeadStats } from '../../types/leads';

export default function LeadDashboardPage() {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { getStats } = useLeadStats();
  const navigate = useNavigate();

  useEffect(() => {
    getStats().then((s) => { setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: 'Total Leads', value: stats.total, icon: Users, color: 'text-brand-400', bg: 'bg-brand-500/20' },
    { label: 'New', value: stats.byStatus.new, icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Qualified', value: stats.byStatus.qualified, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20' },
    { label: 'Converted', value: stats.byStatus.converted, icon: ArrowRightCircle, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { label: 'Hot Leads', value: stats.hotLeads, icon: Flame, color: 'text-red-400', bg: 'bg-red-500/20', onClick: () => navigate('/leads/hot') },
  ] : [];

  const funnelStages = stats ? [
    { label: 'New', count: stats.byStatus.new, color: 'bg-blue-500' },
    { label: 'Reviewing', count: stats.byStatus.reviewing, color: 'bg-purple-500' },
    { label: 'Qualified', count: stats.byStatus.qualified, color: 'bg-green-500' },
    { label: 'Contacted', count: stats.byStatus.contacted, color: 'bg-teal-500' },
    { label: 'Converted', count: stats.byStatus.converted, color: 'bg-amber-500' },
  ] : [];
  const maxFunnel = Math.max(...funnelStages.map((s) => s.count), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
      <motion.div className="max-w-7xl mx-auto p-4 space-y-4" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeInUp}><CrmTopBar /></motion.div>

        <motion.div variants={fadeInUp} className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-brand-400" />
          <h1 className="text-2xl font-bold text-surface-100">Lead Dashboard</h1>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass rounded-xl p-4 h-24 animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Stat Cards */}
            <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    onClick={card.onClick}
                    className={`glass rounded-xl p-4 ${card.onClick ? 'cursor-pointer hover:border-surface-500/50' : ''} border border-surface-600/50`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
                      <Icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                    <p className="text-2xl font-bold text-surface-100">{card.value}</p>
                    <p className="text-xs text-surface-500">{card.label}</p>
                  </div>
                );
              })}
            </motion.div>

            {/* Conversion Funnel */}
            <motion.div variants={fadeInUp} className="glass rounded-xl p-5">
              <h3 className="text-sm font-semibold text-surface-200 mb-4">Conversion Funnel</h3>
              <div className="space-y-3">
                {funnelStages.map((stage) => (
                  <div key={stage.label} className="flex items-center gap-3">
                    <span className="text-xs text-surface-400 w-20">{stage.label}</span>
                    <div className="flex-1 bg-surface-700/30 rounded-full h-6 overflow-hidden">
                      <div
                        className={`h-full ${stage.color} rounded-full flex items-center px-2 transition-all`}
                        style={{ width: `${Math.max((stage.count / maxFunnel) * 100, 2)}%` }}
                      >
                        <span className="text-white text-xs font-medium">{stage.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* By Source */}
              <motion.div variants={fadeInUp} className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold text-surface-200 mb-3">By Source</h3>
                <BarList data={stats.bySource} />
              </motion.div>

              {/* By Province */}
              <motion.div variants={fadeInUp} className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold text-surface-200 mb-3">By Province</h3>
                <BarList data={stats.byProvince} />
              </motion.div>

              {/* By Industry */}
              <motion.div variants={fadeInUp} className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold text-surface-200 mb-3">By Industry</h3>
                <BarList data={stats.byIndustry} />
              </motion.div>
            </div>

            {/* Score Distribution */}
            <motion.div variants={fadeInUp} className="glass rounded-xl p-5">
              <h3 className="text-sm font-semibold text-surface-200 mb-3">Score Distribution</h3>
              <div className="flex items-end gap-2 h-32">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
                  const count = stats.scoreDistribution[score] || 0;
                  const maxScore = Math.max(...Object.values(stats.scoreDistribution), 1);
                  const height = Math.max((count / maxScore) * 100, 4);
                  return (
                    <div key={score} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-surface-500">{count}</span>
                      <div
                        className={`w-full rounded-t ${score >= 8 ? 'bg-green-500' : score >= 5 ? 'bg-amber-500' : 'bg-surface-600'}`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-[10px] text-surface-500">{score}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Summary Stats */}
            <motion.div variants={fadeInUp} className="glass rounded-xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-surface-500">Average Score</p>
                <p className="text-xl font-bold text-surface-100">{stats.averageScore}/10</p>
              </div>
              <div>
                <p className="text-xs text-surface-500">Average Confidence</p>
                <p className="text-xl font-bold text-surface-100">{stats.averageConfidence}%</p>
              </div>
              <div>
                <p className="text-xs text-surface-500">Rejected</p>
                <p className="text-xl font-bold text-red-400">{stats.byStatus.rejected}</p>
              </div>
              <div>
                <p className="text-xs text-surface-500">Stale</p>
                <p className="text-xl font-bold text-surface-500">{stats.byStatus.stale}</p>
              </div>
            </motion.div>
          </>
        ) : (
          <div className="glass rounded-xl p-12 text-center text-surface-500">No lead data available</div>
        )}
      </motion.div>
    </div>
  );
}

function BarList({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  if (entries.length === 0) return <p className="text-surface-500 text-xs">No data</p>;

  return (
    <div className="space-y-2">
      {entries.map(([label, value]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-xs text-surface-400 w-24 truncate capitalize">{label.replace('_', ' ')}</span>
          <div className="flex-1 bg-surface-700/30 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-brand-500/60 rounded-full"
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-surface-400 w-8 text-right">{value}</span>
        </div>
      ))}
    </div>
  );
}
