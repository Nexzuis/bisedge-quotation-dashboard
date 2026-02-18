import { useState, useEffect } from 'react';
import {
  Activity, StickyNote, Phone, Mail, MessageSquare, MapPin, FileText, Send, ArrowRightLeft, Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useActivities } from '../../../hooks/useActivities';
import { staggerContainer, fadeInLeft, scaleIn } from '../shared/motionVariants';
import type { StoredActivity } from '../../../db/interfaces';
import type { ActivityType } from '../../../types/crm';

const ICONS: Record<ActivityType, typeof Activity> = {
  note: StickyNote,
  call: Phone,
  email: Mail,
  meeting: MessageSquare,
  'site-visit': MapPin,
  'quote-created': FileText,
  'quote-sent': Send,
  'stage-change': ArrowRightLeft,
};

const TYPE_COLORS: Record<ActivityType, string> = {
  note: 'bg-surface-600/30 text-surface-400',
  call: 'bg-blue-500/20 text-blue-400',
  email: 'bg-purple-500/20 text-purple-400',
  meeting: 'bg-amber-500/20 text-amber-400',
  'site-visit': 'bg-green-500/20 text-green-400',
  'quote-created': 'bg-teal-500/20 text-teal-400',
  'quote-sent': 'bg-brand-500/20 text-brand-400',
  'stage-change': 'bg-orange-500/20 text-orange-400',
};

interface ActivityTimelineProps {
  companyId: string;
  refreshKey?: number;
}

export function ActivityTimeline({ companyId, refreshKey }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<StoredActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { getByCompany } = useActivities();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getByCompany(companyId);
      setActivities(data);
      setLoading(false);
    };
    load();
  }, [companyId, refreshKey]);

  if (loading) {
    return (
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-500" /> Activity Timeline
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-surface-700/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5">
      <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-brand-500" /> Activity Timeline
        <span className="text-xs text-surface-500 bg-surface-700/50 px-1.5 py-0.5 rounded-full">{activities.length}</span>
      </h3>
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-surface-500">
          <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
            <Clock className="w-10 h-10 text-surface-600 mb-3" />
          </motion.div>
          <div className="text-sm font-medium text-surface-400">No activities yet</div>
          <div className="text-xs text-surface-600 mt-1">Add your first activity using the form above</div>
        </div>
      ) : (
        <motion.div
          className="relative space-y-3 max-h-[500px] overflow-y-auto pr-1"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Vertical connector line */}
          <div className="absolute left-[13px] top-2 bottom-2 w-px bg-gradient-to-b from-brand-500/40 via-surface-600/30 to-transparent" />

          {activities.map((a) => {
            const Icon = ICONS[a.type as ActivityType] || StickyNote;
            const colorClass = TYPE_COLORS[a.type as ActivityType] || TYPE_COLORS.note;
            return (
              <motion.div
                key={a.id}
                variants={fadeInLeft}
                whileHover={{ y: -2, backgroundColor: 'rgba(255,255,255,0.03)' }}
                className="flex gap-3 relative rounded-lg p-1 transition-colors"
              >
                <motion.div variants={scaleIn} className={`p-1.5 rounded ${colorClass} flex-shrink-0 mt-0.5 relative z-10`}>
                  <Icon className="w-3.5 h-3.5" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-surface-200">{a.title}</div>
                  {a.description && (
                    <div className="text-xs text-surface-500 mt-0.5">{a.description}</div>
                  )}
                  <div className="text-[10px] text-surface-600 mt-1">
                    {new Date(a.createdAt).toLocaleString('en-ZA')}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
