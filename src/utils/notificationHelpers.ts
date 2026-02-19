/**
 * notificationHelpers
 *
 * Convenience factory functions for creating domain notifications.
 * Each helper writes a StoredNotification record via the DatabaseAdapter,
 * so they can be called from anywhere in the app without needing the React
 * hook context.
 *
 * Usage example:
 *   import { notifyApprovalNeeded } from '../utils/notificationHelpers';
 *   await notifyApprovalNeeded('Q-2025-001', assigneeUserId);
 */

import { getDb } from '../db/DatabaseAdapter';
import type { StoredNotification, NotificationType } from '../types/notifications';

// ─── Internal helper ────────────────────────────────────────────────────────

async function writeNotification(
  partial: Omit<StoredNotification, 'id' | 'createdAt' | 'isRead'>
): Promise<void> {
  try {
    const record: StoredNotification = {
      ...partial,
      id: crypto.randomUUID(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    await getDb().saveNotification(record);
  } catch (err) {
    console.error('[notificationHelpers] writeNotification error:', err);
  }
}

// ─── Public helpers ─────────────────────────────────────────────────────────

/**
 * Notify an approver that a quote is awaiting their review.
 *
 * @param quoteRef  Human-readable quote reference, e.g. "Q-2025-001"
 * @param assigneeId  User ID of the approver who needs to act
 * @param quoteId  Optional DB ID of the quote for deep-linking
 */
export async function notifyApprovalNeeded(
  quoteRef: string,
  assigneeId: string,
  quoteId?: string
): Promise<void> {
  await writeNotification({
    userId: assigneeId,
    type: 'approval_needed' as NotificationType,
    title: 'Approval Required',
    message: `Quote ${quoteRef} is awaiting your approval.`,
    entityType: 'quote',
    entityId: quoteId,
  });
}

/**
 * Notify a quote owner of the approval decision.
 *
 * @param quoteRef  Human-readable quote reference
 * @param userId  User ID of the quote owner / submitter
 * @param approved  true = approved, false = rejected
 * @param quoteId  Optional DB ID for deep-linking
 */
export async function notifyApprovalResult(
  quoteRef: string,
  userId: string,
  approved: boolean,
  quoteId?: string
): Promise<void> {
  await writeNotification({
    userId,
    type: 'approval_result' as NotificationType,
    title: approved ? 'Quote Approved' : 'Quote Rejected',
    message: approved
      ? `Your quote ${quoteRef} has been approved.`
      : `Your quote ${quoteRef} was rejected. Check comments for details.`,
    entityType: 'quote',
    entityId: quoteId,
  });
}

/**
 * Notify a user that a quote has been assigned to them.
 *
 * @param quoteRef  Human-readable quote reference
 * @param userId  User ID of the recipient
 * @param assignerName  Full name of the person who made the assignment
 * @param quoteId  Optional DB ID for deep-linking
 */
export async function notifyQuoteAssigned(
  quoteRef: string,
  userId: string,
  assignerName: string,
  quoteId?: string
): Promise<void> {
  await writeNotification({
    userId,
    type: 'quote_assigned' as NotificationType,
    title: 'Quote Assigned to You',
    message: `${assignerName} assigned quote ${quoteRef} to you.`,
    entityType: 'quote',
    entityId: quoteId,
  });
}

/**
 * Notify a user that a CRM company account has been assigned to them.
 *
 * @param companyName  Display name of the company
 * @param userId  User ID of the recipient
 * @param assignerName  Full name of the person who made the assignment
 * @param companyId  Optional DB ID for deep-linking
 */
export async function notifyCompanyAssigned(
  companyName: string,
  userId: string,
  assignerName: string,
  companyId?: string
): Promise<void> {
  await writeNotification({
    userId,
    type: 'company_assigned' as NotificationType,
    title: 'Company Assigned to You',
    message: `${assignerName} assigned ${companyName} to your account list.`,
    entityType: 'company',
    entityId: companyId,
  });
}

/**
 * Notify a user that a company's pipeline stage has changed.
 *
 * @param companyName  Display name of the company
 * @param userId  User ID of the recipient (typically assigned rep)
 * @param newStage  New pipeline stage label
 * @param companyId  Optional DB ID for deep-linking
 */
export async function notifyStageChange(
  companyName: string,
  userId: string,
  newStage: string,
  companyId?: string
): Promise<void> {
  await writeNotification({
    userId,
    type: 'stage_change' as NotificationType,
    title: 'Pipeline Stage Updated',
    message: `${companyName} has moved to the "${newStage}" stage.`,
    entityType: 'company',
    entityId: companyId,
  });
}
