import { useState, useEffect } from 'react';
import { Database, Users, FileText, Building2, Activity, Bell, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getDb } from '../../../db/DatabaseAdapter';
import { fadeInUp, staggerContainer } from '../../crm/shared/motionVariants';

interface DbStats {
  quotes: number;
  companies: number;
  contacts: number;
  activities: number;
  users: number;
  notifications: number;
}

export function SystemHealthWidget() {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const counts = await getDb().getTableCounts();
      setStats({
        quotes: counts.quotes ?? 0,
        companies: counts.companies ?? 0,
        contacts: counts.contacts ?? 0,
        activities: counts.activities ?? 0,
        users: counts.users ?? 0,
        notifications: counts.notifications ?? 0,
      });
    } catch (err) {
      console.error('Error loading DB stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const statItems = stats ? [
    { label: 'Quotes', value: stats.quotes, icon: FileText, color: 'text-brand-400' },
    { label: 'Companies', value: stats.companies, icon: Building2, color: 'text-blue-400' },
    { label: 'Contacts', value: stats.contacts, icon: Users, color: 'text-purple-400' },
    { label: 'Activities', value: stats.activities, icon: Activity, color: 'text-green-400' },
    { label: 'Users', value: stats.users, icon: Users, color: 'text-amber-400' },
    { label: 'Notifications', value: stats.notifications, icon: Bell, color: 'text-red-400' },
  ] : [];

  return (
    <motion.div variants={fadeInUp} className="glass rounded-xl p-5 border border-red-500/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-surface-300 flex items-center gap-2">
          <Database className="w-4 h-4 text-red-400" />
          System Health
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-3 sm:grid-cols-6 gap-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                variants={fadeInUp}
                className="bg-surface-700/30 rounded-lg p-3 text-center"
              >
                <Icon className={`w-4 h-4 mx-auto mb-1 ${item.color}`} />
                <div className="text-lg font-bold text-surface-100">{item.value}</div>
                <div className="text-xs text-surface-500">{item.label}</div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
