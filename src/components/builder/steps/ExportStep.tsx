import { useState, useEffect } from 'react';
import { Download, Save, Send, CheckCircle, Home, Mail, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuoteStore } from '../../../store/useQuoteStore';
import { useAutoSaveContext } from '../../../hooks/AutoSaveContext';
import { generateQuotePDF } from '../../../pdf/generatePDF';
import { useBuilder } from '../BuilderContext';
import { StepHeader } from '../shared/StepHeader';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/Toast';
import { useApprovalActions } from '../../../hooks/useApprovalActions';
import { ApprovalActionModal } from '../../shared/ApprovalActionModal';
import { getDb } from '../../../db/DatabaseAdapter';
import { ROLE_DISPLAY_NAMES } from '../../../auth/permissions';

export function ExportStep() {
  const quote = useQuoteStore((s) => s);
  const getQuoteTotals = useQuoteStore((s) => s.getQuoteTotals);
  const getSlotPricing = useQuoteStore((s) => s.getSlotPricing);

  const { saveNow } = useAutoSaveContext();
  const navigate = useNavigate();
  const { setCanProceed } = useBuilder();
  const { submit, isProcessing, targetRoles } = useApprovalActions();

  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [exported, setExported] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const markAsSentToCustomer = useQuoteStore((s) => s.markAsSentToCustomer);
  const markAsExpired = useQuoteStore((s) => s.markAsExpired);
  const [targetUsers, setTargetUsers] = useState<{ id: string; fullName: string; role: string }[]>([]);

  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveNow();
    if (success) {
      setSaved(true);
      toast.success('Quote saved successfully');
    } else {
      toast.error('Failed to save quote');
    }
    setIsSaving(false);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const totals = getQuoteTotals();
      const slotPricingMap = new Map();
      quote.slots.forEach((slot) => {
        if (!slot.isEmpty && slot.modelCode !== '0') {
          const pricing = getSlotPricing(slot.slotIndex);
          if (pricing) {
            slotPricingMap.set(slot.slotIndex, pricing);
          }
        }
      });

      const result = await generateQuotePDF(quote, totals, slotPricingMap);

      if (result.success) {
        setExported(true);
        toast.success('PDF exported successfully', { description: result.filename });
      } else {
        toast.error('PDF export failed', { description: result.error });
      }
    } catch (error) {
      toast.error('Failed to export PDF', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Bug #25 fix: cancel async work if the component unmounts or modal closes
  useEffect(() => {
    if (!showApprovalModal) return;
    let cancelled = false;
    const loadUsers = async () => {
      const db = getDb();
      const allUsers: { id: string; fullName: string; role: string }[] = [];
      for (const role of targetRoles) {
        const users = await db.getUsersByRole(role);
        allUsers.push(...users.map((u: any) => ({ id: u.id, fullName: u.fullName || u.full_name, role: u.role })));
      }
      if (!cancelled) {
        setTargetUsers(allUsers);
      }
    };
    loadUsers();
    return () => { cancelled = true; };
  }, [showApprovalModal, targetRoles]);

  const handleSubmitForApproval = () => {
    setShowSubmitConfirm(true);
  };

  const handleSubmitConfirmProceed = () => {
    setShowSubmitConfirm(false);
    setShowApprovalModal(true);
  };

  const handleApprovalConfirm = async (data: {
    targetUserId?: string;
    targetUserName?: string;
    targetRole?: string;
    notes: string;
  }) => {
    try {
      await submit(data.targetUserId!, data.targetUserName!, data.targetRole!, data.notes);
      toast.success('Quote submitted for approval');
      setShowApprovalModal(false);
    } catch (error) {
      toast.error('Failed to submit for approval');
    }
  };

  return (
    <div className="glass rounded-xl p-6">
      <StepHeader
        step={7}
        title="Export & Save"
        subtitle="Save your quote, generate a PDF, or submit for approval."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Save */}
        <div className="glass rounded-xl p-5 border border-surface-700/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <Save className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <div className="text-sm font-semibold text-surface-200">Save Quote</div>
              <div className="text-xs text-surface-400">Keeps the quote as a draft — not sent for approval</div>
            </div>
          </div>
          <Button
            variant="secondary"
            icon={saved ? CheckCircle : Save}
            onClick={handleSave}
            loading={isSaving}
            className="w-full"
          >
            {saved ? 'Saved!' : 'Save Quote'}
          </Button>
        </div>

        {/* Export PDF */}
        <div className="glass rounded-xl p-5 border border-surface-700/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-feature-500/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-feature-500" />
            </div>
            <div>
              <div className="text-sm font-semibold text-surface-200">Export PDF</div>
              <div className="text-xs text-surface-400">Generate and download quote PDF</div>
            </div>
          </div>
          <Button
            variant="primary"
            icon={exported ? CheckCircle : Download}
            onClick={handleExportPDF}
            loading={isExporting}
            className="w-full"
          >
            {isExporting ? 'Generating...' : exported ? 'Exported!' : 'Generate PDF'}
          </Button>
        </div>

        {/* Submit for Approval */}
        <div className="glass rounded-xl p-5 border border-success/30 bg-success/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Send className="w-5 h-5 text-success" />
            </div>
            <div>
              <div className="text-sm font-semibold text-surface-100">Submit for Approval</div>
              <div className="text-xs text-surface-400">Sends the quote to your manager for review and sign-off</div>
            </div>
          </div>
          <Button
            variant="primary"
            icon={Send}
            onClick={handleSubmitForApproval}
            disabled={quote.status !== 'draft' && quote.status !== 'changes-requested'}
            loading={isProcessing}
            className="w-full bg-success hover:bg-success/90 text-white border-success/50"
          >
            {quote.status === 'pending-approval' ? 'Pending Approval' : 'Submit for Approval'}
          </Button>
        </div>

        {/* Mark as Sent to Customer — only when approved */}
        {quote.status === 'approved' && (
          <div className="glass rounded-xl p-5 border border-surface-700/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-surface-200">Send to Customer</div>
                <div className="text-xs text-surface-400">Mark this quote as sent to the customer</div>
              </div>
            </div>
            <Button
              variant="primary"
              icon={Mail}
              onClick={() => { markAsSentToCustomer(); toast.success('Quote marked as sent to customer'); }}
              className="w-full"
            >
              Mark as Sent
            </Button>
          </div>
        )}

        {/* Mark as Expired — when sent or approved */}
        {(quote.status === 'approved' || quote.status === 'sent-to-customer') && (
          <div className="glass rounded-xl p-5 border border-surface-700/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-surface-200">Mark Expired</div>
                <div className="text-xs text-surface-400">Mark this quote as expired</div>
              </div>
            </div>
            <Button
              variant="ghost"
              icon={Clock}
              onClick={() => { markAsExpired(); toast.success('Quote marked as expired'); }}
              className="w-full text-red-400 hover:text-red-300"
            >
              Mark as Expired
            </Button>
          </div>
        )}

        {/* Back to Quote */}
        <div className="glass rounded-xl p-5 border border-surface-700/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-surface-700/50 flex items-center justify-center">
              <Home className="w-5 h-5 text-surface-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-surface-200">Back to Quote</div>
              <div className="text-xs text-surface-400">Return to the quote dashboard view</div>
            </div>
          </div>
          <Button
            variant="ghost"
            icon={Home}
            onClick={() => {
              const quoteId = useQuoteStore.getState().id;
              navigate(quoteId ? `/quote?id=${quoteId}` : '/quote');
            }}
            className="w-full"
          >
            Back to Quote
          </Button>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-xl p-6 max-w-md w-full mx-4 border border-surface-600/40 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-base font-semibold text-surface-100 mb-1">Submit for Approval?</div>
                <div className="text-sm text-surface-400">
                  This will send the quote to your manager for review. Once submitted, you will not be able to edit it until feedback is provided.
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <Button
                variant="ghost"
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={Send}
                onClick={handleSubmitConfirmProceed}
                className="px-4 bg-success hover:bg-success/90 border-success/50"
              >
                Yes, Submit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Action Modal */}
      <ApprovalActionModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        action="submit"
        title="Submit for Approval"
        showTargetPicker={true}
        targetRoles={targetRoles.map((r) => ({ value: r, label: ROLE_DISPLAY_NAMES[r] }))}
        users={targetUsers}
        onConfirm={handleApprovalConfirm}
        isProcessing={isProcessing}
      />
    </div>
  );
}
