import { WifiOff, AlertTriangle } from 'lucide-react';
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
import { useConnectionStatus } from '../../hooks/useConnectionStatus';

export function DashboardLayout() {
  const { isOnline, isSupabaseReachable } = useConnectionStatus();

  // Determine which banner (if any) to show. Offline takes priority over a
  // reachability issue because it implies the same root cause.
  const showOfflineBanner = !isOnline;
  const showReachabilityBanner = isOnline && !isSupabaseReachable;

  return (
    <div className="min-h-screen p-2 sm:p-4">
      {/* ── Connectivity banners ───────────────────────────────────────── */}

      {showOfflineBanner && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 px-4 py-3 mb-3 rounded-lg
                     bg-danger/15 border border-danger/40 text-danger
                     animate-fade-in"
        >
          <WifiOff className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">
            You are offline. Changes will not be saved.
          </span>
        </div>
      )}

      {showReachabilityBanner && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 px-4 py-3 mb-3 rounded-lg
                     bg-warning/15 border border-warning/40 text-warning
                     animate-fade-in"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">
            Connection issue. Retrying...
          </span>
        </div>
      )}

      {/* ── Main layout ────────────────────────────────────────────────── */}

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
