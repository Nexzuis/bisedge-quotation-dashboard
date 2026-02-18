import { TopBar } from './TopBar';
import { WorkflowStepper } from './WorkflowStepper';
import { DealOverviewPanel } from '../panels/DealOverviewPanel';
import { FleetBuilderPanel } from '../panels/FleetBuilderPanel';
import { PricingMarginsPanel } from '../panels/PricingMarginsPanel';
import { FinancialAnalysisPanel } from '../panels/FinancialAnalysisPanel';
import { SettingsPanel } from '../panels/SettingsPanel';
import { ApprovalWorkflowPanel } from '../panels/ApprovalWorkflowPanel';
import { SpecsViewerPanel } from '../panels/SpecsViewerPanel';
import { LogisticsPanel } from '../panels/LogisticsPanel';
import { QuoteGeneratorPanel } from '../panels/QuoteGeneratorPanel';

export function DashboardLayout() {
  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-[1600px]">
        <TopBar />
        <WorkflowStepper />

        {/* Improved Grid Layout - FleetBuilder gets 2-column span */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {/* Row 1: Deal Overview (1col) | FleetBuilder (2col span on lg) */}
          <DealOverviewPanel />
          <div className="md:col-span-1 lg:col-span-2">
            <FleetBuilderPanel />
          </div>

          {/* Row 2: Three panels */}
          <PricingMarginsPanel />
          <SpecsViewerPanel />
          <LogisticsPanel />

          {/* Row 3: Three panels */}
          <FinancialAnalysisPanel />
          <ApprovalWorkflowPanel />
          <QuoteGeneratorPanel />

          {/* Settings - Full width at bottom */}
          <div className="lg:col-span-3">
            <SettingsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
