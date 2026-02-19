/**
 * Approval Notifications Hook
 *
 * Listens for approval/rejection events on user's quotes and shows
 * real-time toast notifications.
 */

import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase, FEATURES } from '../lib/supabase';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Bell } from 'lucide-react';
import { logger } from '../utils/logger';

/**
 * Subscribe to approval notifications for current user's quotes
 */
export function useApprovalNotifications() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || !FEATURES.realtime) {
      return;
    }

    logger.debug('Setting up approval notifications for user:', user.email);

    // Subscribe to approval actions on user's quotes
    const subscription = supabase
      .channel('my-approval-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'approval_actions',
        },
        async (payload) => {
          const action = payload.new;

          logger.debug('Approval action received:', action);

          // Check if this is for one of our quotes
          try {
            const { data: quote } = await supabase
              .from('quotes')
              .select('quote_ref, created_by')
              .eq('id', action.quote_id)
              .single();

            if (!quote || quote.created_by !== user.id) {
              // Not our quote, ignore
              return;
            }

            // Fetch approver name
            const { data: approver } = await supabase
              .from('users')
              .select('full_name, email')
              .eq('id', action.performed_by)
              .single();

            const approverName = approver?.full_name || 'Someone';

            // Show notification based on action type
            switch (action.action) {
              case 'approved':
                toast.success('Quote Approved! 🎉', {
                  description: `${approverName} approved Quote ${quote.quote_ref}`,
                  duration: 10000,
                  icon: <CheckCircle className="w-5 h-5" />,
                });
                break;

              case 'rejected':
                toast.error('Quote Rejected', {
                  description: `${approverName} rejected Quote ${quote.quote_ref}${
                    action.notes ? `: ${action.notes}` : ''
                  }`,
                  duration: 15000,
                  icon: <XCircle className="w-5 h-5" />,
                });
                break;

              case 'submitted':
                // Don't notify on our own submissions
                if (action.performed_by !== user.id) {
                  toast.info('New Quote Submitted', {
                    description: `Quote ${quote.quote_ref} submitted for Tier ${action.tier} approval`,
                    duration: 8000,
                    icon: <Bell className="w-5 h-5" />,
                  });
                }
                break;
            }
          } catch (error) {
            logger.error('Error processing approval notification:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('Approval notifications active');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Failed to subscribe to approval notifications');
        }
      });

    return () => {
      logger.debug('Unsubscribing from approval notifications');
      subscription.unsubscribe();
    };
  }, [user]);
}

/**
 * Hook for approvers to get notified of new submissions
 */
export function useApproverNotifications() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || !FEATURES.realtime) {
      return;
    }

    // Only for approval-eligible roles (sales_manager+)
    const approvalRoles = ['sales_manager', 'local_leader', 'ceo', 'system_admin'];
    if (!approvalRoles.includes(user.role)) {
      return;
    }

    logger.debug('Setting up approver notifications');

    // Subscribe to new quote submissions
    const subscription = supabase
      .channel('approver-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'approval_actions',
          filter: 'action=eq.submitted',
        },
        async (payload) => {
          const action = payload.new;

          logger.debug('New quote submitted for approval:', action);

          try {
            // Check if we can approve this tier
            const canApprove = approvalRoles.includes(user.role);

            if (!canApprove) {
              return;
            }

            // Fetch quote details
            const { data: quote } = await supabase
              .from('quotes')
              .select('quote_ref, client_name')
              .eq('id', action.quote_id)
              .single();

            // Fetch submitter
            const { data: submitter } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', action.performed_by)
              .single();

            if (quote) {
              toast.info('New Quote Needs Approval 📋', {
                description: `${submitter?.full_name || 'Someone'} submitted Quote ${quote.quote_ref} (${quote.client_name})`,
                duration: 12000,
                icon: <Bell className="w-5 h-5" />,
                action: {
                  label: 'Review',
                  onClick: () => {
                    // Navigate to approval dashboard
                    window.location.hash = '#/admin/approvals';
                  },
                },
              });
            }
          } catch (error) {
            logger.error('Error processing approver notification:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('Approver notifications active');
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);
}
