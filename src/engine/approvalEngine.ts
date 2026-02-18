import type { QuoteState, ApprovalChainEntry } from '../types/quote';
import type { Role, PermissionOverrides } from '../auth/permissions';
import { ROLE_HIERARCHY, ROLE_DISPLAY_NAMES, ALL_ROLES, canApproveQuotes } from '../auth/permissions';

// ─── Target resolution ──────────────────────────────────────────────────────

export function getValidTargets(role: Role): Role[] {
  const level = ROLE_HIERARCHY[role];
  return ALL_ROLES.filter(r => ROLE_HIERARCHY[r] > level);
}

export function getDefaultTarget(role: Role): Role | null {
  const level = ROLE_HIERARCHY[role];
  // Find the next level up (smallest level greater than current)
  const nextLevel = Math.min(...ALL_ROLES.filter(r => ROLE_HIERARCHY[r] > level).map(r => ROLE_HIERARCHY[r]));
  if (!isFinite(nextLevel)) return null;
  const targets = ALL_ROLES.filter(r => ROLE_HIERARCHY[r] === nextLevel);
  return targets[0] || null;
}

export function getReturnTargets(role: Role): Role[] {
  const level = ROLE_HIERARCHY[role];
  return ALL_ROLES.filter(r => ROLE_HIERARCHY[r] < level);
}

// ─── Chain entry factory ────────────────────────────────────────────────────

export function createChainEntry(
  action: ApprovalChainEntry['action'],
  fromUser: { id: string; name: string; role: string },
  toUser: { id: string; name: string; role: string },
  notes: string,
  changesDescription?: string
): ApprovalChainEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    fromUserId: fromUser.id,
    fromUserName: fromUser.name,
    fromRole: fromUser.role,
    toUserId: toUser.id,
    toUserName: toUser.name,
    toRole: toUser.role,
    action,
    notes,
    changesDescription,
  };
}

// ─── Available actions for a user on a quote ────────────────────────────────

export type ApprovalAction = 'submit' | 'approve' | 'reject' | 'escalate' | 'return' | 'comment' | 'edit';

export function getAvailableActions(
  quote: QuoteState,
  userId: string,
  userRole: Role,
  overrides?: PermissionOverrides
): ApprovalAction[] {
  const actions: ApprovalAction[] = [];
  const isAssignee = quote.currentAssigneeId === userId;
  const isCreator = quote.createdBy === userId;
  const canApprove = canApproveQuotes(userRole, overrides);
  const userLevel = ROLE_HIERARCHY[userRole];

  switch (quote.status) {
    case 'draft':
      if (isCreator || !quote.createdBy) {
        actions.push('submit');
      }
      break;

    case 'pending-approval':
      if (isAssignee && canApprove) {
        actions.push('approve', 'reject', 'comment', 'edit');
        // Can escalate if there are roles above
        if (getValidTargets(userRole).length > 0) {
          actions.push('escalate');
        }
        // Can return if there are roles below or creator
        if (getReturnTargets(userRole).length > 0 || isCreator) {
          actions.push('return');
        }
      }
      // System admin can always act
      if (userRole === 'system_admin' && !isAssignee) {
        actions.push('approve', 'reject', 'escalate', 'return', 'comment', 'edit');
      }
      break;

    case 'in-review':
      if (isAssignee) {
        actions.push('approve', 'reject', 'comment');
        if (getValidTargets(userRole).length > 0) {
          actions.push('escalate');
        }
        if (getReturnTargets(userRole).length > 0) {
          actions.push('return');
        }
      }
      break;

    case 'changes-requested':
      if (isCreator) {
        actions.push('submit', 'comment');
      }
      break;

    case 'approved':
    case 'rejected':
      actions.push('comment');
      break;
  }

  return [...new Set(actions)]; // deduplicate
}

// ─── Status mapping ─────────────────────────────────────────────────────────

export function getNextStatus(action: ApprovalAction, currentStatus: QuoteState['status']): QuoteState['status'] {
  switch (action) {
    case 'submit': return 'pending-approval';
    case 'approve': return 'approved';
    case 'reject': return 'rejected';
    case 'escalate': return 'pending-approval';
    case 'return': return 'changes-requested';
    case 'edit': return 'in-review';
    case 'comment': return currentStatus; // no change
    default: return currentStatus;
  }
}

// ─── Display helpers ────────────────────────────────────────────────────────

export function getActionLabel(action: ApprovalAction): string {
  const labels: Record<ApprovalAction, string> = {
    submit: 'Submit for Approval',
    approve: 'Approve',
    reject: 'Reject',
    escalate: 'Escalate',
    return: 'Return for Changes',
    comment: 'Add Comment',
    edit: 'Edit in Review',
  };
  return labels[action];
}

export function getActionColor(action: ApprovalAction): string {
  const colors: Record<ApprovalAction, string> = {
    submit: 'cyan',
    approve: 'green',
    reject: 'red',
    escalate: 'cyan',
    return: 'yellow',
    comment: 'gray',
    edit: 'blue',
  };
  return colors[action];
}

export function getChainActionColor(action: ApprovalChainEntry['action']): string {
  const colors: Record<string, string> = {
    submitted: 'cyan',
    escalated: 'cyan',
    returned: 'yellow',
    approved: 'green',
    rejected: 'red',
    commented: 'gray',
    edited: 'blue',
  };
  return colors[action] || 'gray';
}

export function getRoleDisplayName(role: string): string {
  return ROLE_DISPLAY_NAMES[role as Role] || role;
}
