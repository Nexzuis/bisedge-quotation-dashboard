import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useQuoteStore } from '../store/useQuoteStore';
import { useAuthStore } from '../store/useAuthStore';
import { getDb } from '../db/DatabaseAdapter';
import { getAuditRepository } from '../db/repositories';
import type { Role, PermissionOverrides } from '../auth/permissions';
import {
  getAvailableActions,
  getNextStatus,
  createChainEntry,
  getValidTargets,
  getReturnTargets,
  type ApprovalAction,
} from '../engine/approvalEngine';
import type { QuoteState, ApprovalChainEntry } from '../types/quote';

export function useApprovalActions() {
  const user = useAuthStore((s) => s.user);
  const quote = useQuoteStore((s) => s as QuoteState);
  const [isProcessing, setIsProcessing] = useState(false);

  const availableActions = useMemo<ApprovalAction[]>(() => {
    if (!user) return [];
    return getAvailableActions(
      quote,
      user.id,
      user.role as Role,
      user.permissionOverrides as PermissionOverrides
    );
  }, [quote, user]);

  const targetRoles = useMemo<Role[]>(() => {
    if (!user) return [];
    return getValidTargets(user.role as Role);
  }, [user]);

  const returnRoles = useMemo<Role[]>(() => {
    if (!user) return [];
    return getReturnTargets(user.role as Role);
  }, [user]);

  function buildFromUser() {
    return {
      id: user!.id,
      name: user!.fullName,
      role: user!.role,
    };
  }

  async function applyAction(
    action: ApprovalAction,
    chainAction: ApprovalChainEntry['action'],
    auditAction: 'submit' | 'approve' | 'reject' | 'escalate' | 'return' | 'comment',
    fromUser: { id: string; name: string; role: string },
    toUser: { id: string; name: string; role: string },
    notes: string,
    extraUpdates?: (state: QuoteState) => void
  ): Promise<void> {
    if (!user) return;
    setIsProcessing(true);
    try {
      const newStatus = getNextStatus(action, useQuoteStore.getState().status);

      // Bug #23 fix: if transition is invalid, show error and bail out
      if (newStatus === null) {
        toast.error('Invalid action', {
          description: `Cannot "${action}" a quote in "${useQuoteStore.getState().status}" status.`,
        });
        return;
      }

      const entry = createChainEntry(chainAction, fromUser, toUser, notes);

      useQuoteStore.setState((state: QuoteState) => {
        state.status = newStatus;
        state.currentAssigneeId = toUser.id;
        state.currentAssigneeRole = toUser.role;
        (state.approvalChain as ApprovalChainEntry[]).push(entry);
        state.updatedAt = new Date();
        extraUpdates?.(state);
      });

      const result = await getDb().saveQuote(useQuoteStore.getState() as QuoteState);
      if (!result.success) {
        toast.error('Save failed', { description: result.error });
        // Revert local state from DB
        const fresh = await getDb().loadQuote(useQuoteStore.getState().id);
        if (fresh) useQuoteStore.getState().loadQuote(fresh);
        return; // Skip audit logging
      }
      useQuoteStore.getState().setVersion(result.version);
      useQuoteStore.getState().markSaved();

      await getAuditRepository().log({
        userId: user.id,
        userName: user.fullName,
        action: auditAction,
        entityType: 'quote',
        entityId: (useQuoteStore.getState() as QuoteState).id,
        notes,
        changes: { status: newStatus },
      });
    } finally {
      setIsProcessing(false);
    }
  }

  async function submit(
    toUserId: string,
    toUserName: string,
    toRole: string,
    notes: string
  ): Promise<void> {
    const fromUser = buildFromUser();
    const toUser = { id: toUserId, name: toUserName, role: toRole };
    const isFirstSubmission = !useQuoteStore.getState().submittedBy;

    await applyAction(
      'submit',
      'submitted',
      'submit',
      fromUser,
      toUser,
      notes,
      isFirstSubmission
        ? (state) => {
            state.submittedBy = fromUser.id;
            state.submittedAt = new Date();
          }
        : undefined
    );
  }

  async function approve(notes: string): Promise<void> {
    const fromUser = buildFromUser();
    const toUser = { ...fromUser };

    await applyAction(
      'approve',
      'approved',
      'approve',
      fromUser,
      toUser,
      notes,
      (state) => {
        state.approvedBy = fromUser.id;
        state.approvedAt = new Date();
      }
    );
  }

  async function reject(reason: string): Promise<void> {
    const fromUser = buildFromUser();
    const toUser = { ...fromUser };

    await applyAction('reject', 'rejected', 'reject', fromUser, toUser, reason);
  }

  async function escalate(
    toUserId: string,
    toUserName: string,
    toRole: string,
    notes: string
  ): Promise<void> {
    const fromUser = buildFromUser();
    const toUser = { id: toUserId, name: toUserName, role: toRole };

    await applyAction('escalate', 'escalated', 'escalate', fromUser, toUser, notes);
  }

  async function returnQuote(
    toUserId: string,
    toUserName: string,
    toRole: string,
    notes: string
  ): Promise<void> {
    const fromUser = buildFromUser();
    const toUser = { id: toUserId, name: toUserName, role: toRole };

    await applyAction('return', 'returned', 'return', fromUser, toUser, notes);
  }

  async function addComment(notes: string): Promise<void> {
    if (!user) return;
    setIsProcessing(true);
    try {
      const fromUser = buildFromUser();
      // Comment should NOT reassign the quote — preserve current assignee
      const currentState = useQuoteStore.getState() as QuoteState;
      const entry = createChainEntry('commented', fromUser, fromUser, notes);

      useQuoteStore.setState((state: QuoteState) => {
        // Do NOT change status, assignee, or role — just add the chain entry
        (state.approvalChain as ApprovalChainEntry[]).push(entry);
        state.updatedAt = new Date();
      });

      const result = await getDb().saveQuote(useQuoteStore.getState() as QuoteState);
      if (!result.success) {
        toast.error('Save failed', { description: result.error });
        const fresh = await getDb().loadQuote(currentState.id);
        if (fresh) useQuoteStore.getState().loadQuote(fresh);
        return; // Skip audit logging
      }
      useQuoteStore.getState().setVersion(result.version);
      useQuoteStore.getState().markSaved();

      await getAuditRepository().log({
        userId: user.id,
        userName: user.fullName,
        action: 'comment',
        entityType: 'quote',
        entityId: currentState.id,
        notes,
        changes: {},
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return {
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
  };
}
