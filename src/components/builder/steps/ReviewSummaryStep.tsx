import { useEffect, useMemo } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useQuoteStore } from '../../../store/useQuoteStore';
import { validateQuoteSync } from '../../../engine/validators';
import { formatZAR, formatPercentage } from '../../../engine/formatters';
import { useBuilder } from '../BuilderContext';
import { StepHeader } from '../shared/StepHeader';
import { SummarySection } from '../shared/SummarySection';


export function ReviewSummaryStep() {
  const quote = useQuoteStore((s) => s);
  const getQuoteTotals = useQuoteStore((s) => s.getQuoteTotals);
  const getSlotPricing = useQuoteStore((s) => s.getSlotPricing);
  const getActiveSlots = useQuoteStore((s) => s.getActiveSlots);
  const { setCanProceed, goToStep } = useBuilder();

  const totals = getQuoteTotals();
  const activeSlots = getActiveSlots();

  const validationErrors = useMemo(() => {
    return validateQuoteSync(quote, totals.irr, totals.totalContractValue);
  }, [quote, totals]);

  const hasBlockingErrors = validationErrors.some((e) => e.severity === 'error');

  useEffect(() => {
    setCanProceed(!hasBlockingErrors);
  }, [hasBlockingErrors, setCanProceed]);

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-6">
        <StepHeader
          step={6}
          title="Review & Summary"
          subtitle="Review your complete quote before exporting."
        />
      </div>

      {/* Validation warnings/errors */}
      {validationErrors.length > 0 && (
        <div className="space-y-2">
          {validationErrors.map((err, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                err.severity === 'error'
                  ? 'bg-danger/10 border border-danger/30 text-red-300'
                  : 'bg-warning/10 border border-warning/30 text-yellow-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{err.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Client Info */}
      <SummarySection title="Client Information" onEdit={() => goToStep(0)}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-surface-500">Client:</span>
            <div className="text-surface-200 font-medium">{quote.clientName || '—'}</div>
          </div>
          <div>
            <span className="text-surface-500">Contact:</span>
            <div className="text-surface-200">{quote.contactName || '—'}</div>
          </div>
          <div>
            <span className="text-surface-500">Email:</span>
            <div className="text-surface-200">{quote.contactEmail || '—'}</div>
          </div>
          <div>
            <span className="text-surface-500">Phone:</span>
            <div className="text-surface-200">{quote.contactPhone || '—'}</div>
          </div>
        </div>
      </SummarySection>

      {/* Quote Settings */}
      <SummarySection title="Quote Settings" onEdit={() => goToStep(1)}>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-surface-500">Factory ROE:</span>
            <div className="text-surface-200 font-mono">{quote.factoryROE.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-surface-500">Customer ROE:</span>
            <div className="text-surface-200 font-mono">{quote.customerROE.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-surface-500">Interest Rate:</span>
            <div className="text-surface-200">{quote.annualInterestRate}%</div>
          </div>
          <div>
            <span className="text-surface-500">Default Term:</span>
            <div className="text-surface-200">{quote.defaultLeaseTermMonths} months</div>
          </div>
          <div>
            <span className="text-surface-500">Quote Type:</span>
            <div className="text-surface-200 capitalize">{quote.quoteType}</div>
          </div>
          <div>
            <span className="text-surface-500">Discount:</span>
            <div className="text-surface-200">{quote.discountPct}%</div>
          </div>
        </div>
      </SummarySection>

      {/* Units */}
      {activeSlots.map((slot) => {
        const pricing = getSlotPricing(slot.slotIndex);
        return (
          <SummarySection
            key={slot.slotIndex}
            title={`Unit ${slot.slotIndex + 1}: ${slot.modelName}`}
            onEdit={() => goToStep(2)}
          >
            {pricing && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-surface-500">Quantity:</span>
                  <div className="text-surface-200">{slot.quantity}</div>
                </div>
                <div>
                  <span className="text-surface-500">Factory Cost:</span>
                  <div className="text-surface-200 font-mono">{formatZAR(pricing.factoryCostZAR, false)}</div>
                </div>
                <div>
                  <span className="text-surface-500">Landed Cost:</span>
                  <div className="text-surface-200 font-mono">{formatZAR(pricing.landedCostZAR, false)}</div>
                </div>
                <div>
                  <span className="text-surface-500">Selling Price:</span>
                  <div className="text-brand-400 font-mono font-semibold">{formatZAR(pricing.sellingPriceZAR, false)}</div>
                </div>
                <div>
                  <span className="text-surface-500">Margin:</span>
                  <div className={`font-semibold ${pricing.margin >= 25 ? 'text-green-400' : pricing.margin >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {formatPercentage(pricing.margin)}
                  </div>
                </div>
                <div>
                  <span className="text-surface-500">Lease Rate:</span>
                  <div className="text-surface-200 font-mono">{formatZAR(pricing.leaseRate, false)}/mo</div>
                </div>
                <div>
                  <span className="text-surface-500">Total Monthly:</span>
                  <div className="text-brand-400 font-mono font-semibold">{formatZAR(pricing.totalMonthly, false)}/mo</div>
                </div>
                <div>
                  <span className="text-surface-500">Contract Value:</span>
                  <div className="text-surface-200 font-mono">{formatZAR(pricing.totalContractValue, false)}</div>
                </div>
              </div>
            )}
          </SummarySection>
        );
      })}

      {/* Financial Summary */}
      <SummarySection title="Financial Analysis">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-surface-500">Total Selling:</span>
            <div className="text-surface-100 font-mono font-semibold text-lg">{formatZAR(totals.totalSalesPrice, false)}</div>
          </div>
          <div>
            <span className="text-surface-500">Total Monthly:</span>
            <div className="text-brand-400 font-mono font-semibold text-lg">{formatZAR(totals.totalMonthly, false)}</div>
          </div>
          <div>
            <span className="text-surface-500">Contract Value:</span>
            <div className="text-surface-100 font-mono font-semibold text-lg">{formatZAR(totals.totalContractValue, false)}</div>
          </div>
          <div>
            <span className="text-surface-500">Avg Margin:</span>
            <div className={`font-semibold text-lg ${totals.averageMargin >= 25 ? 'text-green-400' : totals.averageMargin >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
              {formatPercentage(totals.averageMargin)}
            </div>
          </div>
          <div>
            <span className="text-surface-500">IRR:</span>
            <div className="text-surface-200 font-mono">
              {totals.irr !== null ? `${(totals.irr * 100).toFixed(2)}%` : 'N/A'}
            </div>
          </div>
          <div>
            <span className="text-surface-500">NPV:</span>
            <div className="text-surface-200 font-mono">{formatZAR(totals.npv, false)}</div>
          </div>
          <div>
            <span className="text-surface-500">Commission:</span>
            <div className="text-surface-200 font-mono">{formatZAR(totals.commission, false)}</div>
          </div>
          <div>
            <span className="text-surface-500">Units:</span>
            <div className="text-surface-200">{totals.unitCount}</div>
          </div>
        </div>
      </SummarySection>

      {/* All clear */}
      {!hasBlockingErrors && activeSlots.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Quote looks good! Proceed to export.</span>
        </div>
      )}
    </div>
  );
}
