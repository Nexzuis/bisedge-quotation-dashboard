import { useNavigate } from 'react-router-dom';
import { DollarSign, Users, FileText, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatZAR } from '../../../engine/formatters';
import { useAnimatedCounter } from '../../../hooks/useAnimatedCounter';
import { staggerContainer, fadeInUp } from '../shared/motionVariants';
import type { PipelineMetrics } from '../../../types/crm';

interface MetricCardsProps {
  metrics: PipelineMetrics | null;
  userMetrics?: PipelineMetrics | null;
  loading: boolean;
}

function AnimatedMetricValue({ value, isCurrency }: { value: number; isCurrency?: boolean }) {
  const display = useAnimatedCounter(value);
  if (isCurrency) {
    return <span>R {display}</span>;
  }
  return <span>{display}</span>;
}

export function MetricCards({ metrics, userMetrics, loading }: MetricCardsProps) {
  const navigate = useNavigate();

  const cards = [
    {
      label: 'Pipeline Value',
      value: metrics ? metrics.totalPipelineValue : 0,
      userValue: userMetrics ? userMetrics.totalPipelineValue : null,
      icon: DollarSign,
      color: 'text-brand-400',
      bg: 'bg-brand-500/10',
      isCurrency: true,
      onClick: () => navigate('/customers'),
    },
    {
      label: 'Active Leads',
      value: metrics ? metrics.activeLeads : 0,
      userValue: userMetrics ? userMetrics.activeLeads : null,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      isCurrency: false,
      onClick: () => navigate('/customers', { state: { filterStage: 'lead' } }),
    },
    {
      label: 'Quotes This Month',
      value: metrics ? metrics.quotesThisMonth : 0,
      userValue: null,
      icon: FileText,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      isCurrency: false,
      onClick: () => navigate('/quotes', { state: { filterThisMonth: true } }),
    },
    {
      label: 'Won This Month',
      value: metrics ? metrics.wonThisMonth : 0,
      userValue: userMetrics ? userMetrics.wonThisMonth : null,
      icon: Trophy,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      isCurrency: false,
      onClick: () => navigate('/customers', { state: { filterStage: 'won' } }),
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            variants={fadeInUp}
            whileHover={{ scale: 1.03, boxShadow: '0 8px 32px rgba(0, 212, 255, 0.12)' }}
            whileTap={{ scale: 0.97 }}
            onClick={card.onClick}
            className="glass rounded-xl p-4 glow-brand-hover cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${card.bg}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-surface-400">{card.label}</div>
                <div className={`text-xl font-bold ${loading ? 'animate-pulse text-surface-500' : 'text-surface-100'}`}>
                  {loading ? '...' : metrics ? (
                    <AnimatedMetricValue value={card.value} isCurrency={card.isCurrency} />
                  ) : '—'}
                </div>
                {!loading && card.userValue !== null && (
                  <div className="text-xs text-surface-500 mt-0.5">
                    Yours: {card.isCurrency ? formatZAR(card.userValue, false) : card.userValue}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
