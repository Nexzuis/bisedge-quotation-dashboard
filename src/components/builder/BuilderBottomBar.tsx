import { ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { Button } from '../ui/Button';
import { useBuilder, STEP_LABELS } from './BuilderContext';
import { RunningTotal } from './shared/RunningTotal';

// Steps that can be skipped (costs + configure are optional)
const SKIPPABLE_STEPS = new Set([3, 4]);

export function BuilderBottomBar() {
  const { currentStep, nextStep, prevStep, canProceed, totalSteps } = useBuilder();

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const isSkippable = SKIPPABLE_STEPS.has(currentStep);
  const nextLabel = currentStep === totalSteps - 2 ? 'Finish' : 'Next';

  return (
    <div className="glass rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Left: Running total */}
        <RunningTotal />

        {/* Right: Navigation buttons */}
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button variant="secondary" icon={ChevronLeft} onClick={prevStep}>
              Back
            </Button>
          )}

          {isSkippable && (
            <Button variant="ghost" icon={SkipForward} onClick={nextStep}>
              Skip
            </Button>
          )}

          {!isLastStep && (
            <Button
              variant="primary"
              icon={ChevronRight}
              onClick={nextStep}
              disabled={!canProceed}
            >
              {nextLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
