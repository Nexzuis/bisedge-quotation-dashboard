import { useEffect, useCallback } from 'react';
import { Info, AlertTriangle } from 'lucide-react';
import { useQuoteStore } from '../../../store/useQuoteStore';
import { getConfigDefaults } from '../../../store/useConfigStore';
import { useBuilder } from '../BuilderContext';
import { StepHeader } from '../shared/StepHeader';
import { Input } from '../../ui/Input';
import { Tooltip } from '../../ui/Tooltip';
import type { LeaseTermMonths, QuoteType } from '../../../types/quote';

const LEASE_TERMS: LeaseTermMonths[] = [36, 48, 60, 72, 84];
const QUOTE_TYPES: { value: QuoteType; label: string; description: string }[] = [
  { value: 'rental', label: 'Rental', description: 'Monthly rental payments' },
  { value: 'rent-to-own', label: 'Rent-to-Own', description: 'Ownership transfers at end of term' },
  { value: 'dual', label: 'Dual', description: 'Both rental and rent-to-own options' },
];

export function QuoteSettingsStep() {
  const factoryROE = useQuoteStore((s) => s.factoryROE);
  const customerROE = useQuoteStore((s) => s.customerROE);
  const discountPct = useQuoteStore((s) => s.discountPct);
  const annualInterestRate = useQuoteStore((s) => s.annualInterestRate);
  const defaultLeaseTermMonths = useQuoteStore((s) => s.defaultLeaseTermMonths);
  const quoteType = useQuoteStore((s) => s.quoteType);

  const setFactoryROE = useQuoteStore((s) => s.setFactoryROE);
  const setCustomerROE = useQuoteStore((s) => s.setCustomerROE);
  const setDiscount = useQuoteStore((s) => s.setDiscount);
  const setInterestRate = useQuoteStore((s) => s.setInterestRate);
  const setDefaultLeaseTermMonths = useQuoteStore((s) => s.setDefaultLeaseTermMonths);
  const setQuoteType = useQuoteStore((s) => s.setQuoteType);

  const { setCanProceed } = useBuilder();

  const roeWarning = customerROE > 0 && factoryROE > 0 && customerROE < factoryROE;

  const defaults = getConfigDefaults();

  const confirmChange = useCallback((fieldName: string, newValue: number, defaultValue: number, applyFn: (v: number) => void) => {
    if (newValue !== defaultValue) {
      const confirmed = window.confirm(
        `Are you sure you want to change ${fieldName} from the default (${defaultValue}) to ${newValue}?`
      );
      if (!confirmed) return;
    }
    applyFn(newValue);
  }, []);

  // Always allow proceed from settings (values have defaults)
  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  return (
    <div className="glass rounded-xl p-6">
      <StepHeader
        step={1}
        title="Quote Settings"
        subtitle="Configure exchange rates, discount, interest rate, and default terms."
      />

      <div className="space-y-6">
        {/* ROE Section */}
        <div>
          <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
            Exchange Rates
            <Tooltip content="Factory ROE is used to convert EUR costs to ZAR. Customer ROE can be different to build in margin.">
              <Info className="w-3.5 h-3.5 text-surface-500 cursor-help" />
            </Tooltip>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`Factory ROE (EUR → ZAR) [default: ${defaults.factoryROE}]`}
              type="number"
              step="0.01"
              min="0"
              value={factoryROE || ''}
              onChange={(e) => setFactoryROE(Math.max(0, parseFloat(e.target.value) || 0))}
              onBlur={() => {
                if (factoryROE !== defaults.factoryROE) {
                  confirmChange('Factory ROE', factoryROE, defaults.factoryROE, setFactoryROE);
                }
              }}
            />
            <Input
              label={`Customer ROE (EUR → ZAR) [default: ${defaults.customerROE}]`}
              type="number"
              step="0.01"
              min="0"
              value={customerROE || ''}
              onChange={(e) => setCustomerROE(Math.max(0, parseFloat(e.target.value) || 0))}
              onBlur={() => {
                if (customerROE !== defaults.customerROE) {
                  confirmChange('Customer ROE', customerROE, defaults.customerROE, setCustomerROE);
                }
              }}
              error={roeWarning ? 'Customer ROE should not be lower than Factory ROE' : undefined}
            />
          </div>
          {roeWarning && (
            <div className="flex items-center gap-2 mt-2 text-sm text-warning bg-warning/10 rounded-lg p-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Customer ROE ({customerROE}) is below Factory ROE ({factoryROE}). This will reduce margins.</span>
            </div>
          )}
        </div>

        {/* Discount & Interest */}
        <div>
          <h3 className="text-sm font-semibold text-surface-300 mb-3">Pricing Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`Discount % [default: ${defaults.discountPct}%]`}
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={discountPct || ''}
              onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              onBlur={() => {
                if (discountPct !== defaults.discountPct) {
                  confirmChange('Discount %', discountPct, defaults.discountPct, setDiscount);
                }
              }}
            />
            <Input
              label={`Annual Interest Rate % [default: ${defaults.interestRate}%]`}
              type="number"
              step="0.25"
              min="0"
              max="100"
              value={annualInterestRate || ''}
              onChange={(e) => setInterestRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              onBlur={() => {
                if (annualInterestRate !== defaults.interestRate) {
                  confirmChange('Interest Rate', annualInterestRate, defaults.interestRate, setInterestRate);
                }
              }}
            />
          </div>
        </div>

        {/* Lease Term */}
        <div>
          <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
            Default Lease Term
            <Tooltip content="Default term applied to new units. Can be overridden per unit in the Commercial step.">
              <Info className="w-3.5 h-3.5 text-surface-500 cursor-help" />
            </Tooltip>
          </h3>
          <div className="flex gap-2">
            {LEASE_TERMS.map((term) => (
              <button
                key={term}
                onClick={() => setDefaultLeaseTermMonths(term)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  defaultLeaseTermMonths === term
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                    : 'bg-surface-800 text-surface-300 hover:bg-surface-700 border border-surface-600'
                }`}
              >
                {term} mo
              </button>
            ))}
          </div>
        </div>

        {/* Quote Type */}
        <div>
          <h3 className="text-sm font-semibold text-surface-300 mb-3">Quote Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {QUOTE_TYPES.map(({ value, label, description }) => (
              <button
                key={value}
                onClick={() => setQuoteType(value)}
                className={`text-left p-4 rounded-lg border transition-all ${
                  quoteType === value
                    ? 'bg-brand-500/10 border-brand-500/50 shadow-lg shadow-brand-500/5'
                    : 'bg-surface-800/50 border-surface-600 hover:border-surface-500'
                }`}
              >
                <div className={`text-sm font-semibold ${quoteType === value ? 'text-brand-400' : 'text-surface-200'}`}>
                  {label}
                </div>
                <div className="text-xs text-surface-400 mt-0.5">{description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
