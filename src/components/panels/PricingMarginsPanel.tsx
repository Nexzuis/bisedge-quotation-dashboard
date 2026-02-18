import { DollarSign } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { CardHeader } from '../ui/Card';
import { useQuoteStore } from '../../store/useQuoteStore';
import { formatZAR, formatPercentage } from '../../engine/formatters';
import { getMarginColorClass } from '../../engine/calculationEngine';

export function PricingMarginsPanel() {
  const slots = useQuoteStore((state) => state.slots);
  const getSlotPricing = useQuoteStore((state) => state.getSlotPricing);
  const getQuoteTotals = useQuoteStore((state) => state.getQuoteTotals);

  const activeSlots = slots.filter((s) => !s.isEmpty && s.modelCode !== '0');
  const totals = getQuoteTotals();

  if (activeSlots.length === 0) {
    return (
      <Panel accent="none">
        <CardHeader icon={DollarSign} title="Pricing & Margins" />
        <div className="text-center py-8 text-surface-400 text-sm">
          No units configured. Add units in Fleet Builder to see pricing.
        </div>
      </Panel>
    );
  }

  return (
    <Panel accent="none">
      <CardHeader icon={DollarSign} title="Pricing & Margins" />

      <div className="overflow-x-auto">
        <table className="table table-hover">
          <thead>
            <tr>
              <th className="text-left">Model</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Sales Price</th>
              <th className="text-right">Lease (pm)</th>
              <th className="text-right">Margin</th>
              <th className="text-right">Total (pm)</th>
            </tr>
          </thead>
          <tbody>
            {activeSlots.map((slot) => {
              const pricing = getSlotPricing(slot.slotIndex);
              if (!pricing) return null;

              return (
                <tr key={slot.slotIndex}>
                  <td className="text-surface-200 font-medium text-sm">
                    <span className="font-mono text-brand-400">{slot.modelCode}</span>
                    <span className="text-surface-500 mx-1.5">|</span>
                    <span>{slot.modelName}</span>
                    {slot.quantity > 1 && (
                      <span className="text-surface-500 text-xs ml-1">×{slot.quantity}</span>
                    )}
                  </td>
                  <td className="text-right text-sm">{slot.quantity}</td>
                  <td className="text-right text-sm font-mono">
                    {formatZAR(pricing.salesPrice * slot.quantity)}
                  </td>
                  <td className="text-right text-sm font-mono">
                    {formatZAR(pricing.leaseRate * slot.quantity)}
                  </td>
                  <td className={`text-right text-sm font-semibold ${getMarginColorClass(pricing.margin)}`}>
                    {formatPercentage(pricing.margin)}
                  </td>
                  <td className="text-right text-sm font-mono">
                    {formatZAR(pricing.totalMonthly * slot.quantity)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-brand-500/30">
              <td colSpan={2} className="text-surface-200 font-bold">
                TOTALS
              </td>
              <td className="text-right font-mono font-bold text-brand-400">
                {formatZAR(totals.totalSalesPrice)}
              </td>
              <td className="text-right font-mono font-bold text-brand-400">
                {formatZAR(totals.totalLeaseRate)}
              </td>
              <td className={`text-right font-bold ${getMarginColorClass(totals.averageMargin)}`}>
                {formatPercentage(totals.averageMargin)}
              </td>
              <td className="text-right font-mono font-bold text-brand-400">
                {formatZAR(totals.totalMonthly)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="glass-brand rounded-lg p-3">
          <div className="text-xs text-surface-400 mb-1">Contract Value</div>
          <div className="text-lg font-bold text-brand-400">
            {formatZAR(totals.totalContractValue, false)}
          </div>
        </div>
        <div className="glass-brand rounded-lg p-3">
          <div className="text-xs text-surface-400 mb-1">Units</div>
          <div className="text-lg font-bold text-brand-400">{totals.unitCount}</div>
        </div>
      </div>
    </Panel>
  );
}
