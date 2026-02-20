import { useState, useEffect } from 'react';
import { Download, Save, Send, CheckCircle, Home, Mail, Clock } from 'lucide-react';
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
  const markAsSentToCustomer = useQuoteStore((s) => s.markAsSentToCustomer);
  const markAsExpired = useQuoteStore((s) => s.markAsExpired);
  const [targetUsers, setTargetUsers] = useState<{ id: string; fullName: string; role: string }[]>([]);

  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveNow();
      setSaved(true);
      toast.success('Quote saved successfully');
    } catch (error) {
      toast.error('Failed to save quote');
    } finally {
      setIsSaving(false);
    }
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

  // Load target users when the approval modal opens
  useEffect(() => {
    if (!showApprovalModal) return;
    const loadUsers = async () => {
      const db = getDb();
      const allUsers: { id: string; fullName: string; role: string }[] = [];
      for (const role of targetRoles) {
        const users = await db.getUsersByRole(role);
        allUsers.push(...users.map((u: any) => ({ id: u.id, fullName: u.fullName || u.full_name, role: u.role })));
      }
      setTargetUsers(allUsers);
    };
    loadUsers();
  }, [showApprovalModal, targetRoles]);

  const handleSubmitForApproval = () => {
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
              <div className="text-xs text-surface-400">Save to local database</div>
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
        <div className="glass rounded-xl p-5 border border-surface-700/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-warning" />
            </div>
            <div>
              <div className="text-sm font-semibold text-surface-200">Submit for Approval</div>
              <div className="text-xs text-surface-400">Send to manager for review</div>
            </div>
          </div>
          <Button
            variant="secondary"
            icon={Send}
            onClick={handleSubmitForApproval}
            disabled={quote.status !== 'draft' && quote.status !== 'changes-requested'}
            loading={isProcessing}
            className="w-full"
          >
            {quote.status === 'pending-approval' ? 'Pending Approval' : 'Submit'}
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
            onClick={() => navigate('/quote')}
            className="w-full"
          >
            Back to Quote
          </Button>
        </div>
      </div>

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
