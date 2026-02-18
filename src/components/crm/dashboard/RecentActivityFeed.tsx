import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Phone, Mail, MapPin, FileText, Send, ArrowRightLeft, StickyNote, Inbox,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInLeft, scaleIn } from '../shared/motionVariants';
import type { StoredActivity } from '../../../db/interfaces';
import type { ActivityType } from '../../../types/crm';

const ACTIVITY_ICONS: Record<ActivityType, typeof MessageSquare> = {
  note: StickyNote,
  call: Phone,
  email: Mail,
  meeting: MessageSquare,
  'site-visit': MapPin,
  'quote-created': FileText,
  'quote-sent': Send,
  'stage-change': ArrowRightLeft,
};

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface RecentActivityFeedProps {
  activities: StoredActivity[];
  loading: boolean;
}

export function RecentActivityFeed({ activities, loading }: RecentActivityFeedProps) {
  const navigate = useNavigate();

  return (
    <div className="glass rounded-xl p-5">
      <h3 className="text-sm font-semibold text-surface-300 mb-4">Recent Activity</h3>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-surface-700/50 rounded animate-pulse" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-surface-500">
          <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
            <Inbox className="w-10 h-10 text-surface-600 mb-3" />
          </motion.div>
          <div className="text-sm font-medium text-surface-400">No activities yet</div>
          <div className="text-xs text-surface-600 mt-1">Activities will appear here as you interact with customers</div>
        </div>
      ) : (
        <motion.div
          className="space-y-2 max-h-[320px] overflow-y-auto pr-1"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.type as ActivityType] || StickyNote;
            return (
              <motion.div
                key={activity.id}
                variants={fadeInLeft}
                whileHover={{ y: -2, backgroundColor: 'rgba(255,255,255,0.03)' }}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-surface-700/30 transition-colors cursor-pointer"
                onClick={() => activity.companyId && navigate(`/customers/${activity.companyId}`)}
              >
                <motion.div variants={scaleIn} className="p-1.5 bg-surface-700/50 rounded">
                  <Icon className="w-3.5 h-3.5 text-surface-400" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-surface-200 truncate">{activity.title}</div>
                  {activity.description && (
                    <div className="text-xs text-surface-500 truncate">{activity.description}</div>
                  )}
                </div>
                <div className="text-xs text-surface-500 whitespace-nowrap">{timeAgo(activity.createdAt)}</div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
