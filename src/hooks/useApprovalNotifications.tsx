/**
 * Approval Notifications Hook
 *
 * Track C4-6 fix: The original implementation listened for INSERT events on
 * the `approval_actions` table, but nothing in the application ever inserts
 * into that table --- so notifications never fired (dead code).
 *
 * This rewrite subscribes to UPDATE events on the `quotes` table and detects
 * changes to the `status` column (e.g. pending-approval -> approved/rejected).
 * When a relevant status transition is detected, a toast notification is shown
 * to the current user.
 *
 * The hook must be called once at the app shell level (e.g. AppContent) so the
 * subscription lives for the duration of the session.
 */

import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase, FEATURES } from '../lib/supabase';
import { toast } from '../components/ui/Toast';
import { logger } from '../utils/logger';

/** Statuses that represent a quote entering the review pipeline. */
const REVIEW_STATUSES = ['pending-approval', 'in-review'] as const;

/**
 * Subscribe to real-time quote status changes and show approval-related
 * toast notifications for the current user.
 *
 * - Quote owners see notifications when their quote is approved/rejected.
 * - Managers/approvers see notifications when new quotes are submitted for
 *   their review.
 */
export function useApprovalNotifications() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user || !FEATURES.realtime) {
      return;
    }

    logger.debug('Setting up approval notifications for user:', user.email);

    const channel = supabase
      .channel('approval-status-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quotes',
          filter: 'status=in.(pending-approval,in-review,approved,rejected,changes-requested)',
        },
        (payload) => {
          const oldRecord = payload.old as Record<string, unknown>;
          const newRecord = payload.new as Record<string, unknown>;

          // Skip if there is no new record at all.
          if (!newRecord) return;

          // Only process confirmed status transitions.
          // If payload.old is empty (Postgres without full replica identity),
          // skip to avoid false-positive notifications on non-status updates.
          const hasOldStatus = oldRecord && 'status' in oldRecord && oldRecord.status != null;
          if (!hasOldStatus) {
            logger.debug('Skipping approval notification: old status unavailable (replica identity not full)');
            return;
          }
          if (oldRecord.status === newRecord.status) {
            return;
          }

          const newStatus = newRecord.status as string;
          const quoteRef = (newRecord.quote_ref as string) || 'Unknown';
          const createdBy = newRecord.created_by as string | null;
          const currentAssigneeId = newRecord.current_assignee_id as string | null;

          logger.debug('Quote status changed:', {
            quoteRef,
            from: oldRecord.status,
            to: newStatus,
          });

          // --- Notifications for the quote owner ---
          if (createdBy === user.id) {
            if (newStatus === 'approved') {
              toast.success('Quote Approved', {
                description: `Quote ${quoteRef} has been approved.`,
                duration: 10000,
              });
            } else if (newStatus === 'rejected') {
              toast.error('Quote Rejected', {
                description: `Quote ${quoteRef} has been rejected.`,
                duration: 15000,
              });
            } else if (newStatus === 'changes-requested') {
              toast.warning('Changes Requested', {
                description: `Changes were requested on Quote ${quoteRef}.`,
                duration: 12000,
              });
            }
          }

          // --- Notifications for approvers / reviewers ---
          // If the quote was just assigned to the current user for review,
          // notify them so they can act on it.
          if (
            currentAssigneeId === user.id &&
            createdBy !== user.id &&
            (REVIEW_STATUSES as readonly string[]).includes(newStatus)
          ) {
            toast.info('New Quote Needs Review', {
              description: `Quote ${quoteRef} has been submitted for your approval.`,
              duration: 12000,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('Approval notifications active (quotes table)');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Failed to subscribe to approval notifications');
        }
      });

    return () => {
      logger.debug('Unsubscribing from approval notifications');
      channel.unsubscribe();
    };
  }, [user]);
}
