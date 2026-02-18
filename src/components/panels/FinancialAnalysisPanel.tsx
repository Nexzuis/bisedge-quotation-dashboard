import { TrendingUp, DollarSign, Target, Award } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useQuoteStore } from '../../store/useQuoteStore';
import { formatZAR, formatPercentage } from '../../engine/formatters';

export function FinancialAnalysisPanel() {
  const getQuoteTotals = useQuoteStore((state) => state.getQuoteTotals);
  const totals = getQuoteTotals();

  const irrDisplay = totals.irr ? formatPercentage(totals.irr * 100, 2) : 'N/A';
  const irrVariant =
    totals.irr && totals.irr >= 0.15
      ? 'success'
      : totals.irr && totals.irr >= 0.10
      ? 'warning'
      : 'danger';

  return (
    <Panel accent="feature">
      <CardHeader icon={TrendingUp} title="Financial Analysis" />

      <div className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* IRR */}
          <div className="glass-feature rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-surface-400 flex items-center gap-1">
                <Target className="w-3 h-3" />
                IRR
              </span>
              <Badge variant={irrVariant}>{irrDisplay}</Badge>
            </div>
            <div className="text-xs text-surface-500">Internal Rate of Return</div>
          </div>

          {/* NPV */}
          <div className="glass-feature rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-surface-400 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                NPV
              </span>
              <span className="text-sm font-bold text-surface-200">
                {formatZAR(totals.npv, false)}
              </span>
            </div>
            <div className="text-xs text-surface-500">Net Present Value</div>
          </div>

          {/* Commission */}
          <div className="glass-feature rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-surface-400 flex items-center gap-1">
                <Award className="w-3 h-3" />
                Commission
              </span>
              <span className="text-sm font-bold text-feature-400">
                {formatZAR(totals.commission, false)}
              </span>
            </div>
            <div className="text-xs text-surface-500">Based on {formatPercentage(totals.averageMargin)} margin</div>
          </div>

          {/* Total Contract Value */}
          <div className="glass-feature rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-surface-400 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Contract
              </span>
              <span className="text-sm font-bold text-surface-200">
                {formatZAR(totals.totalContractValue, false)}
              </span>
            </div>
            <div className="text-xs text-surface-500">Total Contract Value</div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="border-t border-surface-700/50 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Total Sales Price</span>
            <span className="font-mono text-surface-200">{formatZAR(totals.totalSalesPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Total Factory Cost</span>
            <span className="font-mono text-surface-200">{formatZAR(totals.totalFactoryCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Average Margin</span>
            <span className="font-semibold text-brand-400">
              {formatPercentage(totals.averageMargin)}
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
