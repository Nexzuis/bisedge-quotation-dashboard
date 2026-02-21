import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  Check,
  XCircle,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Edit3,
  Loader2,
} from 'lucide-react';
import { Panel } from '../ui/Panel';
import { CardHeader } from '../ui/Card';
import { toast } from '../ui/Toast';
import { useQuoteStore } from '../../store/useQuoteStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useIsReadOnly } from '../../hooks/ReadOnlyContext';
import { validateQuoteSync } from '../../engine/validators';
import { useApprovalActions } from '../../hooks/useApprovalActions';
import { ApprovalChainBreadcrumb } from '../shared/ApprovalChainBreadcrumb';
import { ApprovalActionModal, type ApprovalActionModalProps } from '../shared/ApprovalActionModal';
import { QuoteAuditTimeline } from '../shared/QuoteAuditTimeline';
import { getDb } from '../../db/DatabaseAdapter';
import { getAuditRepository } from '../../db/repositories';
import { ROLE_DISPLAY_NAMES, type Role } from '../../auth/permissions';
import { getActionLabel, createChainEntry, type ApprovalAction } from '../../engine/approvalEngine';
import type { ApprovalChainEntry, QuoteState } from '../../types/quote';

const ACTION_ICONS: Record<ApprovalAction, typeof Send> = {
  submit: Send,
  approve: Check,
  reject: XCircle,
  escalate: ArrowUp,
  return: ArrowDown,
  comment: MessageSquare,
  edit: Edit3,
};

const ACTION_STYLES: Record<ApprovalAction, string> = {
  submit: 'bg-brand-600 hover:bg-brand-700 text-surface-100',
  approve: 'bg-emerald-600 hover:bg-emerald-700 text-surface-100',
  reject: 'bg-red-600 hover:bg-red-700 text-surface-100',
  escalate: 'bg-cyan-600 hover:bg-cyan-700 text-surface-100',
  return: 'bg-amber-600 hover:bg-amber-700 text-surface-100',
  comment: 'bg-surface-600 hover:bg-surface-500 text-surface-100',
  edit: 'bg-blue-600 hover:bg-blue-700 text-surface-100',
};

