import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PipelineOverviewBar } from '../../crm/dashboard/PipelineOverviewBar';
import { usePipelineMetrics } from '../../../hooks/usePipelineMetrics';
import { fadeInUp } from '../../crm/shared/motionVariants';
import type { PipelineMetrics } from '../../../types/crm';

export function PipelineWidget() {
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const { getMetrics } = usePipelineMetrics();

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const m = await getMetrics();
      setMetrics(m);
    } catch (err) {
      console.error('Error loading pipeline metrics:', err);
    }
  };

  return (
    <motion.div variants={fadeInUp}>
      <PipelineOverviewBar metrics={metrics} />
    </motion.div>
  );
}
