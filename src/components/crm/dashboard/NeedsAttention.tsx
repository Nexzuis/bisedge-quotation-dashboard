import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInLeft } from '../shared/motionVariants';
import type { StoredCompany } from '../../../db/interfaces';

interface NeedsAttentionProps {
  companies: StoredCompany[];
  loading: boolean;
}

export function NeedsAttention({ companies, loading }: NeedsAttentionProps) {
  const navigate = useNavigate();

  // Filter companies that need attention: active pipeline + not updated in 14 days
  const staleThreshold = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const needsAttention = companies.filter(
    (c) =>
      c.pipelineStage !== 'won' &&
      c.pipelineStage !== 'lost' &&
      new Date(c.updatedAt).getTime() < staleThreshold
  );

  return (
    <div className="glass rounded-xl p-5">
      <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        Needs Attention
      </h3>
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 bg-surface-700/50 rounded animate-pulse" />
          ))}
        </div>
      ) : needsAttention.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-surface-500">
          <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
            <CheckCircle className="w-10 h-10 text-surface-600 mb-3" />
          </motion.div>
          <div className="text-sm font-medium text-surface-400">All caught up!</div>
          <div className="text-xs text-surface-600 mt-1">No companies need follow-up right now</div>
        </div>
      ) : (
        <motion.div
          className="space-y-2 max-h-[320px] overflow-y-auto pr-1"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {needsAttention.slice(0, 10).map((company) => {
            const daysSince = Math.floor(
              (Date.now() - new Date(company.updatedAt).getTime()) / (24 * 60 * 60 * 1000)
            );
            return (
              <motion.div
                key={company.id}
                variants={fadeInLeft}
                whileHover={{ y: -2, backgroundColor: 'rgba(255,255,255,0.03)' }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-700/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/customers/${company.id}`)}
              >
                <motion.div
                  className="w-2 h-2 rounded-full bg-amber-400"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-surface-200 truncate">{company.name}</div>
                </div>
                <div className={`text-xs font-medium ${daysSince >= 21 ? 'bg-gradient-to-r from-amber-400 to-red-400 bg-clip-text text-transparent' : 'text-amber-400'}`}>
                  {daysSince}d no contact
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