export function ApprovalWorkflowPanel() {
  const { isReadOnly } = useIsReadOnly();
  const quote = useQuoteStore((state) => state);
  const getQuoteTotals = useQuoteStore((state) => state.getQuoteTotals);
  const { user } = useAuthStore();
  const {
    availableActions,
    targetRoles,
    returnRoles,
    isProcessing,
    submit,
    approve,
    reject,
    escalate,
    returnQuote,
    addComment,
  } = useApprovalActions();

  const [modalAction, setModalAction] = useState<ApprovalActionModalProps['action'] | null>(null);
  const [targetUsers, setTargetUsers] = useState<{ id: string; fullName: string; role: string }[]>([]);

  const totals = getQuoteTotals();
  const validationErrors = validateQuoteSync(quote, totals.irr, totals.totalContractValue);
  const hasBlockingErrors = validationErrors.some((e) => e.severity === 'error');

  // Load target users when modal opens with a target picker action
  useEffect(() => {
    if (!modalAction) return;
    if (modalAction === 'approve' || modalAction === 'reject' || modalAction === 'comment') return;

    const roles = modalAction === 'return' ? returnRoles : targetRoles;
    const loadUsers = async () => {
      const db = getDb();
      const allUsers: { id: string; fullName: string; role: string }[] = [];
      for (const role of roles) {
        const users = await db.getUsersByRole(role);
        allUsers.push(...users.map((u: any) => ({ id: u.id, fullName: u.fullName, role: u.role })));
      }
      setTargetUsers(allUsers);
    };
    loadUsers();
  }, [modalAction, targetRoles, returnRoles]);

  const handleActionClick = async (action: ApprovalAction) => {
    if (action === 'edit') {
      // Edit in review — create chain entry, persist, and audit
      const fromUser = { id: user!.id, name: user!.fullName, role: user!.role };
      const entry = createChainEntry('edited', fromUser, fromUser, 'Started editing in review');

      useQuoteStore.setState((state: QuoteState) => {
        state.status = 'in-review';
        state.updatedAt = new Date();
        (state.approvalChain as ApprovalChainEntry[]).push(entry);
      });

      try {
        const result = await getDb().saveQuote(useQuoteStore.getState() as QuoteState);
        if (!result.success) {
          toast.error('Save failed', { description: result.error });
          const fresh = await getDb().loadQuote((useQuoteStore.getState() as QuoteState).id);
          if (fresh) useQuoteStore.getState().loadQuote(fresh);
          return;
        }
        useQuoteStore.getState().setVersion(result.version);
        useQuoteStore.getState().markSaved();

        await getAuditRepository().log({
          userId: user!.id,
          userName: user!.fullName,
          action: 'edit_review',
          entityType: 'quote',
          entityId: (useQuoteStore.getState() as QuoteState).id,
          notes: 'Started editing in review',
          changes: { status: 'in-review' },
        });
      } catch (error) {
        console.error('Failed to save edit action:', error);
      }

      toast.success('Quote is now in review mode');
      return;
    }
    setModalAction(action as ApprovalActionModalProps['action']);
  };

  const handleModalConfirm = async (data: {
    targetUserId?: string;
    targetUserName?: string;
    targetRole?: string;
    notes: string;
  }) => {
    if (!modalAction) return;

    try {
      switch (modalAction) {
        case 'submit':
          await submit(data.targetUserId!, data.targetUserName!, data.targetRole!, data.notes);
          toast.success('Quote submitted for approval');
          break;
        case 'approve':
          await approve(data.notes);
          toast.success('Quote approved!');
          break;
        case 'reject':
          await reject(data.notes);
          toast.success('Quote rejected');
          break;
        case 'escalate':
          await escalate(data.targetUserId!, data.targetUserName!, data.targetRole!, data.notes);
          toast.success('Quote escalated');
          break;
        case 'return':
          await returnQuote(data.targetUserId!, data.targetUserName!, data.targetRole!, data.notes);
          toast.success('Quote returned for changes');
          break;
        case 'comment':
          await addComment(data.notes);
          toast.success('Comment added');
          break;
      }
      setModalAction(null);
    } catch (error) {
      console.error('Action failed:', error);
      toast.error('Action failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const needsTargetPicker = modalAction === 'submit' || modalAction === 'escalate' || modalAction === 'return';
  const modalTargetRoles = modalAction === 'return'
    ? returnRoles.map((r) => ({ value: r, label: ROLE_DISPLAY_NAMES[r] }))
    : targetRoles.map((r) => ({ value: r, label: ROLE_DISPLAY_NAMES[r] }));

  return (
    <Panel accent="brand">
      <CardHeader icon={CheckCircle2} title="Approval Workflow" />

      <div className="space-y-4">
        {/* Chain breadcrumb */}
        {(quote.approvalChain as ApprovalChainEntry[]).length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-surface-300 mb-2">Approval Chain</h4>
            <ApprovalChainBreadcrumb chain={quote.approvalChain as ApprovalChainEntry[]} compact />
          </div>
        )}

        {/* Current status */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-surface-400">Status</span>
          <span className="font-medium text-surface-200 capitalize">
            {quote.status.replace(/-/g, ' ')}
          </span>
        </div>

        {quote.currentAssigneeRole && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-surface-400">Assigned to</span>
            <span className="font-medium text-brand-400">
              {ROLE_DISPLAY_NAMES[quote.currentAssigneeRole as Role] || quote.currentAssigneeRole}
            </span>
          </div>
        )}

        {/* Validation Errors (only shown for draft/changes-requested) */}
        {(quote.status === 'draft' || quote.status === 'changes-requested') && validationErrors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-surface-300 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Validation
            </h4>
            {validationErrors.slice(0, 3).map((error, idx) => (
              <div
                key={idx}
                className={`text-xs p-2 rounded border ${
                  error.severity === 'error'
                    ? 'bg-danger/10 border-danger/30 text-danger'
                    : 'bg-warning/10 border-warning/30 text-warning'
                }`}
              >
                {error.message}
              </div>
            ))}
            {validationErrors.length > 3 && (
              <div className="text-xs text-surface-400">
                +{validationErrors.length - 3} more issue(s)
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {availableActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-surface-300">Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              {availableActions.map((action) => {
                const Icon = ACTION_ICONS[action];
                const disabled = isProcessing || isReadOnly || (action === 'submit' && hasBlockingErrors);
                return (
                  <button
                    key={action}
                    onClick={() => handleActionClick(action)}
                    disabled={disabled}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${ACTION_STYLES[action]}`}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Icon className="w-3 h-3" />
                    )}
                    {getActionLabel(action)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* No actions available */}
        {availableActions.length === 0 && quote.status !== 'draft' && (
          <div className="text-xs text-center text-surface-400 py-2">
            No actions available for your role on this quote.
          </div>
        )}

        {/* Status summary for drafts */}
        {quote.status === 'draft' && (
          <div className="text-xs text-center">
            {!hasBlockingErrors ? (
              <span className="text-success flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Ready to submit
              </span>
            ) : (
              <span className="text-danger flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {validationErrors.filter((e) => e.severity === 'error').length} error(s) must be resolved
              </span>
            )}
          </div>
        )}
      </div>

      {/* Audit Timeline */}
      {(quote.approvalChain as ApprovalChainEntry[]).length > 0 && (
        <div className="mt-4 pt-4 border-t border-surface-600/30">
          <QuoteAuditTimeline chain={quote.approvalChain as ApprovalChainEntry[]} />
        </div>
      )}

      {/* Action Modal */}
      {modalAction && (
        <ApprovalActionModal
          isOpen={!!modalAction}
          onClose={() => setModalAction(null)}
          action={modalAction}
          title={getActionLabel(modalAction as ApprovalAction)}
          showTargetPicker={needsTargetPicker}
          targetRoles={modalTargetRoles}
          users={targetUsers}
          onConfirm={handleModalConfirm}
          isProcessing={isProcessing}
        />
      )}
    </Panel>
  );
}
