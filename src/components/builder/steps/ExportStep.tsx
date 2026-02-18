import { useState, useEffect } from 'react';
import { Download, Save, Send, FileText, CheckCircle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuoteStore } from '../../../store/useQuoteStore';
import { useQuoteDB } from '../../../hooks/useQuoteDB';
import { useAutoSave } from '../../../hooks/useAutoSave';
import { generateQuotePDF } from '../../../pdf/generatePDF';
import { useBuilder } from '../BuilderContext';
import { StepHeader } from '../shared/StepHeader';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/Toast';
import { useAuth } from '../../auth/AuthContext';

export function ExportStep() {
  const quote = useQuoteStore((s) => s);
  const getQuoteTotals = useQuoteStore((s) => s.getQuoteTotals);
  const getSlotPricing = useQuoteStore((s) => s.getSlotPricing);
  const submitForApproval = useQuoteStore((s) => s.submitForApproval);

  const { saveNow, status: saveStatus } = useAutoSave();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setCanProceed } = useBuilder();

  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [exported, setExported] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const handleSubmitForApproval = () => {
    if (user) {
      submitForApproval(user.id || user.username);
      toast.success('Quote submitted for approval');
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
            disabled={quote.approvalStatus === 'pending-approval'}
            className="w-full"
          >
            {quote.approvalStatus === 'pending-approval' ? 'Pending Approval' : 'Submit'}
          </Button>
        </div>

        {/* Back to Dashboard */}
        <div className="glass rounded-xl p-5 border border-surface-700/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-surface-700/50 flex items-center justify-center">
              <Home className="w-5 h-5 text-surface-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-surface-200">Back to Dashboard</div>
              <div className="text-xs text-surface-400">View in full dashboard layout</div>
            </div>
          </div>
          <Button
            variant="ghost"
            icon={Home}
            onClick={() => navigate('/')}
            className="w-full"
          >
            Open Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
