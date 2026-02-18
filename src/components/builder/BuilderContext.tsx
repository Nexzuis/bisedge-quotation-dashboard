import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type UnitPickerPhase = 'roster' | 'series' | 'model';

interface BuilderState {
  currentStep: number;
  activeSlotIndex: number | null;
  unitPickerPhase: UnitPickerPhase;
  direction: 'forward' | 'back';
  completedSteps: Set<number>;
  activeUnitTab: number;
}

interface BuilderContextValue extends BuilderState {
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  markStepCompleted: (step: number) => void;
  setActiveSlotIndex: (index: number | null) => void;
  setUnitPickerPhase: (phase: UnitPickerPhase) => void;
  setActiveUnitTab: (tab: number) => void;
  canProceed: boolean;
  setCanProceed: (can: boolean) => void;
  totalSteps: number;
}

const BuilderCtx = createContext<BuilderContextValue | null>(null);

export const STEP_LABELS = [
  'Client Info',
  'Settings',
  'Select Units',
  'Configure',
  'Costs',
  'Commercial',
  'Review',
  'Export',
] as const;

export const TOTAL_STEPS = STEP_LABELS.length;

export function BuilderProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [unitPickerPhase, setUnitPickerPhase] = useState<UnitPickerPhase>('roster');
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [activeUnitTab, setActiveUnitTab] = useState(0);
  const [canProceed, setCanProceed] = useState(false);

  const goToStep = useCallback((step: number) => {
    setDirection(step > currentStep ? 'forward' : 'back');
    setCurrentStep(Math.max(0, Math.min(TOTAL_STEPS - 1, step)));
  }, [currentStep]);

  const nextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setDirection('forward');
      setCompletedSteps((prev) => new Set(prev).add(currentStep));
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setDirection('back');
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const markStepCompleted = useCallback((step: number) => {
    setCompletedSteps((prev) => new Set(prev).add(step));
  }, []);

  return (
    <BuilderCtx.Provider
      value={{
        currentStep,
        activeSlotIndex,
        unitPickerPhase,
        direction,
        completedSteps,
        activeUnitTab,
        goToStep,
        nextStep,
        prevStep,
        markStepCompleted,
        setActiveSlotIndex,
        setUnitPickerPhase,
        setActiveUnitTab,
        canProceed,
        setCanProceed,
        totalSteps: TOTAL_STEPS,
      }}
    >
      {children}
    </BuilderCtx.Provider>
  );
}

export function useBuilder() {
  const ctx = useContext(BuilderCtx);
  if (!ctx) throw new Error('useBuilder must be used within BuilderProvider');
  return ctx;
}
