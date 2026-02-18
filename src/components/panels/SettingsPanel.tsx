import { useCallback } from 'react';
import { Settings, DollarSign, Calendar } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { CardHeader } from '../ui/Card';
import { useQuoteStore } from '../../store/useQuoteStore';
import { getConfigDefaults } from '../../store/useConfigStore';
import type { LeaseTermMonths } from '../../types/quote';

export function SettingsPanel() {
  const factoryROE = useQuoteStore((state) => state.factoryROE);
  const customerROE = useQuoteStore((state) => state.customerROE);
  const discountPct = useQuoteStore((state) => state.discountPct);
  const annualInterestRate = useQuoteStore((state) => state.annualInterestRate);
  const defaultLeaseTermMonths = useQuoteStore((state) => state.defaultLeaseTermMonths);

  const setFactoryROE = useQuoteStore((state) => state.setFactoryROE);
  const setCustomerROE = useQuoteStore((state) => state.setCustomerROE);
  const setDiscount = useQuoteStore((state) => state.setDiscount);
  const setInterestRate = useQuoteStore((state) => state.setInterestRate);
  const setDefaultLeaseTermMonths = useQuoteStore((state) => state.setDefaultLeaseTermMonths);

  const defaults = getConfigDefaults();

  const confirmChange = useCallback((fieldName: string, newValue: number, defaultValue: number, applyFn: (v: number) => void) => {
    if (newValue !== defaultValue) {
      const confirmed = window.confirm(
        `Are you sure you want to change ${fieldName} from the default (${defaultValue}) to ${newValue}?`
      );
      if (!confirmed) {
        applyFn(defaultValue);
        return;
      }
    }
    applyFn(newValue);
  }, []);

  return (
    <Panel accent="none">
      <CardHeader icon={Settings} title="Quote Settings" />

      <div className="space-y-4">
        {/* Dual ROE Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Exchange Rates (EUR → ZAR)
          </h3>

          <div>
            <label className="block text-sm text-surface-400 mb-1">Factory ROE [default: {defaults.factoryROE}]</label>
            <input
              type="number"
              step="0.01"
              value={factoryROE}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0) {
                  setFactoryROE(val);
                }
              }}
              onBlur={() => {
                if (factoryROE !== defaults.factoryROE) {
                  confirmChange('Factory ROE', factoryROE, defaults.factoryROE, setFactoryROE);
                }
              }}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-surface-400 mb-1">Customer ROE [default: {defaults.customerROE}]</label>
            <input
              type="number"
              step="0.01"
              value={customerROE}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0) {
                  setCustomerROE(val);
                }
              }}
              onBlur={() => {
                if (customerROE !== defaults.customerROE) {
                  confirmChange('Customer ROE', customerROE, defaults.customerROE, setCustomerROE);
                }
              }}
              className="input w-full"
            />
          </div>

          {customerROE < factoryROE && (
            <div className="text-xs text-warning bg-warning/10 border border-warning/30 rounded px-2 py-1">
              Warning: Customer ROE is lower than factory ROE
            </div>
          )}
        </div>

        {/* Pricing Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-surface-200">Pricing</h3>

          <div>
            <label className="block text-sm text-surface-400 mb-1">Discount % [default: {defaults.discountPct}%]</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={discountPct}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              onBlur={() => {
                if (discountPct !== defaults.discountPct) {
                  confirmChange('Discount %', discountPct, defaults.discountPct, setDiscount);
                }
              }}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-surface-400 mb-1">Annual Interest Rate % [default: {defaults.interestRate}%]</label>
            <input
              type="number"
              step="0.1"
              value={annualInterestRate}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 0) {
                  setInterestRate(val);
                }
              }}
              onBlur={() => {
                if (annualInterestRate !== defaults.interestRate) {
                  confirmChange('Interest Rate', annualInterestRate, defaults.interestRate, setInterestRate);
                }
              }}
              className="input w-full"
            />
          </div>
        </div>

        {/* Lease Terms */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Lease Terms
          </h3>

          <div>
            <label className="block text-sm text-surface-400 mb-1">Default Lease Term</label>
            <select
              value={defaultLeaseTermMonths}
              onChange={(e) =>
                setDefaultLeaseTermMonths(parseInt(e.target.value) as LeaseTermMonths)
              }
              className="input w-full"
            >
              <option value="36">36 months (3 years)</option>
              <option value="48">48 months (4 years)</option>
              <option value="60">60 months (5 years)</option>
              <option value="72">72 months (6 years)</option>
              <option value="84">84 months (7 years)</option>
            </select>
          </div>
        </div>
      </div>
    </Panel>
  );
}
