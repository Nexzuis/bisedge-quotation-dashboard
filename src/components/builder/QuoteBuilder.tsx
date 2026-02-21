import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { BuilderProvider, useBuilder } from './BuilderContext';
import { BuilderLayout } from './BuilderLayout';
import { AnimatedStep } from './AnimatedStep';
import { ClientInfoStep } from './steps/ClientInfoStep';
import { QuoteSettingsStep } from './steps/QuoteSettingsStep';
import { SelectUnitsStep } from './steps/SelectUnitsStep';
import { ConfigureOptionsStep } from './steps/ConfigureOptionsStep';
import { CostsStep } from './steps/CostsStep';
import { CommercialStep } from './steps/CommercialStep';
import { ReviewSummaryStep } from './steps/ReviewSummaryStep';
import { ExportStep } from './steps/ExportStep';
import { useQuoteStore } from '../../store/useQuoteStore';
import { useAutoSaveContext } from '../../hooks/AutoSaveContext';
import { useQuoteLock } from '../../hooks/useQuoteLock';
import { useRealtimeQuote } from '../../hooks/useRealtimeQuote';
import { ReadOnlyProvider } from '../../hooks/ReadOnlyContext';
import { toast } from '../ui/Toast';

const STEPS = [
  ClientInfoStep,
  QuoteSettingsStep,
  SelectUnitsStep,
  ConfigureOptionsStep,
  CostsStep,
  CommercialStep,
  ReviewSummaryStep,
  ExportStep,
];

function BuilderContent() {
  const { currentStep } = useBuilder();
  const quoteId = useQuoteStore((s) => s.id);
  const StepComponent = STEPS[currentStep];

  // Acquire lock when entering builder, release on unmount
  const { isLocked, lockedByName, hasLock } = useQuoteLock(quoteId);

  // Subscribe to realtime updates from other users
  useRealtimeQuote(quoteId);

  const isReadOnly = isLocked && !hasLock;
  const readOnlyReason = isReadOnly
    ? `This quote is currently being edited by ${lockedByName || 'another user'}.`
    : null;

  return (
    <ReadOnlyProvider isReadOnly={isReadOnly} readOnlyReason={readOnlyReason}>
      <BuilderLayout>
        {isReadOnly && (
          <div className="mx-4 mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            This quote is currently being edited by {lockedByName || 'another user'}. You are viewing in read-only mode.
          </div>
        )}
        <AnimatedStep stepKey={currentStep}>
          <StepComponent />
        </AnimatedStep>
      </BuilderLayout>
    </ReadOnlyProvider>
  );
}

/**
 * Navigation guard for unsaved changes.
 * Intercepts hash-based navigation away from /builder and shows a
 * confirmation modal when the quote has unsaved edits.
 */
function NavigationGuard() {
  const navigate = useNavigate();
  const { lastSavedAt, saveNow } = useAutoSaveContext();
  const [showModal, setShowModal] = useState(false);
  const pendingHashRef = useRef<string | null>(null);

  const getHasUnsavedChanges = useCallback(() => {
    const updatedAt = useQuoteStore.getState().updatedAt;
    return !!(lastSavedAt && updatedAt > lastSavedAt);
  }, [lastSavedAt]);

  useEffect(() => {
    const handleHashChange = (e: HashChangeEvent) => {
      const oldHash = new URL(e.oldURL).hash;
      const newHash = new URL(e.newURL).hash;

      // Only guard when leaving /builder
      if (!oldHash.startsWith('#/builder')) return;
      if (newHash.startsWith('#/builder')) return;

      if (getHasUnsavedChanges()) {
        // Revert to builder
        pendingHashRef.current = newHash;
        window.history.replaceState(null, '', oldHash);
        setShowModal(true);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [getHasUnsavedChanges]);

  const proceedToTarget = useCallback(() => {
    const target = pendingHashRef.current;
    pendingHashRef.current = null;
    setShowModal(false);
    if (target) {
      // Extract the path from hash (e.g. "#/quote" → "/quote")
      const path = target.startsWith('#') ? target.slice(1) : target;
      navigate(path);
    }
  }, [navigate]);

  const handleSaveAndLeave = async () => {
    const success = await saveNow();
    if (!success) {
      toast.error('Failed to save quote');
      setShowModal(false);
      pendingHashRef.current = null;
      return;
    }
    toast.success('Quote saved');
    proceedToTarget();
  };

  const handleDiscard = () => {
    proceedToTarget();
  };

  const handleCancel = () => {
    pendingHashRef.current = null;
    setShowModal(false);
  };

  if (!showModal) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nav-guard-dialog-title"
      onKeyDown={(e) => e.key === 'Escape' && handleCancel()}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={handleCancel}
      />
      <div className="relative bg-slate-900 border border-surface-600/50 rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/50">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h3 id="nav-guard-dialog-title" className="text-xl font-bold text-surface-100 mb-2">
              Unsaved Changes
            </h3>
            <p className="text-surface-100/60">
              You have unsaved changes. What would you like to do?
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-surface-800/40 hover:bg-surface-700/50 border border-surface-700/50 rounded-lg text-surface-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDiscard}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-surface-100 rounded-lg transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleSaveAndLeave}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-100 rounded-lg transition-colors"
          >
            Save &amp; Leave
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function QuoteBuilder() {
  return (
    <BuilderProvider>
      <NavigationGuard />
      <BuilderContent />
    </BuilderProvider>
  );
}
