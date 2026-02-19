import { useState, useEffect } from 'react';
import { useCommissionTiers, saveCommissionTiers } from '../../../hooks/usePricingConfig';
import { validateCommissionTiers } from './validators';
import { useAuth } from '../../auth/AuthContext';
import type { StoredCommissionTier } from '../../../db/interfaces';
import { CheckCircle2, AlertCircle, Save, Plus, Trash2, RotateCcw } from 'lucide-react';

const CommissionTiersEditor = () => {
  const dbTiers = useCommissionTiers();
  const { user } = useAuth();
  const [tiers, setTiers] = useState<StoredCommissionTier[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Initialize tiers from database
  useEffect(() => {
    if (dbTiers && dbTiers.length > 0) {
      setTiers(dbTiers);
    }
  }, [dbTiers]);

  // Update tier field
  const updateTier = (index: number, field: keyof StoredCommissionTier, value: number) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
    setSaved(false);
  };

  // Add new tier
  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newTier: StoredCommissionTier = {
      minMargin: lastTier ? lastTier.maxMargin : 0,
      maxMargin: lastTier ? lastTier.maxMargin + 10 : 10,
      commissionRate: 2,
    };
    setTiers([...tiers, newTier]);
    setSaved(false);
  };

  // Remove tier
  const removeTier = (index: number) => {
    if (tiers.length <= 1) {
      setErrors(['At least one commission tier is required']);
      return;
    }
    const updated = tiers.filter((_, i) => i !== index);
    setTiers(updated);
    setSaved(false);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    if (confirm('Reset commission tiers to default values? This cannot be undone.')) {
      const defaults: StoredCommissionTier[] = [
        { minMargin: 0, maxMargin: 15, commissionRate: 2 },
        { minMargin: 15, maxMargin: 25, commissionRate: 4 },
        { minMargin: 25, maxMargin: 35, commissionRate: 6 },
        { minMargin: 35, maxMargin: 100, commissionRate: 8 },
      ];
      setTiers(defaults);
      setSaved(false);
    }
  };

  // Validate on change
  useEffect(() => {
    if (tiers.length > 0) {
      const validationErrors = validateCommissionTiers(tiers);
      setErrors(validationErrors.map((e) => e.message));
    }
  }, [tiers]);

  // Save to database
  const handleSave = async () => {
    const validationErrors = validateCommissionTiers(tiers);
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) => e.message));
      return;
    }

    setSaving(true);
    try {
      await saveCommissionTiers(tiers, user?.id || 'unknown');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving commission tiers:', error);
      setErrors(['Failed to save commission tiers']);
    } finally {
      setSaving(false);
    }
  };

  // Calculate example commission
  const exampleMargin = 25;
  const exampleTier = tiers.find((t) => exampleMargin >= t.minMargin && exampleMargin < t.maxMargin);
  const exampleCommission = exampleTier ? exampleTier.commissionRate : 0;

  if (!dbTiers) {
    return (
      <div className="bg-surface-700/50 backdrop-blur-xl border border-surface-600/50 rounded-2xl p-6">
        <div className="text-surface-100/60">Loading commission tiers...</div>
      </div>
    );
  }

  return (
    <div className="bg-surface-700/50 backdrop-blur-xl border border-surface-600/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-surface-100">Commission Tiers Configuration</h3>
          <p className="text-surface-100/60 text-sm mt-1">
            Define commission rates based on margin percentage
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetToDefaults}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
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

      {/* Commission Tiers Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-700/50">
              <th className="text-left text-surface-100/80 font-semibold py-3 px-4">Min Margin %</th>
              <th className="text-left text-surface-100/80 font-semibold py-3 px-4">Max Margin %</th>
              <th className="text-left text-surface-100/80 font-semibold py-3 px-4">Commission Rate %</th>
              <th className="text-right text-surface-100/80 font-semibold py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier, idx) => (
              <tr key={idx} className="border-b border-white/5 hover:bg-surface-800/40 transition-colors">
                <td className="py-3 px-4">
                  <input
                    type="number"
                    value={tier.minMargin}
                    onChange={(e) => updateTier(idx, 'minMargin', Number(e.target.value))}
                    step="0.1"
                    className="w-24 bg-surface-800/40 border border-surface-700/50 rounded-lg px-3 py-2 text-surface-100 focus:outline-none focus:border-brand-500"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    value={tier.maxMargin}
                    onChange={(e) => updateTier(idx, 'maxMargin', Number(e.target.value))}
                    step="0.1"
                    className="w-24 bg-surface-800/40 border border-surface-700/50 rounded-lg px-3 py-2 text-surface-100 focus:outline-none focus:border-brand-500"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    value={tier.commissionRate}
                    onChange={(e) => updateTier(idx, 'commissionRate', Number(e.target.value))}
                    step="0.1"
                    className="w-24 bg-surface-800/40 border border-surface-700/50 rounded-lg px-3 py-2 text-surface-100 focus:outline-none focus:border-brand-500"
                  />
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => removeTier(idx)}
                    className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                    title="Remove tier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Tier Button */}
      <button
        onClick={addTier}
        className="btn btn-secondary flex items-center gap-2 mb-6"
      >
        <Plus className="w-4 h-4" />
        Add Tier
      </button>

      {/* Visual Commission Curve */}
      <div className="mb-6 bg-surface-800/40 rounded-xl p-6">
        <h4 className="text-surface-100 font-semibold mb-4">Commission Curve Visualization</h4>
        <div className="space-y-2">
          {tiers.map((tier, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="w-32 text-sm text-surface-100/60">
                {tier.minMargin}% - {tier.maxMargin}%
              </div>
              <div className="flex-1 bg-surface-800/40 rounded-full h-8 relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-teal-600 flex items-center justify-end px-4 transition-all duration-300"
                  style={{ width: `${tier.commissionRate * 10}%` }}
                >
                  <span className="text-surface-100 font-medium text-sm">
                    {tier.commissionRate}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Example Preview */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="text-blue-400 text-sm">
          <strong>Example:</strong> A deal with {exampleMargin}% margin earns{' '}
          <strong>{exampleCommission}%</strong> commission on the total sales value.
        </div>
      </div>
    </div>
  );
};

export default CommissionTiersEditor;
