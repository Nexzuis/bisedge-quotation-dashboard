import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RecentActivityFeed } from '../../crm/dashboard/RecentActivityFeed';
import { useActivities } from '../../../hooks/useActivities';
import { fadeInUp } from '../../crm/shared/motionVariants';
import type { StoredActivity } from '../../../db/interfaces';

export function RecentActivityWidget() {
  const [activities, setActivities] = useState<StoredActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { getRecent } = useActivities();

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const recent = await getRecent(10);
      setActivities(recent);
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div variants={fadeInUp}>
      <RecentActivityFeed activities={activities} loading={loading} />
    </motion.div>
  );
}
