/**
 * NotificationBell
 *
 * Dropdown notification center for the app's top navigation bar.
 *
 * Usage:
 *   import { NotificationBell } from '../notifications/NotificationBell';
 *   // Drop inside CrmTopBar or any navigation shell
 *   <NotificationBell />
 */

import { useRef, useEffect, useCallback } from 'react';
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
  ChevronRight,
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import type { StoredNotification, NotificationType } from '../../types/notifications';
import { fadeInUp } from '../crm/shared/motionVariants';
import { useState } from 'react';

// ─── Motion variants ─────────────────────────────────────────────────────────

const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: { duration: 0.14, ease: 'easeIn' },
  },
};

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

// ─── Icon map ────────────────────────────────────────────────────────────────

function NotificationIcon({ type }: { type: NotificationType }) {
  const cls = 'w-4 h-4 shrink-0';

  switch (type) {
    case 'approval_needed':
      return <ClipboardCheck className={`${cls} text-warning`} />;
    case 'approval_result':
      return <CircleCheck className={`${cls} text-success`} />;
    case 'quote_assigned':
      return <FileText className={`${cls} text-brand-400`} />;
    case 'company_assigned':
      return <Building2 className={`${cls} text-feature-400`} />;
    case 'stage_change':
      return <GitBranch className={`${cls} text-brand-300`} />;
    case 'activity_mention':
      return <AtSign className={`${cls} text-feature-300`} />;
    case 'system':
    default:
      return <Info className={`${cls} text-surface-300`} />;
  }
}

// ─── Time-ago formatter ──────────────────────────────────────────────────────

function timeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (isNaN(then)) return '';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);

  if (diffSec < 60)   return 'Just now';
  if (diffMin < 60)   return `${diffMin}m ago`;
  if (diffHr  < 24)   return `${diffHr}h ago`;
  if (diffDay === 1)  return 'Yesterday';
  if (diffDay < 7)    return `${diffDay}d ago`;

  return new Date(isoString).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
  });
}

// ─── Single notification row ─────────────────────────────────────────────────

interface NotificationRowProps {
  notification: StoredNotification;
  onRead: (id: string) => void;
  onNavigate: (n: StoredNotification) => void;
}

function NotificationRow({ notification, onRead, onNavigate }: NotificationRowProps) {
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
        'w-full text-left flex items-start gap-3 px-4 py-3 transition-colors',
        'hover:bg-surface-700/40 focus:outline-none focus-visible:bg-surface-700/40',
        'border-l-2',
        isRead ? 'border-l-transparent' : 'border-l-brand-500',
      ].join(' ')}
    >
      {/* Icon */}
      <div className="mt-0.5 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-surface-700/60">
        <NotificationIcon type={type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={[
            'text-sm leading-snug truncate',
            isRead ? 'text-surface-300 font-normal' : 'text-surface-100 font-semibold',
          ].join(' ')}
        >
          {title}
        </p>
        <p className="text-xs text-surface-400 mt-0.5 line-clamp-2 leading-relaxed">
          {message}
        </p>
        <p className="text-2xs text-surface-500 mt-1">{timeAgo(createdAt)}</p>
      </div>

      {/* Unread dot + chevron */}
      <div className="flex flex-col items-end gap-1 ml-1 mt-0.5">
        {!isRead && (
          <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" aria-hidden="true" />
        )}
        <ChevronRight className="w-3 h-3 text-surface-600 mt-auto" />
      </div>
    </motion.button>
  );
}

// ─── NotificationBell ────────────────────────────────────────────────────────

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const handleNavigate = useCallback(
    (n: StoredNotification) => {
      setIsOpen(false);
      if (!n.entityType || !n.entityId) return;

      switch (n.entityType) {
        case 'quote':
          navigate(`/quote?id=${n.entityId}`);
          break;
        case 'company':
          navigate(`/customers/${n.entityId}`);
          break;
        case 'activity':
          navigate(`/customers?activity=${n.entityId}`);
          break;
      }
    },
    [navigate]
  );

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell trigger button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={[
          'relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          isOpen
            ? 'bg-brand-600/20 text-brand-400'
            : 'text-surface-400 hover:text-surface-100 hover:bg-surface-700/50',
        ].join(' ')}
      >
        <Bell className="w-5 h-5" />

        {/* Unread count badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className={[
                'absolute -top-1 -right-1 flex items-center justify-center',
                'min-w-[1.1rem] h-[1.1rem] px-0.5',
                'rounded-full bg-danger text-white font-bold leading-none',
                'text-2xs pointer-events-none',
              ].join(' ')}
              aria-hidden="true"
            >
              {displayCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="notification-panel"
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={[
              'absolute right-0 top-full mt-2 z-50',
              'w-[22rem] sm:w-[26rem]',
              'glass rounded-xl overflow-hidden',
              'border border-surface-600/60 shadow-xl',
            ].join(' ')}
            role="dialog"
            aria-label="Notifications panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700/60">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-400" />
                <h2 className="text-sm font-semibold text-surface-100">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-brand-600/30 text-brand-300 text-2xs font-semibold">
                    {displayCount} new
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                  aria-label="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </motion.button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-[26rem] overflow-y-auto overscroll-contain scrollbar-thin">
              {isLoading && notifications.length === 0 ? (
                <div className="flex flex-col gap-2 p-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3 animate-pulse">
                      <div className="w-7 h-7 rounded-full bg-surface-700 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-surface-700 rounded w-3/4" />
                        <div className="h-2.5 bg-surface-700 rounded w-full" />
                        <div className="h-2 bg-surface-700 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <BellOff className="w-10 h-10 text-surface-600 mb-3" />
                  <p className="text-sm font-medium text-surface-300">All caught up</p>
                  <p className="text-xs text-surface-500 mt-1">No notifications to show.</p>
                </div>
              ) : (
                <motion.div
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                  className="divide-y divide-surface-700/40"
                >
                  {notifications.map((n) => (
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

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-surface-700/60 px-4 py-2.5">
                <motion.button
                  whileHover={{ x: 2 }}
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/notifications');
                  }}
                  className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors w-full justify-center"
                >
                  View all notifications
                  <ChevronRight className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
