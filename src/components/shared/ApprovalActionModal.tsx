import { useState, useEffect } from 'react';
import {
  X,
  Send,
  Check,
  XCircle,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { getActionColor } from '../../engine/approvalEngine';
import type { ApprovalAction } from '../../engine/approvalEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApprovalActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: 'submit' | 'approve' | 'reject' | 'escalate' | 'return' | 'comment';
  title: string;
  showTargetPicker?: boolean;
  targetRoles?: { value: string; label: string }[];
  users?: { id: string; fullName: string; role: string }[];
  onConfirm: (data: {
    targetUserId?: string;
    targetUserName?: string;
    targetRole?: string;
    notes: string;
  }) => void;
  isProcessing?: boolean;
}

// ─── Icon resolver ────────────────────────────────────────────────────────────

function ActionIcon({ action }: { action: ApprovalActionModalProps['action'] }) {
  const iconClass = 'w-5 h-5';
  switch (action) {
    case 'submit':
      return <Send className={iconClass} />;
    case 'approve':
      return <Check className={iconClass} />;
    case 'reject':
      return <XCircle className={iconClass} />;
    case 'escalate':
      return <ArrowUp className={iconClass} />;
    case 'return':
      return <ArrowDown className={iconClass} />;
    case 'comment':
      return <MessageSquare className={iconClass} />;
    default:
      return <MessageSquare className={iconClass} />;
  }
}

// ─── Color mapping ────────────────────────────────────────────────────────────

type TailwindColorKey = 'green' | 'red' | 'cyan' | 'yellow' | 'gray' | 'blue';

interface ColorTokens {
  icon: string;
  confirmBtn: string;
  confirmBtnHover: string;
  confirmBtnRing: string;
  confirmBtnDisabled: string;
  headerAccent: string;
}

