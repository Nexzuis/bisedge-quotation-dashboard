import { useQuoteStore } from '../store/useQuoteStore';

export interface WorkflowStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  panels: string[]; // Panel IDs to scroll to
}

/**
 * Hook to track quote workflow progress through 5 key steps
 * Determines completion based on quote state
 */
export function useWorkflowProgress() {
  const quote = useQuoteStore();
  const totals = quote.getQuoteTotals();

  const steps: WorkflowStep[] = [
    {
      id: 'customer',
      label: 'Customer Details',
      description: 'Enter customer information',
      completed: !!quote.clientName.trim() && !!quote.contactName.trim(),
      panels: ['deal-overview'],
    },
    {
      id: 'fleet',
      label: 'Fleet Configuration',
      description: 'Configure forklift units',
      completed: quote.slots.some(s => !s.isEmpty && s.modelCode !== '0' && s.batteryId),
      panels: ['fleet-builder'],
    },
    {
      id: 'pricing',
      label: 'Pricing Review',
      description: 'Review margins and pricing',
      completed: quote.slots.some(s => !s.isEmpty) && totals.averageMargin > 0,
      panels: ['pricing-margins'],
    },
    {
      id: 'financial',
      label: 'Financial Check',
      description: 'Verify IRR and NPV',
      completed: totals.irr !== null && totals.irr > 0,
      panels: ['financial-analysis'],
    },
    {
      id: 'generate',
      label: 'Generate Quote',
      description: 'Export PDF quotation',
      completed: quote.status !== 'draft', // Marked complete when quote is submitted/approved
      panels: ['quote-generator'],
    },
  ];

  // Find current step (first incomplete step)
  const currentStepIndex = steps.findIndex(s => !s.completed);
  const currentStep = currentStepIndex === -1 ? steps.length - 1 : currentStepIndex;

  // Calculate overall completion percentage
  const completedCount = steps.filter(s => s.completed).length;
  const completionPct = (completedCount / steps.length) * 100;

  return {
    steps,
    currentStep,
    completionPct,
    isComplete: completedCount === steps.length,
  };
}
