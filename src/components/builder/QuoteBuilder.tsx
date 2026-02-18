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
  const StepComponent = STEPS[currentStep];

  return (
    <BuilderLayout>
      <AnimatedStep stepKey={currentStep}>
        <StepComponent />
      </AnimatedStep>
    </BuilderLayout>
  );
}

export default function QuoteBuilder() {
  return (
    <BuilderProvider>
      <BuilderContent />
    </BuilderProvider>
  );
}
