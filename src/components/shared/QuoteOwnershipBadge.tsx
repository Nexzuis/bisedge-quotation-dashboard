/**
 * Quote Ownership Badge
 *
 * Displays quote ownership, assignment, and lock status.
 * Shows who created, who owns, and who is currently editing the quote.
 */

import { User, Lock, UserCheck } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import type { QuoteState } from '../../types/quote';

interface QuoteOwnershipBadgeProps {
  quote: QuoteState;
  showDetails?: boolean;
}

export function QuoteOwnershipBadge({ quote, showDetails = true }: QuoteOwnershipBadgeProps) {
  const { user } = useAuthStore();

  const isOwner = user?.id === quote.createdBy;
  const isAssigned = user?.id === quote.assignedTo;
  const isLockedByMe = user?.id === quote.lockedBy;
  const isLockedByOther = quote.lockedBy && quote.lockedBy !== user?.id;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Created By */}
      {showDetails && quote.createdBy && (
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
            isOwner
              ? 'bg-blue-500/10 border border-blue-500/20 text-blue-600'
              : 'bg-surface-100 border border-surface-200 text-surface-600'
          }`}
          title={isOwner ? 'You created this quote' : 'Quote creator'}
        >
          <User className="w-3 h-3" />
          <span>{isOwner ? 'You' : 'Created by someone'}</span>
        </div>
      )}

      {/* Assigned To */}
      {quote.assignedTo && (
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
            isAssigned
              ? 'bg-purple-500/10 border border-purple-500/20 text-purple-600'
              : 'bg-surface-100 border border-surface-200 text-surface-600'
          }`}
          title={isAssigned ? 'Assigned to you' : 'Assigned to someone else'}
        >
          <UserCheck className="w-3 h-3" />
          <span>{isAssigned ? 'Assigned to you' : 'Assigned'}</span>
        </div>
      )}

      {/* Lock Status */}
      {quote.lockedBy && (
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
            isLockedByMe
              ? 'bg-green-500/10 border border-green-500/20 text-green-600'
              : 'bg-orange-500/10 border border-orange-500/20 text-orange-600'
          }`}
          title={
            isLockedByMe
              ? 'You are editing this quote'
              : `Locked by another user (${quote.lockedAt ? new Date(quote.lockedAt).toLocaleTimeString() : 'unknown time'})`
          }
        >
          <Lock className="w-3 h-3" />
          <span>{isLockedByMe ? 'Editing' : 'Locked by other'}</span>
        </div>
      )}

      {/* Read-Only Indicator */}
      {isLockedByOther && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-red-500/10 border border-red-500/20 text-red-600">
          <Lock className="w-3 h-3" />
          <span>Read-Only</span>
        </div>
      )}
    </div>
  );
}

/**
 * Simple ownership text (for compact displays)
 */
export function QuoteOwnershipText({ quote }: { quote: QuoteState }) {
  const { user } = useAuthStore();

  const isOwner = user?.id === quote.createdBy;
  const isAssigned = user?.id === quote.assignedTo;
  const isLocked = !!quote.lockedBy;
  const isLockedByMe = user?.id === quote.lockedBy;

  if (isLocked && !isLockedByMe) {
    return <span className="text-orange-600 text-xs">🔒 Being edited</span>;
  }

  if (isLockedByMe) {
    return <span className="text-green-600 text-xs">✏️ You're editing</span>;
  }

  if (isOwner) {
    return <span className="text-blue-600 text-xs">👤 Your quote</span>;
  }

  if (isAssigned) {
    return <span className="text-purple-600 text-xs">📋 Assigned to you</span>;
  }

  return <span className="text-surface-500 text-xs">👁️ View only</span>;
}
