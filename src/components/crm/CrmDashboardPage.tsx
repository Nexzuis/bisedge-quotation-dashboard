import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CrmTopBar } from './CrmTopBar';
import { QuickActions } from './dashboard/QuickActions';
import { MetricCards } from './dashboard/MetricCards';
import { PipelineOverviewBar } from './dashboard/PipelineOverviewBar';
import { RecentActivityFeed } from './dashboard/RecentActivityFeed';
import { NeedsAttention } from './dashboard/NeedsAttention';
import { usePipelineMetrics } from '../../hooks/usePipelineMetrics';
import { useActivities } from '../../hooks/useActivities';
import { useCompanies } from '../../hooks/useCompanies';
import { useAuth } from '../auth/AuthContext';
import { staggerContainer, fadeInUp } from './shared/motionVariants';
import type { PipelineMetrics } from '../../types/crm';
import type { StoredActivity, StoredCompany } from '../../db/interfaces';

export default function CrmDashboardPage() {
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [userMetrics, setUserMetrics] = useState<PipelineMetrics | null>(null);
  const [activities, setActivities] = useState<StoredActivity[]>([]);
  const [companies, setCompanies] = useState<StoredCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const { getMetrics } = usePipelineMetrics();
  const { getRecent } = useActivities();
  const { listCompanies } = useCompanies();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, um, a, c] = await Promise.all([
        getMetrics(),
        user ? getMetrics(user.id) : Promise.resolve(null),
        getRecent(15),
        listCompanies(),
      ]);
      setMetrics(m);
      setUserMetrics(um);
      setActivities(a);
      setCompanies(c);
    } catch (err) {
      console.error('Failed to load CRM dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900 flex items-center justify-center p-8">
        <div className="glass rounded-xl p-8 max-w-md text-center">
          <div className="text-red-400 text-lg font-semibold mb-2">Failed to load</div>
          <p className="text-surface-400 mb-4">{error}</p>
          <button onClick={load} className="btn btn-primary px-6 py-2">Retry</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
        <div className="max-w-7xl mx-auto p-4 space-y-4">
          <div className="h-12 bg-surface-800/40 rounded-xl animate-pulse" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 flex-1 bg-surface-800/40 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass rounded-xl p-4 h-24 animate-pulse" />
            ))}
          </div>
          <div className="glass rounded-xl p-6 h-16 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="glass rounded-xl p-5 h-64 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

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
        <motion.div variants={fadeInUp}>
          <QuickActions />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <MetricCards metrics={metrics} userMetrics={userMetrics} loading={loading} />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <PipelineOverviewBar metrics={metrics} />
        </motion.div>
        <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentActivityFeed activities={activities} loading={loading} />
          <NeedsAttention companies={companies} loading={loading} />
        </motion.div>
      </motion.div>
    </div>
  );
}
