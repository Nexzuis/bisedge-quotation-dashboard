import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  User as UserIcon,
  Loader2,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { getDb } from '../../../db/DatabaseAdapter';
import { supabase } from '../../../lib/supabase';
import { toast } from '../../ui/Toast';
import { ApprovalChainBreadcrumb } from '../../shared/ApprovalChainBreadcrumb';
import { ApprovalActionModal } from '../../shared/ApprovalActionModal';
import { ROLE_DISPLAY_NAMES, type Role } from '../../../auth/permissions';
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
import type { ApprovalChainEntry } from '../../../types/quote';
import type { PermissionOverrides } from '../../../auth/permissions';

interface PendingQuote {
  id: string;
  quoteRef: string;
  clientName: string;
  contactName: string;
  status: string;
  currentAssigneeId: string | null;
  currentAssigneeRole: string | null;
  approvalChain: ApprovalChainEntry[];
  submittedBy: string | null;
  submittedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  submitterName?: string;
}

export function ApprovalDashboard() {
  const { user } = useAuthStore();
  const [quotes, setQuotes] = useState<PendingQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, approvedToday: 0, rejectedToday: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!user) return;
    loadPendingQuotes();
  }, [user, page]);

  const loadPendingQuotes = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const db = getDb();

      // Single query: both statuses + server-side assignee filter + pagination
      let query = supabase
        .from('quotes')
        .select('*', { count: 'exact' })
        .in('status', ['pending-approval', 'in-review'])
        .order('created_at', { ascending: true });

      // Server-side assignee filter for non-admins
      if (user.role !== 'system_admin') {
        query = query.eq('current_assignee_id', user.id);
      }

      // Apply pagination
      const offset = (page - 1) * PAGE_SIZE;
      query = query.range(offset, offset + PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (error) throw error;

      const total = count ?? 0;
      setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));

      // Parse rows into PendingQuote shape
      const parsed: PendingQuote[] = await Promise.all(
        (data || []).map(async (q: any) => {
          let chain: ApprovalChainEntry[] = [];
          try {
            const rawChain = q.approval_chain || q.approvalChain;
            chain = typeof rawChain === 'string' ? JSON.parse(rawChain) : rawChain || [];
          } catch (e) { console.error('Failed to parse approval chain for quote:', q.id, e); chain = []; }

          let submitterName = 'Unknown';
          const submittedBy = q.submitted_by || q.submittedBy;
          if (submittedBy) {
            try {
              const submitter = await db.getUser(submittedBy);
              if (submitter) submitterName = submitter.fullName || submitter.full_name || 'Unknown';
            } catch (e) { console.warn('Failed to load submitter for:', submittedBy, e); }
          }

          return {
            id: q.id,
            quoteRef: q.quote_ref || q.quoteRef || '',
            clientName: q.client_name || q.clientName || '',
            contactName: q.contact_name || q.contactName || '',
            status: q.status,
            currentAssigneeId: q.current_assignee_id || q.currentAssigneeId || null,
            currentAssigneeRole: q.current_assignee_role || q.currentAssigneeRole || null,
            approvalChain: chain,
            submittedBy: submittedBy || null,
            submittedAt: q.submitted_at || q.submittedAt || null,
            createdBy: q.created_by || q.createdBy || null,
            createdAt: q.created_at || q.createdAt || '',
            submitterName,
          };
        })
      );

      setQuotes(parsed);

      // Query today's approval/rejection counts
      try {
        const auditRepo = getAuditRepository();
        const recentAudit = await auditRepo.getRecent(200);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayMs = today.getTime();
        const approvedToday = recentAudit.filter(
          (e) => e.action === 'approve' && new Date(e.timestamp).getTime() >= todayMs
        ).length;
        const rejectedToday = recentAudit.filter(
          (e) => e.action === 'reject' && new Date(e.timestamp).getTime() >= todayMs
        ).length;
        setStats({ pending: total, approvedToday, rejectedToday });
      } catch (e) {
        console.warn('Failed to load approval stats:', e);
        setStats({ pending: total, approvedToday: 0, rejectedToday: 0 });
      }
    } catch (error) {
      console.error('Error loading pending approvals:', error);
      toast.error('Failed to load approvals');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-surface-100 mb-2">Approval Queue</h2>
          <p className="text-surface-100/60">
            Quotes assigned to you for review and approval
          </p>
        </div>
        <button
          onClick={loadPendingQuotes}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-700/50 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <Clock className="w-8 h-8 text-amber-400" />
            <span className="text-3xl font-bold text-amber-400">{stats.pending}</span>
          </div>
          <p className="text-sm text-surface-100/60 mt-2">Pending Approval</p>
        </div>
        <div className="bg-surface-700/50 backdrop-blur-xl border border-green-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <span className="text-3xl font-bold text-green-400">{stats.approvedToday}</span>
          </div>
          <p className="text-sm text-surface-100/60 mt-2">Approved Today</p>
        </div>
        <div className="bg-surface-700/50 backdrop-blur-xl border border-red-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <XCircle className="w-8 h-8 text-red-400" />
            <span className="text-3xl font-bold text-red-400">{stats.rejectedToday}</span>
          </div>
          <p className="text-sm text-surface-100/60 mt-2">Rejected Today</p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && quotes.length === 0 && (
        <div className="bg-surface-700/50 backdrop-blur-xl border border-surface-600/50 rounded-2xl p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-surface-100 mb-2">All Caught Up!</h3>
          <p className="text-surface-100/60">No quotes pending your approval</p>
        </div>
      )}

      {/* Quote cards */}
      {!isLoading && quotes.map((q) => (
        <ApprovalCard key={q.id} quote={q} onRefresh={loadPendingQuotes} />
      ))}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-sm text-surface-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function ApprovalCard({ quote, onRefresh }: { quote: PendingQuote; onRefresh: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'escalate' | 'return' | 'comment' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetUsers, setTargetUsers] = useState<{ id: string; fullName: string; role: string }[]>([]);

  const hoursSince = quote.submittedAt
    ? Math.floor((Date.now() - new Date(quote.submittedAt).getTime()) / (1000 * 60 * 60))
    : 0;

  // Get available actions for this specific quote
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
        // Comments should NOT reassign the quote
        currentAssigneeId: isComment ? fullQuote.currentAssigneeId : toUser.id,
        currentAssigneeRole: isComment ? fullQuote.currentAssigneeRole : toUser.role,
        approvalChain: [...(fullQuote.approvalChain || []), entry],
        updatedAt: new Date(),
        ...(modalAction === 'approve' ? { approvedBy: user.id, approvedAt: new Date() } : {}),
      };

      const saveResult = await db.saveQuote(updatedQuote);

      if (!saveResult.success) {
        toast.error('Save failed', { description: saveResult.error });
        return; // Skip audit logging
      }

      await getAuditRepository().log({
        userId: user.id,
        userName: user.fullName,
        action: modalAction as any,
        entityType: 'quote',
        entityId: quote.id,
        notes: data.notes,
        changes: { status: newStatus },
      });

      const actionLabel = modalAction === 'approve' ? 'approved' : modalAction === 'reject' ? 'rejected' : modalAction;
      toast.success(`Quote ${actionLabel}!`);
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
    <div className="bg-surface-700/50 backdrop-blur-xl border border-surface-600/50 rounded-2xl p-6 hover:border-surface-500/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-400" />
            <h3
              className="text-lg font-semibold text-brand-400 hover:text-brand-300 cursor-pointer transition-colors font-mono"
              onClick={() => navigate(`/quote?id=${quote.id}`)}
            >
              {quote.quoteRef}
            </h3>
          </div>
          <p className="text-surface-100/60 text-sm mt-1">{quote.clientName}</p>
        </div>
        <div className="text-right">
          <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
            quote.status === 'pending-approval'
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
          }`}>
            {quote.status.replace(/-/g, ' ')}
          </div>
          <p className="text-xs text-surface-100/40 mt-1">
            <Clock className="w-3 h-3 inline mr-1" />
            {hoursSince < 1 ? 'Just now' : `${hoursSince}h ago`}
          </p>
        </div>
      </div>

      {/* Details row */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div>
          <span className="text-surface-100/40 text-xs">Submitted By</span>
          <div className="text-surface-200 font-medium flex items-center gap-1 mt-0.5">
            <UserIcon className="w-3 h-3" />
            {quote.submitterName || 'Unknown'}
          </div>
        </div>
        <div>
          <span className="text-surface-100/40 text-xs">Contact</span>
          <div className="text-surface-200 mt-0.5">{quote.contactName || '—'}</div>
        </div>
        <div>
          <span className="text-surface-100/40 text-xs">Assigned Role</span>
          <div className="text-brand-400 font-medium mt-0.5">
            {ROLE_DISPLAY_NAMES[quote.currentAssigneeRole as Role] || quote.currentAssigneeRole || '—'}
          </div>
        </div>
      </div>

      {/* Chain breadcrumb */}
      {quote.approvalChain.length > 0 && (
        <div className="mb-4">
          <ApprovalChainBreadcrumb chain={quote.approvalChain} compact />
        </div>
      )}

      {/* Action buttons */}
      {actions.length > 0 && (
        <div className="flex gap-2 pt-3 border-t border-surface-600/30">
          <button
            onClick={() => navigate(`/quote?id=${quote.id}`)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-surface-600 hover:bg-surface-500 text-surface-100 rounded-lg text-sm font-medium transition-colors"
          >
            <Eye className="w-4 h-4" />
            Open Quote
          </button>
          {actions.includes('approve') && (
            <button
              onClick={() => setModalAction('approve')}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-surface-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
          )}
          {actions.includes('reject') && (
            <button
              onClick={() => setModalAction('reject')}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-surface-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          )}
          {actions.includes('escalate') && (
            <button
              onClick={() => setModalAction('escalate')}
              disabled={isProcessing}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-surface-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              Escalate
            </button>
          )}
          {actions.includes('return') && (
            <button
              onClick={() => setModalAction('return')}
              disabled={isProcessing}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-surface-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              Return
            </button>
          )}
          {actions.includes('comment') && (
            <button
              onClick={() => setModalAction('comment')}
              disabled={isProcessing}
              className="px-4 py-2 bg-surface-600 hover:bg-surface-500 text-surface-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              Comment
            </button>
          )}
        </div>
      )}

      {/* Modal */}
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

export function ApprovalStats() {
  const [stats, setStats] = useState({ pending: 0, approvedToday: 0, rejectedToday: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Server-side count for both pending statuses
      const [pendingCount, reviewCount] = await Promise.all([
        supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('status', 'pending-approval'),
        supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('status', 'in-review'),
      ]);
      const totalPending = (pendingCount.count ?? 0) + (reviewCount.count ?? 0);

      const auditRepo = getAuditRepository();
      const recentAudit = await auditRepo.getRecent(200);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayMs = today.getTime();
      setStats({
        pending: totalPending,
        approvedToday: recentAudit.filter(
          (e) => e.action === 'approve' && new Date(e.timestamp).getTime() >= todayMs
        ).length,
        rejectedToday: recentAudit.filter(
          (e) => e.action === 'reject' && new Date(e.timestamp).getTime() >= todayMs
        ).length,
      });
    } catch (e) {
      console.warn('Failed to load approval stats:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-surface-700/50 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <Clock className="w-8 h-8 text-amber-400" />
          <span className="text-3xl font-bold text-amber-400">{loading ? '...' : stats.pending}</span>
        </div>
        <p className="text-sm text-surface-100/60 mt-2">Pending Approval</p>
      </div>
      <div className="bg-surface-700/50 backdrop-blur-xl border border-green-500/20 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <CheckCircle className="w-8 h-8 text-green-400" />
          <span className="text-3xl font-bold text-green-400">{loading ? '...' : stats.approvedToday}</span>
        </div>
        <p className="text-sm text-surface-100/60 mt-2">Approved Today</p>
      </div>
      <div className="bg-surface-700/50 backdrop-blur-xl border border-red-500/20 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <XCircle className="w-8 h-8 text-red-400" />
          <span className="text-3xl font-bold text-red-400">{loading ? '...' : stats.rejectedToday}</span>
        </div>
        <p className="text-sm text-surface-100/60 mt-2">Rejected Today</p>
      </div>
    </div>
  );
}