function resolveColorTokens(color: string): ColorTokens {
  const map: Record<TailwindColorKey, ColorTokens> = {
    green: {
      icon: 'text-emerald-400',
      confirmBtn: 'bg-emerald-600',
      confirmBtnHover: 'hover:bg-emerald-500',
      confirmBtnRing: 'focus:ring-emerald-500/40',
      confirmBtnDisabled: 'disabled:bg-emerald-900/40 disabled:text-emerald-700',
      headerAccent: 'text-emerald-400',
    },
    red: {
      icon: 'text-red-400',
      confirmBtn: 'bg-red-600',
      confirmBtnHover: 'hover:bg-red-500',
      confirmBtnRing: 'focus:ring-red-500/40',
      confirmBtnDisabled: 'disabled:bg-red-900/40 disabled:text-red-700',
      headerAccent: 'text-red-400',
    },
    cyan: {
      icon: 'text-brand-400',
      confirmBtn: 'bg-brand-600',
      confirmBtnHover: 'hover:bg-brand-500',
      confirmBtnRing: 'focus:ring-brand-500/40',
      confirmBtnDisabled: 'disabled:bg-brand-900/40 disabled:text-brand-700',
      headerAccent: 'text-brand-400',
    },
    yellow: {
      icon: 'text-amber-400',
      confirmBtn: 'bg-amber-600',
      confirmBtnHover: 'hover:bg-amber-500',
      confirmBtnRing: 'focus:ring-amber-500/40',
      confirmBtnDisabled: 'disabled:bg-amber-900/40 disabled:text-amber-700',
      headerAccent: 'text-amber-400',
    },
    gray: {
      icon: 'text-surface-300',
      confirmBtn: 'bg-surface-600',
      confirmBtnHover: 'hover:bg-surface-500',
      confirmBtnRing: 'focus:ring-surface-400/40',
      confirmBtnDisabled: 'disabled:bg-surface-800/60 disabled:text-surface-600',
      headerAccent: 'text-surface-300',
    },
    blue: {
      icon: 'text-blue-400',
      confirmBtn: 'bg-blue-600',
      confirmBtnHover: 'hover:bg-blue-500',
      confirmBtnRing: 'focus:ring-blue-500/40',
      confirmBtnDisabled: 'disabled:bg-blue-900/40 disabled:text-blue-700',
      headerAccent: 'text-blue-400',
    },
  };

  return map[color as TailwindColorKey] ?? map.gray;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ApprovalActionModal({
  isOpen,
  onClose,
  action,
  title,
  showTargetPicker = false,
  targetRoles = [],
  users = [],
  onConfirm,
  isProcessing = false,
}: ApprovalActionModalProps) {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Reset all local state whenever the modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setSelectedRole('');
      setSelectedUserId('');
      setNotes('');
    }
  }, [isOpen]);

  // When role changes, clear the selected user
  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    setSelectedUserId('');
  };

  // Derive filtered users based on the currently selected role
  const filteredUsers = selectedRole
    ? users.filter((u) => u.role === selectedRole)
    : users;

  // Derive the selected user object for name lookup
  const selectedUser = users.find((u) => u.id === selectedUserId);

  // Notes are required for reject and return
  const notesRequired = action === 'reject' || action === 'return';
  const notesLabel = notesRequired ? 'Reason' : 'Notes';
  const notesPlaceholder =
    action === 'reject'
      ? 'Provide a reason for rejection...'
      : action === 'return'
      ? 'Describe the changes required...'
      : 'Add an optional note...';

  // Target picker is required for submit, escalate, and return
  const targetRequired = showTargetPicker;

  // Confirm button disabled logic
  const isConfirmDisabled =
    isProcessing ||
    (notesRequired && notes.trim() === '') ||
    (targetRequired && selectedUserId === '');

  // Color tokens derived from the action
  const color = getActionColor(action as ApprovalAction);
  const colors = resolveColorTokens(color);

  const handleConfirm = () => {
    if (isConfirmDisabled) return;

    onConfirm({
      ...(selectedUserId
        ? {
            targetUserId: selectedUserId,
            targetUserName: selectedUser?.fullName,
            targetRole: selectedRole || selectedUser?.role,
          }
        : {}),
      notes: notes.trim(),
    });
  };

  // Handle keyboard shortcuts (disabled — modal only closes via Cancel/action buttons)
  const handleKeyDown = (_e: React.KeyboardEvent<HTMLDivElement>) => {
    // intentionally empty
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="approval-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        className="
          relative z-10 w-full max-w-md
          bg-surface-800/95 backdrop-blur-xl
          border border-surface-600/50
          rounded-2xl shadow-2xl
          animate-scale-in
        "
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-700/60">
          <div className="flex items-center gap-3">
            <span className={colors.icon}>
              <ActionIcon action={action} />
            </span>
            <h2
              id="approval-modal-title"
              className={`text-base font-semibold ${colors.headerAccent}`}
            >
              {title}
            </h2>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close dialog"
            className="
              p-1.5 rounded-lg
              text-surface-400 hover:text-surface-100
              hover:bg-surface-700/60
              transition-all duration-150
              disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-brand-500/40
            "
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-5">
          {/* Target picker section */}
          {showTargetPicker && (
            <div className="space-y-3">
              {/* Role select */}
              {targetRoles.length > 0 && (
                <div>
                  <label
                    htmlFor="approval-role-select"
                    className="block text-xs font-medium text-surface-300 mb-1.5 uppercase tracking-wider"
                  >
                    Target Role
                    <span className="ml-1 text-red-400" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="approval-role-select"
                    value={selectedRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    disabled={isProcessing}
                    className="
                      w-full input text-sm
                      bg-surface-900/70 border-surface-600/60
                      text-surface-100
                      focus:ring-2 focus:ring-brand-500/40 focus:outline-none
                      disabled:opacity-50 disabled:cursor-not-allowed
                      rounded-lg px-3 py-2.5
                    "
                  >
                    <option value="" disabled className="bg-surface-900 text-surface-400">
                      Select a role...
                    </option>
                    {targetRoles.map((r) => (
                      <option
                        key={r.value}
                        value={r.value}
                        className="bg-surface-900 text-surface-100"
                      >
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* User select */}
              <div>
                <label
                  htmlFor="approval-user-select"
                  className="block text-xs font-medium text-surface-300 mb-1.5 uppercase tracking-wider"
                >
                  Assign To
                  <span className="ml-1 text-red-400" aria-hidden="true">*</span>
                </label>
                <select
                  id="approval-user-select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={isProcessing || filteredUsers.length === 0}
                  className="
                    w-full input text-sm
                    bg-surface-900/70 border-surface-600/60
                    text-surface-100
                    focus:ring-2 focus:ring-brand-500/40 focus:outline-none
                    disabled:opacity-50 disabled:cursor-not-allowed
                    rounded-lg px-3 py-2.5
                  "
                >
                  <option value="" disabled className="bg-surface-900 text-surface-400">
                    {filteredUsers.length === 0
                      ? targetRoles.length > 0 && !selectedRole
                        ? 'Select a role first...'
                        : 'No users available'
                      : 'Select a person...'}
                  </option>
                  {filteredUsers.map((u) => (
                    <option
                      key={u.id}
                      value={u.id}
                      className="bg-surface-900 text-surface-100"
                    >
                      {u.fullName}
                      {u.role ? ` — ${u.role}` : ''}
                    </option>
                  ))}
                </select>

                {targetRequired && selectedUserId === '' && (
                  <p className="mt-1.5 text-xs text-surface-400">
                    A recipient must be selected to proceed.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Notes / Reason textarea */}
          <div>
            <label
              htmlFor="approval-notes"
              className="block text-xs font-medium text-surface-300 mb-1.5 uppercase tracking-wider"
            >
              {notesLabel}
              {notesRequired && (
                <span className="ml-1 text-red-400" aria-hidden="true">*</span>
              )}
              {!notesRequired && (
                <span className="ml-1.5 text-surface-500 normal-case tracking-normal font-normal">
                  (optional)
                </span>
              )}
            </label>

            <textarea
              id="approval-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={notesPlaceholder}
              rows={4}
              disabled={isProcessing}
              required={notesRequired}
              aria-required={notesRequired}
              className="
                w-full
                bg-surface-900/70 border border-surface-600/60
                text-surface-100 placeholder-surface-500
                text-sm leading-relaxed
                rounded-lg px-3 py-2.5
                resize-none
                focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40
                transition-all duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            />

            {notesRequired && notes.trim() === '' && (
              <p className="mt-1.5 text-xs text-red-400/80">
                A {notesLabel.toLowerCase()} is required for this action.
              </p>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-700/60">
          {/* Cancel */}
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="
              px-4 py-2 rounded-lg text-sm font-medium
              bg-surface-700/50 border border-surface-600/50
              text-surface-200 hover:text-surface-100
              hover:bg-surface-600/60
              transition-all duration-150
              disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-surface-400/40
            "
          >
            Cancel
          </button>

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            aria-disabled={isConfirmDisabled}
            className={`
              inline-flex items-center gap-2
              px-5 py-2 rounded-lg text-sm font-semibold
              text-white
              ${colors.confirmBtn}
              ${colors.confirmBtnHover}
              ${colors.confirmBtnRing}
              ${colors.confirmBtnDisabled}
              shadow-md
              transition-all duration-150
              focus:outline-none focus:ring-2
              disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
            `}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <ActionIcon action={action} />
                <span>{getConfirmLabel(action)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getConfirmLabel(action: ApprovalActionModalProps['action']): string {
  const labels: Record<ApprovalActionModalProps['action'], string> = {
    submit: 'Submit',
    approve: 'Approve',
    reject: 'Reject',
    escalate: 'Escalate',
    return: 'Return',
    comment: 'Add Comment',
  };
  return labels[action];
}
