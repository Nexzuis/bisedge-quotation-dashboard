import { useState, useEffect } from 'react';
import { useDefaultValues, saveDefaultValues } from '../../../hooks/usePricingConfig';
import { validateDefaultValues } from './validators';
import { useAuth } from '../../auth/AuthContext';
import { getConfigDefaults } from '../../../store/useConfigStore';
import { CheckCircle2, AlertCircle, Save, Settings } from 'lucide-react';

const DefaultValuesEditor = () => {
  const dbValues = useDefaultValues();
  const { user } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Initialize values from database, falling back to config store defaults
  useEffect(() => {
    if (dbValues) {
      const cfg = getConfigDefaults();
      setValues({
        defaultROE: dbValues.defaultROE || String(cfg.customerROE),
        defaultInterestRate: dbValues.defaultInterestRate || String(cfg.interestRate),
        defaultCPIRate: dbValues.defaultCPIRate || String(cfg.cpiRate),
        defaultOperatingHours: dbValues.defaultOperatingHours || String(cfg.operatingHours),
        defaultLeaseTerm: dbValues.defaultLeaseTerm || String(cfg.leaseTerm),
        defaultTelematicsCost: dbValues.defaultTelematicsCost || String(cfg.telematicsCost),
      });
    }
  }, [dbValues]);

  // Update value
  const updateValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  // Validate on change
  useEffect(() => {
    if (Object.keys(values).length > 0) {
      const validationErrors = validateDefaultValues(values);
      setErrors(validationErrors.map((e) => e.message));
    }
  }, [values]);

  // Save to database
  const handleSave = async () => {
    const validationErrors = validateDefaultValues(values);
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) => e.message));
      return;
    }

    setSaving(true);
    try {
      await saveDefaultValues(values, user?.id || 'unknown');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving default values:', error);
      setErrors(['Failed to save default values']);
    } finally {
      setSaving(false);
    }
  };

  if (!dbValues) {
    return (
      <div className="bg-surface-700/50 backdrop-blur-xl border border-surface-600/50 rounded-2xl p-6">
        <div className="text-surface-100/60">Loading default values...</div>
      </div>
    );
  }

  return (
    <div className="bg-surface-700/50 backdrop-blur-xl border border-surface-600/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-surface-100 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Default Values Configuration
          </h3>
          <p className="text-surface-100/60 text-sm mt-1">
            Set default values used for new quotes
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || errors.length > 0}
          className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-red-400 font-semibold mb-2">Validation Errors</div>
              <ul className="text-red-300 text-sm space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Default ROE */}
        <div className="bg-surface-800/40 rounded-xl p-6">
          <label className="block text-surface-100 font-semibold mb-2">
            Default Customer ROE (Rate of Exchange)
          </label>
          <p className="text-surface-100/60 text-sm mb-3">
            EUR to ZAR exchange rate for customer pricing
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={values.defaultROE || ''}
              onChange={(e) => updateValue('defaultROE', e.target.value)}
              step="0.01"
              className="flex-1 bg-surface-800/40 border border-surface-700/50 rounded-lg px-4 py-3 text-surface-100 text-lg focus:outline-none focus:border-brand-500"
            />
            <span className="text-surface-100/60">ZAR/EUR</span>
          </div>
        </div>

        {/* Default Interest Rate */}
        <div className="bg-surface-800/40 rounded-xl p-6">
          <label className="block text-surface-100 font-semibold mb-2">
            Default Interest Rate
          </label>
          <p className="text-surface-100/60 text-sm mb-3">
            Annual interest rate for lease calculations
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={values.defaultInterestRate || ''}
              onChange={(e) => updateValue('defaultInterestRate', e.target.value)}
              step="0.1"
              className="flex-1 bg-surface-800/40 border border-surface-700/50 rounded-lg px-4 py-3 text-surface-100 text-lg focus:outline-none focus:border-brand-500"
            />
            <span className="text-surface-100/60">%</span>
          </div>
        </div>

        {/* Default CPI Rate */}
        <div className="bg-surface-800/40 rounded-xl p-6">
          <label className="block text-surface-100 font-semibold mb-2">
            Default CPI Rate
          </label>
          <p className="text-surface-100/60 text-sm mb-3">
            Consumer Price Index for cost escalations
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={values.defaultCPIRate || ''}
              onChange={(e) => updateValue('defaultCPIRate', e.target.value)}
              step="0.1"
              className="flex-1 bg-surface-800/40 border border-surface-700/50 rounded-lg px-4 py-3 text-surface-100 text-lg focus:outline-none focus:border-brand-500"
            />
            <span className="text-surface-100/60">%</span>
          </div>
        </div>

        {/* Default Operating Hours */}
        <div className="bg-surface-800/40 rounded-xl p-6">
          <label className="block text-surface-100 font-semibold mb-2">
            Default Operating Hours/Month
          </label>
          <p className="text-surface-100/60 text-sm mb-3">
            Expected monthly operating hours per unit
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={values.defaultOperatingHours || ''}
              onChange={(e) => updateValue('defaultOperatingHours', e.target.value)}
              step="1"
              className="flex-1 bg-surface-800/40 border border-surface-700/50 rounded-lg px-4 py-3 text-surface-100 text-lg focus:outline-none focus:border-brand-500"
            />
            <span className="text-surface-100/60">hours</span>
          </div>
        </div>

        {/* Default Lease Term */}
        <div className="bg-surface-800/40 rounded-xl p-6">
          <label className="block text-surface-100 font-semibold mb-2">
            Default Lease Term
          </label>
          <p className="text-surface-100/60 text-sm mb-3">
            Standard lease duration for new quotes
          </p>
          <select
            value={values.defaultLeaseTerm || '60'}
            onChange={(e) => updateValue('defaultLeaseTerm', e.target.value)}
            className="w-full bg-surface-800/40 border border-surface-700/50 rounded-lg px-4 py-3 text-surface-100 text-lg focus:outline-none focus:border-brand-500"
          >
            <option value="36">36 months (3 years)</option>
            <option value="48">48 months (4 years)</option>
            <option value="60">60 months (5 years)</option>
            <option value="72">72 months (6 years)</option>
            <option value="84">84 months (7 years)</option>
          </select>
        </div>

        {/* Default Telematics Cost */}
        <div className="bg-surface-800/40 rounded-xl p-6">
          <label className="block text-surface-100 font-semibold mb-2">
            Default Telematics Cost
          </label>
          <p className="text-surface-100/60 text-sm mb-3">
            Monthly telematics and tracking cost per unit
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={values.defaultTelematicsCost || ''}
              onChange={(e) => updateValue('defaultTelematicsCost', e.target.value)}
              step="10"
              className="flex-1 bg-surface-800/40 border border-surface-700/50 rounded-lg px-4 py-3 text-surface-100 text-lg focus:outline-none focus:border-brand-500"
            />
            <span className="text-surface-100/60">ZAR/mo</span>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="text-blue-400 text-sm">
          <strong>Note:</strong> These defaults are used as initial values when creating new quotes.
          Users can override these values on a per-quote basis. Changes take effect immediately for new quotes.
        </div>
      </div>
    </div>
  );
};

export default DefaultValuesEditor;
