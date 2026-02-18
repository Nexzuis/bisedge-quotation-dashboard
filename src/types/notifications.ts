/**
 * Notification types for the Bisedge CRM + Quotation Dashboard.
 *
 * SCHEMA MIGRATION NOTE:
 * Add the following table declaration to BisedgeDatabase in src/db/schema.ts:
 *
 *   // In the class body, alongside the other Table declarations:
 *   notifications!: Table<StoredNotification, string>;
 *
 *   // In the version(6).stores({...}) call (new version), add:
 *   notifications: 'id, userId, type, isRead, createdAt, [userId+isRead]',
 *
 * Full version 6 entry example:
 *
 *   this.version(6).stores({
 *     // ...all existing v5 table definitions unchanged...
 *     notifications: 'id, userId, type, isRead, createdAt, [userId+isRead]',
 *   });
 *
 * Also add `notifications` to the clearDatabase() helper if desired.
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
