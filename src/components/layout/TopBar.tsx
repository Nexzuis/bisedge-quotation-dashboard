import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Save, Download, FilePlus, FolderOpen, Settings, Wand2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuoteStore } from '../../store/useQuoteStore';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { toast } from '../ui/Toast';
import { formatDate } from '../../engine/formatters';
import { generateQuotePDF } from '../../pdf/generatePDF';
import { useAutoSaveContext } from '../../hooks/AutoSaveContext';
import { useQuoteDB } from '../../hooks/useQuoteDB';
import { LoadQuoteModal } from '../shared/LoadQuoteModal';
import { useAuth } from '../auth/AuthContext';
import { useIsReadOnly } from '../../hooks/ReadOnlyContext';

export function TopBar() {
  const [isExporting, setIsExporting] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);

  const quote = useQuoteStore((state) => state);
  const quoteRef = useQuoteStore((state) => state.quoteRef);
  const status = useQuoteStore((state) => state.status);
  const quoteDate = useQuoteStore((state) => state.quoteDate);
  const customerROE = useQuoteStore((state) => state.customerROE);
  const getQuoteTotals = useQuoteStore((state) => state.getQuoteTotals);
  const getSlotPricing = useQuoteStore((state) => state.getSlotPricing);

  // Auto-save hook
  const { status: saveStatus, lastSavedAt, saveNow } = useAutoSaveContext();

  // Quote DB operations
  const { createNewQuote } = useQuoteDB();

  // Read-only state
  const { isReadOnly } = useIsReadOnly();

  // Auth and navigation
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'system_admin' || user?.role === 'sales_manager' || user?.role === 'local_leader' || user?.role === 'ceo';

  const statusVariant =
    status === 'approved'
      ? 'success'
      : status === 'rejected'
      ? 'danger'
      : status === 'pending-approval'
      ? 'warning'
      : status === 'in-review'
      ? 'brand'
      : status === 'changes-requested'
      ? 'warning'
      : 'info';

  const handleExportPDF = async () => {
    setIsExporting(true);

    try {
      // Get all necessary data
      const totals = getQuoteTotals();

      // Build slot pricing map
      const slotPricingMap = new Map();
      quote.slots.forEach((slot) => {
        if (!slot.isEmpty && slot.modelCode !== '0') {
          const pricing = getSlotPricing(slot.slotIndex);
          if (pricing) {
            slotPricingMap.set(slot.slotIndex, pricing);
          }
        }
      });

      // Generate PDF
      const result = await generateQuotePDF(quote, totals, slotPricingMap);

      if (result.success) {
        toast.success('PDF exported successfully', {
          description: result.filename
        });
      } else {
        toast.error('PDF export failed', {
          description: result.error
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF', {
        description: error instanceof Error ? error.message : 'Check console for details'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const updatedAt = useQuoteStore((state) => state.updatedAt);
  const hasUnsavedChanges = !!(lastSavedAt && updatedAt > lastSavedAt);

  const handleNewQuote = async () => {
    if (hasUnsavedChanges) {
      setShowNewQuoteModal(true);
    } else {
      await createNewQuote();
    }
  };

  const handleSaveAndNew = async () => {
    setShowNewQuoteModal(false);
    const success = await saveNow();
    if (!success) {
      toast.error('Failed to save quote');
      return;
    }
    toast.success('Quote saved');
    await createNewQuote();
  };

  const handleDiscardAndNew = async () => {
    setShowNewQuoteModal(false);
    await createNewQuote();
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return lastSavedAt
          ? `Saved at ${lastSavedAt.toLocaleTimeString()}`
          : 'Saved';
      case 'error':
        return 'Save failed';
      default:
        return '';
    }
  };

  return (
    <div className="glass rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Left Side - Quote Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-500" />
            <div>
              <div className="text-sm text-surface-400">Quote Reference</div>
              <div className="text-lg font-semibold text-surface-100">{quoteRef}</div>
            </div>
          </div>

          <div className="h-10 w-px bg-surface-700" />

          <div>
            <div className="text-sm text-surface-400">Date</div>
            <div className="text-sm font-medium text-surface-100">
              {formatDate(quoteDate)}
            </div>
          </div>

          <div className="h-10 w-px bg-surface-700" />

          <div>
            <div className="text-sm text-surface-400">Status</div>
            <Badge variant={statusVariant}>{status.replace('-', ' ').toUpperCase()}</Badge>
          </div>
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-3">
          {/* Customer ROE Badge (read-only, edit in Settings) */}
          <Badge variant="info" className="text-sm">
            ROE: {customerROE.toFixed(2)}
          </Badge>

          {/* Save Status Indicator */}
          {saveStatus !== 'idle' && (
            <div className="text-xs text-surface-400">
              {getSaveStatusText()}
            </div>
          )}

          <Button variant="feature" icon={Wand2} onClick={() => navigate('/builder')}>
            Builder
          </Button>

          {isAdmin && (
            <Button variant="secondary" icon={Settings} onClick={() => navigate('/admin')}>
              Admin
            </Button>
          )}
          <Button variant="secondary" icon={FilePlus} onClick={handleNewQuote}>
            New
          </Button>
          <Button variant="secondary" icon={FolderOpen} onClick={() => setShowLoadModal(true)}>
            Load
          </Button>
          <Button
            variant="secondary"
            icon={Save}
            onClick={async () => {
              const success = await saveNow();
              if (success) {
                toast.success('Quote saved');
              }
            }}
            loading={saveStatus === 'saving'}
            disabled={isReadOnly}
          >
            Save
          </Button>
          <Button
            variant="primary"
            icon={Download}
            onClick={handleExportPDF}
            loading={isExporting}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* Load Quote Modal */}
      <LoadQuoteModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onQuoteLoaded={() => {
          // Modal will close itself, just refresh if needed
        }}
      />

      {/* Unsaved Changes Modal */}
      {showNewQuoteModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-quote-dialog-title"
          onKeyDown={(e) => e.key === 'Escape' && setShowNewQuoteModal(false)}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setShowNewQuoteModal(false)}
          />
          <div className="relative bg-slate-900 border border-surface-600/50 rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/50">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 id="new-quote-dialog-title" className="text-xl font-bold text-surface-100 mb-2">
                  Unsaved Changes
                </h3>
                <p className="text-surface-100/60">
                  You have unsaved changes. What would you like to do?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewQuoteModal(false)}
                className="px-4 py-2 bg-surface-800/40 hover:bg-surface-700/50 border border-surface-700/50 rounded-lg text-surface-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscardAndNew}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-surface-100 rounded-lg transition-colors"
              >
                Discard &amp; New
              </button>
              <button
                onClick={handleSaveAndNew}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-100 rounded-lg transition-colors"
              >
                Save &amp; New
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
