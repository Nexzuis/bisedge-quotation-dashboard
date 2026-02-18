/**
 * NotificationsPage
 *
 * Full-page notification inbox.
 * Route: /notifications  (add to App.tsx under RequireAuth)
 *
 * Usage in App.tsx:
 *   const NotificationsPage = lazy(() => import('./components/notifications/NotificationsPage'));
 *   <Route path="/notifications" element={<RequireAuth><Suspense fallback={...}><NotificationsPage /></Suspense></RequireAuth>} />
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  CheckCheck,
  ClipboardCheck,
  CircleCheck,
  FileText,
  Building2,
  GitBranch,
  AtSign,
  Info,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import type { StoredNotification, NotificationType } from '../../types/notifications';
import { staggerContainer, fadeInUp } from '../crm/shared/motionVariants';

// ─── Helpers (duplicated from NotificationBell to keep files standalone) ────

function NotificationIcon({ type }: { type: NotificationType }) {
  const cls = 'w-4 h-4 shrink-0';
  switch (type) {
    case 'approval_needed':   return <ClipboardCheck className={`${cls} text-warning`} />;
    case 'approval_result':   return <CircleCheck className={`${cls} text-success`} />;
    case 'quote_assigned':    return <FileText className={`${cls} text-brand-400`} />;
    case 'company_assigned':  return <Building2 className={`${cls} text-feature-400`} />;
    case 'stage_change':      return <GitBranch className={`${cls} text-brand-300`} />;
    case 'activity_mention':  return <AtSign className={`${cls} text-feature-300`} />;
    case 'system':
    default:                  return <Info className={`${cls} text-surface-300`} />;
  }
}

function timeAgo(isoString: string): string {
  const now  = Date.now();
  const then = new Date(isoString).getTime();
  if (isNaN(then)) return '';
  const diffSec = Math.floor((now - then) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);
  if (diffSec < 60)   return 'Just now';
  if (diffMin < 60)   return `${diffMin}m ago`;
  if (diffHr  < 24)   return `${diffHr}h ago`;
  if (diffDay === 1)  return 'Yesterday';
  if (diffDay < 7)    return `${diffDay}d ago`;
  return new Date(isoString).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Filter tabs ─────────────────────────────────────────────────────────────

type Filter = 'all' | 'unread' | 'read';

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All',    value: 'all'    },
  { label: 'Unread', value: 'unread' },
  { label: 'Read',   value: 'read'   },
];

// ─── Row ─────────────────────────────────────────────────────────────────────

function NotificationRow({
  notification,
  onRead,
  onNavigate,
}: {
  notification: StoredNotification;
  onRead: (id: string) => void;
  onNavigate: (n: StoredNotification) => void;
}) {
  const { id, type, title, message, isRead, createdAt } = notification;

  const handleClick = () => {
    if (!isRead) onRead(id);
    onNavigate(notification);
  };

  return (
    <motion.button
      variants={fadeInUp}
      onClick={handleClick}
      className={[
        'w-full text-left flex items-start gap-4 px-5 py-4 transition-colors',
        'hover:bg-surface-700/30 focus:outline-none focus-visible:bg-surface-700/30',
        'border-l-2',
        isRead ? 'border-l-transparent' : 'border-l-brand-500',
      ].join(' ')}
    >
      {/* Icon */}
      <div className="mt-0.5 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-surface-700/60">
        <NotificationIcon type={type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className={[
            'text-sm leading-snug',
            isRead ? 'text-surface-300 font-normal' : 'text-surface-100 font-semibold',
          ].join(' ')}>
            {title}
          </p>
          <span className="text-xs text-surface-500 whitespace-nowrap shrink-0 mt-0.5">
            {timeAgo(createdAt)}
          </span>
        </div>
        <p className="text-xs text-surface-400 mt-1 leading-relaxed">{message}</p>
      </div>

      {/* Unread indicator + chevron */}
      <div className="flex flex-col items-center gap-1 pt-1">
        {!isRead && (
          <span className="w-2 h-2 rounded-full bg-brand-500" aria-hidden="true" />
        )}
        <ChevronRight className="w-4 h-4 text-surface-600 mt-auto" />
      </div>
    </motion.button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read')   return n.isRead;
    return true;
  });

  const handleNavigate = (n: StoredNotification) => {
    if (!n.entityType || !n.entityId) return;
    switch (n.entityType) {
      case 'quote':    navigate(`/quote?id=${n.entityId}`); break;
      case 'company':  navigate(`/customers/${n.entityId}`); break;
      case 'activity': navigate(`/customers?activity=${n.entityId}`); break;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-3xl mx-auto">

        {/* Back navigation */}
        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-100 mb-5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </motion.button>

        {/* Page heading */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-600/20">
              <Bell className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-surface-100">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-surface-400">{unreadCount} unread</p>
              )}
            </div>
          </div>

          {unreadCount > 0 && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors px-3 py-1.5 bg-brand-600/10 hover:bg-brand-600/20 rounded-lg"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </motion.button>
          )}
        </motion.div>

        {/* Filter tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-1 mb-4 p-1 bg-surface-800/60 rounded-lg w-fit"
        >
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={[
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                filter === f.value
                  ? 'bg-brand-600/25 text-brand-300'
                  : 'text-surface-400 hover:text-surface-200',
              ].join(' ')}
            >
              {f.label}
              {f.value === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-danger text-white text-2xs rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Notification list */}
        <div className="glass rounded-xl overflow-hidden">
          {isLoading && filtered.length === 0 ? (
            <div className="flex flex-col gap-3 p-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-surface-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-surface-700 rounded w-2/3" />
                    <div className="h-3 bg-surface-700 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={filter}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center"
                >
                  {filter === 'unread' ? (
                    <>
                      <Inbox className="w-12 h-12 text-surface-600 mb-3" />
                      <p className="text-sm font-medium text-surface-300">All caught up</p>
                      <p className="text-xs text-surface-500 mt-1">No unread notifications.</p>
                    </>
                  ) : (
                    <>
                      <BellOff className="w-12 h-12 text-surface-600 mb-3" />
                      <p className="text-sm font-medium text-surface-300">No notifications yet</p>
                      <p className="text-xs text-surface-500 mt-1">
                        Notifications will appear here as activity happens.
                      </p>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <motion.div
              key={filter}
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="divide-y divide-surface-700/40"
            >
              {filtered.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onRead={markAsRead}
                  onNavigate={handleNavigate}
                />
              ))}
            </motion.div>
          )}
        </div>

        {/* Footer count */}
        {filtered.length > 0 && (
          <p className="text-center text-xs text-surface-600 mt-4">
            Showing {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
