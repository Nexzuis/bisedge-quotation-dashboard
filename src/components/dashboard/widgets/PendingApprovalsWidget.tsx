import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  FileText,
  User as UserIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../../store/useAuthStore';
import { getDb } from '../../../db/DatabaseAdapter';
import { ApprovalActionModal } from '../../shared/ApprovalActionModal';
import { fadeInUp } from '../../crm/shared/motionVariants';
import { ROLE_DISPLAY_NAMES, type Role, type PermissionOverrides } from '../../../auth/permissions';
import {
  getAvailableActions,
  getActionLabel,
  getValidTargets,
  getReturnTargets,
  createChainEntry,
  getNextStatus,
  type ApprovalAction,
} from '../../../engine/approvalEngine';
import { getAuditRepository } from '../../../db/repositories';
import { toast } from '../../ui/Toast';
import type { ApprovalChainEntry } from '../../../types/quote';

interface PendingQuote {
  id: string;
  quoteRef: string;
  clientName: string;
  status: string;
  currentAssigneeId: string | null;
  currentAssigneeRole: string | null;
  approvalChain: ApprovalChainEntry[];
  submittedBy: string | null;
  submittedAt: string | null;
  submitterName?: string;
  createdBy?: string;
}

export function PendingApprovalsWidget() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [quotes, setQuotes] = useState<PendingQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadPending();
  }, [user]);

  const loadPending = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const db = getDb();

      const [pendingResult, reviewResult] = await Promise.all([
        db.listQuotes(
          { page: 1, pageSize: 100, sortBy: 'createdAt', sortOrder: 'asc' },
          { status: 'pending-approval' }
        ),
        db.listQuotes(
          { page: 1, pageSize: 100, sortBy: 'createdAt', sortOrder: 'asc' },
          { status: 'in-review' as any }
        ),
      ]);

      const allItems = [...pendingResult.items, ...reviewResult.items];

      // Filter to quotes assigned to current user (or all if system_admin)
      const filtered = allItems.filter((q: any) => {
        if (user.role === 'system_admin') return true;
        return q.currentAssigneeId === user.id;
      });

      const parsed: PendingQuote[] = await Promise.all(
        filtered.map(async (q: any) => {
          let chain: ApprovalChainEntry[] = [];
          try {
            chain = typeof q.approvalChain === 'string' ? JSON.parse(q.approvalChain) : q.approvalChain || [];
          } catch { chain = []; }

          let submitterName = 'Unknown';
          if (q.submittedBy) {
            try {
              const submitter = await db.getUser(q.submittedBy);
              if (submitter) submitterName = submitter.fullName || submitter.full_name || 'Unknown';
            } catch {}
          }

          return {
            id: q.id,
            quoteRef: q.quoteRef || q.quote_ref || '',
            clientName: q.clientName || q.client_name || '',
            status: q.status,
            currentAssigneeId: q.currentAssigneeId || q.current_assignee_id || null,
            currentAssigneeRole: q.currentAssigneeRole || q.current_assignee_role || null,
            approvalChain: chain,
            submittedBy: q.submittedBy || q.submitted_by || null,
            submittedAt: q.submittedAt || q.submitted_at || null,
            submitterName,
            createdBy: q.createdBy || q.created_by || null,
          };
        })
      );

      setQuotes(parsed.slice(0, 5)); // Show top 5 on dashboard
    } catch (err) {
      console.error('Error loading pending approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <motion.div variants={fadeInUp} className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Pending Approvals
        </h3>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      </motion.div>
    );
  }

  if (quotes.length === 0) {
    return (
      <motion.div variants={fadeInUp} className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          Pending Approvals
        </h3>
        <div className="text-center py-4">
          <p className="text-surface-500 text-sm">All caught up! No approvals pending.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={fadeInUp} className="glass rounded-xl p-5 border border-amber-500/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-surface-300 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          Pending Approvals
          <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">
            {quotes.length}
          </span>
        </h3>
        <button
          onClick={() => navigate('/admin/approvals')}
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          View All
        </button>
      </div>

      <div className="space-y-2">
        {quotes.map((q) => (
          <ApprovalQuickCard
            key={q.id}
            quote={q}
            onRefresh={loadPending}
          />
        ))}
      </div>
    </motion.div>
  );
}

