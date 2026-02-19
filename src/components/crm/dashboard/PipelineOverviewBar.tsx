import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { PipelineMetrics } from '../../../types/crm';
import type { PipelineStage } from '../../../types/crm';
import { PIPELINE_STAGES } from '../shared/stageConfig';

interface PipelineOverviewBarProps {
  metrics: PipelineMetrics | null;
}

export function PipelineOverviewBar({ metrics }: PipelineOverviewBarProps) {
  const navigate = useNavigate();

  if (!metrics) return null;

  const activeStages = PIPELINE_STAGES.filter((s) => s.key !== 'won' && s.key !== 'lost');
  const total = activeStages.reduce((sum, s) => sum + (metrics.countByStage[s.key] || 0), 0);

  if (total === 0) {
    return (
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-semibold text-surface-300 mb-4">Pipeline Overview</h3>
        <div className="text-center text-surface-500 py-4">No active pipeline companies yet</div>
      </div>
    );
  }

  // Bar colors matching stage config — use solid Tailwind bg classes
  const barColors: Record<string, string> = {
    lead: 'bg-surface-500',
    contacted: 'bg-blue-500',
    'site-assessment': 'bg-purple-500',
    quoted: 'bg-teal-500',
    negotiation: 'bg-amber-500',
  };

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-sm font-semibold text-surface-300 mb-4">Pipeline Overview</h3>
      <div className="flex rounded-lg overflow-hidden h-8">
        {activeStages.map((stage) => {
          const count = metrics.countByStage[stage.key] || 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <motion.div
              key={stage.key}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              whileHover={{ filter: 'brightness(1.2)' }}
              onClick={() => navigate('/customers', { state: { filterStage: stage.key } })}
              className={`${barColors[stage.key] || 'bg-surface-600'} flex items-center justify-center text-xs font-medium text-white min-w-[40px] transition-[filter] duration-200 cursor-pointer`}
              title={`${stage.label}: ${count} — Click to filter`}
            >
              {pct > 10 ? count : ''}
            </motion.div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 mt-3">
        {activeStages.map((stage) => {
          const count = metrics.countByStage[stage.key] || 0;
          return (
            <motion.button
              key={stage.key}
              className="flex items-center gap-1.5 text-xs"
              whileHover={{ scale: 1.05, opacity: 1 }}
              style={{ opacity: 0.8 }}
              onClick={() => navigate('/customers', { state: { filterStage: stage.key } })}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${barColors[stage.key] || 'bg-surface-600'}`} />
              <span className="text-surface-400">{stage.label}</span>
              <span className="text-surface-200 font-medium">{count}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
