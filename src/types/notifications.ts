/**
 * Notification types for the Bisedge CRM + Quotation Dashboard.
 *
 * Notifications are stored in the Supabase `notifications` table.
 */

export type NotificationType =
  | 'approval_needed'
  | 'approval_result'
  | 'quote_assigned'
  | 'company_assigned'
  | 'stage_change'
  | 'activity_mention'
  | 'system';

export interface StoredNotification {
  id: string;
  userId: string;        // recipient user ID
  type: NotificationType;
  title: string;
  message: string;
  entityType?: 'quote' | 'company' | 'activity';
  entityId?: string;
  isRead: boolean;
  createdAt: string;     // ISO 8601 string
}