function ApprovalQuickCard({
  quote,
  onRefresh,
}: {
  quote: PendingQuote;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'escalate' | 'return' | 'comment' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetUsers, setTargetUsers] = useState<{ id: string; fullName: string; role: string }[]>([]);

  const hoursSince = quote.submittedAt
    ? Math.floor((Date.now() - new Date(quote.submittedAt).getTime()) / (1000 * 60 * 60))
    : 0;

  const actions = user
    ? getAvailableActions(
        { status: quote.status, currentAssigneeId: quote.currentAssigneeId, createdBy: quote.createdBy || quote.submittedBy } as any,
        user.id,
        user.role as Role,
        user.permissionOverrides as PermissionOverrides
      ).filter((a): a is 'approve' | 'reject' | 'escalate' | 'return' | 'comment' => a !== 'submit' && a !== 'edit')
    : [];

  useEffect(() => {
    if (!modalAction || modalAction === 'approve' || modalAction === 'reject' || modalAction === 'comment') return;
    loadTargetUsers();
  }, [modalAction]);

  const loadTargetUsers = async () => {
    const db = getDb();
    const allUsers: { id: string; fullName: string; role: string }[] = [];
    const roles = modalAction === 'return'
      ? getReturnTargets(user!.role as Role)
      : getValidTargets(user!.role as Role);
    for (const role of roles) {
      const users = await db.getUsersByRole(role);
      allUsers.push(...users.map((u: any) => ({ id: u.id, fullName: u.fullName, role: u.role })));
    }
    setTargetUsers(allUsers);
  };

  const handleConfirm = async (data: { targetUserId?: string; targetUserName?: string; targetRole?: string; notes: string }) => {
    if (!user || !modalAction) return;
    setIsProcessing(true);

    try {
      const db = getDb();
      const fullQuote = await db.loadQuote(quote.id);
      if (!fullQuote) throw new Error('Quote not found');

      const fromUser = { id: user.id, name: user.fullName, role: user.role };
      const toUser = modalAction === 'approve' || modalAction === 'reject' || modalAction === 'comment'
        ? fromUser
        : { id: data.targetUserId!, name: data.targetUserName!, role: data.targetRole! };

      const chainAction = modalAction === 'approve' ? 'approved'
        : modalAction === 'reject' ? 'rejected'
        : modalAction === 'escalate' ? 'escalated'
        : modalAction === 'return' ? 'returned'
        : 'commented';

      const entry = createChainEntry(chainAction as ApprovalChainEntry['action'], fromUser, toUser, data.notes);
      const newStatus = getNextStatus(modalAction as ApprovalAction, fullQuote.status);

      // Bug #23 fix: bail out if transition is invalid
      if (newStatus === null) {
        toast.error('Invalid action', { description: `Cannot "${modalAction}" a quote in "${fullQuote.status}" status.` });
        return;
      }

      const isComment = modalAction === 'comment';
      const updatedQuote = {
        ...fullQuote,
        status: newStatus,
        currentAssigneeId: isComment ? fullQuote.currentAssigneeId : toUser.id,
        currentAssigneeRole: isComment ? fullQuote.currentAssigneeRole : toUser.role,
        approvalChain: [...(fullQuote.approvalChain || []), entry],
        updatedAt: new Date(),
        ...(modalAction === 'approve' ? { approvedBy: user.id, approvedAt: new Date() } : {}),
      };

      await db.saveQuote(updatedQuote);

      await getAuditRepository().log({
        userId: user.id,
        userName: user.fullName,
        action: modalAction as any,
        entityType: 'quote',
        entityId: quote.id,
        notes: data.notes,
        changes: { status: newStatus },
      });

      toast.success(`Quote ${modalAction === 'approve' ? 'approved' : modalAction === 'reject' ? 'rejected' : modalAction}!`);
      setModalAction(null);
      onRefresh();
    } catch (error) {
      console.error('Action failed:', error);
      toast.error('Action failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const needsTargetPicker = modalAction === 'escalate' || modalAction === 'return';
  const modalTargetRoles = modalAction === 'return'
    ? getReturnTargets(user?.role as Role).map((r) => ({ value: r, label: ROLE_DISPLAY_NAMES[r] }))
    : getValidTargets(user?.role as Role).map((r) => ({ value: r, label: ROLE_DISPLAY_NAMES[r] }));

  return (
    <div className="bg-surface-700/30 rounded-lg p-3 hover:bg-surface-700/50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
          <span
            className="font-mono text-sm text-brand-400 hover:text-brand-300 cursor-pointer transition-colors"
            onClick={() => navigate(`/quote?id=${quote.id}`)}
          >
            {quote.quoteRef}
          </span>
          <span className="text-sm text-surface-300 truncate">{quote.clientName}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-surface-500">
            {hoursSince < 1 ? 'Just now' : `${hoursSince}h`}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-surface-500 mb-2">
        <UserIcon className="w-3 h-3" />
        <span>From: {quote.submitterName}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {actions.includes('approve') && (
          <button
            onClick={() => setModalAction('approve')}
            disabled={isProcessing}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-3 h-3" /> Approve
          </button>
        )}
        {actions.includes('reject') && (
          <button
            onClick={() => setModalAction('reject')}
            disabled={isProcessing}
            className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
          >
            <XCircle className="w-3 h-3" /> Reject
          </button>
        )}
        <button
          onClick={() => navigate(`/quote?id=${quote.id}`)}
          className="flex items-center gap-1 px-2.5 py-1 bg-surface-600 hover:bg-surface-500 text-surface-100 rounded text-xs font-medium transition-colors ml-auto"
        >
          <Eye className="w-3 h-3" /> Open Quote
        </button>
      </div>

      {modalAction && (
        <ApprovalActionModal
          isOpen={!!modalAction}
          onClose={() => setModalAction(null)}
          action={modalAction}
          title={getActionLabel(modalAction as ApprovalAction)}
          showTargetPicker={needsTargetPicker}
          targetRoles={modalTargetRoles}
          users={targetUsers}
          onConfirm={handleConfirm}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
