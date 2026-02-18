import { CheckCircle } from 'lucide-react';
import { useWorkflowProgress } from '../../hooks/useWorkflowProgress';

/**
 * Workflow progress stepper showing 5-step quotation process
 * Guides users through: Customer → Fleet → Pricing → Financial → Generate
 */
export function WorkflowStepper() {
  const { steps, currentStep, completionPct } = useWorkflowProgress();

  const handleStepClick = (panelIds: string[]) => {
    // Scroll to first panel in the list
    if (panelIds.length > 0) {
      const panelElement = document.getElementById(panelIds[0]);
      panelElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="glass-brand rounded-xl p-4 mb-4">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-surface-200">Quote Progress</h3>
        <span className="text-xs text-surface-400">{Math.round(completionPct)}% Complete</span>
      </div>

      <div className="relative mb-4 h-1">
        <div className="absolute top-0 left-0 right-0 h-full bg-surface-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-700 ease-out"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-start justify-between relative">
        {steps.map((step, index) => {
          const isActive = index === currentStep;

          return (
            <button
              key={step.id}
              onClick={() => handleStepClick(step.panels)}
              className={`flex flex-col items-center gap-2 flex-1 cursor-pointer transition-all hover:scale-105 ${
                index < steps.length - 1 ? 'mr-2' : ''
              }`}
              aria-label={`Step ${index + 1}: ${step.label}${step.completed ? ' (completed)' : ''}`}
            >
              {/* Step Circle */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                  ${step.completed
                    ? 'bg-success border-success text-white'
                    : isActive
                    ? 'bg-brand-500 border-brand-500 text-white'
                    : 'bg-surface-800 border-surface-600 text-surface-400'
                  }
                `}
              >
                {step.completed ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </div>

              {/* Step Label */}
              <div className="text-center">
                <div
                  className={`text-xs font-medium ${
                    step.completed ? 'text-success' : isActive ? 'text-brand-400' : 'text-surface-400'
                  }`}
                >
                  {step.label}
                </div>
                <div className="text-2xs text-surface-500 mt-0.5 hidden md:block">
                  {step.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
