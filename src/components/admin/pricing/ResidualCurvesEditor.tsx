import { useState, useEffect } from 'react';
import { useResidualCurves, saveResidualCurves, getResidualCurveImpact } from '../../../hooks/usePricingConfig';
import { validateResidualCurve } from './validators';
import { useAuth } from '../../auth/AuthContext';
import type { StoredResidualCurve } from '../../../db/interfaces';
import { CheckCircle2, AlertCircle, Save, TrendingDown } from 'lucide-react';

const ResidualCurvesEditor = () => {
  const dbCurves = useResidualCurves();
  const { user } = useAuth();
  const [curves, setCurves] = useState<StoredResidualCurve[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [impacts, setImpacts] = useState<Record<string, number>>({});

  const terms = [36, 48, 60, 72, 84] as const;

  // Initialize curves from database
  useEffect(() => {
    if (dbCurves && dbCurves.length > 0) {
      setCurves(dbCurves);
      // Load impact data with proper cleanup to avoid state updates on unmounted component
      let cancelled = false;
      const loadImpacts = async () => {
        for (const curve of dbCurves) {
          if (cancelled) return;
          try {
            const count = await getResidualCurveImpact(curve.chemistry);
            if (!cancelled) {
              setImpacts((prev) => ({ ...prev, [curve.chemistry]: count }));
            }
          } catch (err) {
            console.error('Error loading impact for', curve.chemistry, err);
          }
        }
      };
      loadImpacts();
      return () => { cancelled = true; };
    }
  }, [dbCurves]);

  // Update curve field
  const updateCurve = (chemistry: string, term: number, value: number) => {
    const updated = curves.map((c) =>
      c.chemistry === chemistry ? { ...c, [`term${term}`]: value } : c
    );
    setCurves(updated);
    setSaved(false);
  };

  // Validate on change
  useEffect(() => {
    if (curves.length > 0) {
      const newErrors: Record<string, string[]> = {};
      curves.forEach((curve) => {
        const validationErrors = validateResidualCurve(curve);
        if (validationErrors.length > 0) {
          newErrors[curve.chemistry] = validationErrors.map((e) => e.message);
        }
      });
      setErrors(newErrors);
    }
  }, [curves]);

  // Save to database
  const handleSave = async (chemistry?: string) => {
    // Validate specific curve or all curves
    const curvesToValidate = chemistry ? curves.filter((c) => c.chemistry === chemistry) : curves;

    for (const curve of curvesToValidate) {
      const validationErrors = validateResidualCurve(curve);
      if (validationErrors.length > 0) {
        setErrors((prev) => ({ ...prev, [curve.chemistry]: validationErrors.map((e) => e.message) }));
        return;
      }
    }

    setSaving(true);
    try {
      await saveResidualCurves(curves, user?.id || 'unknown');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving residual curves:', error);
      setErrors({ general: ['Failed to save residual curves'] });
    } finally {
      setSaving(false);
    }
  };

  // Get curve by chemistry
  const getCurve = (chemistry: string): StoredResidualCurve | undefined => {
    return curves.find((c) => c.chemistry === chemistry);
  };

  if (!dbCurves) {
    return (
      <div className="bg-surface-700/50 backdrop-blur-xl border border-surface-600/50 rounded-2xl p-6">
        <div className="text-surface-100/60">Loading residual curves...</div>
      </div>
    );
  }

  const pbCurve = getCurve('lead-acid');
  const liCurve = getCurve('lithium-ion');

  return (
    <div className="bg-surface-700/50 backdrop-blur-xl border border-surface-600/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-surface-100">Residual Value Curves Configuration</h3>
          <p className="text-surface-100/60 text-sm mt-1">
            Define residual value percentages by battery chemistry and lease term
          </p>
        </div>
        <button
          onClick={() => handleSave()}
          disabled={saving || Object.keys(errors).length > 0}
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
              Save All Changes
            </>
          )}
        </button>
      </div>

      {/* General Errors */}
      {errors.general && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-red-400 font-semibold mb-2">Validation Errors</div>
              <ul className="text-red-300 text-sm space-y-1">
                {errors.general.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Lead-Acid Curve */}
        {pbCurve && (
          <div className="bg-surface-800/40 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-surface-100 font-semibold flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-orange-400" />
                  Lead-Acid (PB) Batteries
                </h4>
                <p className="text-surface-100/60 text-sm mt-1">
                  Impact: {impacts['lead-acid'] !== undefined ? impacts['lead-acid'] : '-'} active quotes
                </p>
              </div>
            </div>

            {/* Validation Errors for PB */}
            {errors['lead-acid'] && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <ul className="text-red-300 text-sm space-y-1">
                  {errors['lead-acid'].map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Term Inputs */}
            <div className="space-y-3 mb-4">
              {terms.map((term) => (
                <div key={term} className="flex items-center gap-4">
                  <label className="w-20 text-surface-100/80 text-sm">{term} months</label>
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="number"
                      value={(pbCurve as any)[`term${term}`]}
                      onChange={(e) => updateCurve('lead-acid', term, Number(e.target.value))}
                      min="0"
                      max="100"
                      step="0.1"
                      className="flex-1 bg-surface-800/40 border border-surface-700/50 rounded-lg px-3 py-2 text-surface-100 focus:outline-none focus:border-brand-500"
                    />
                    <span className="text-surface-100/60 text-sm w-8">%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview Chart (Simple Bar Visualization) */}
            <div className="bg-surface-800/40 rounded-lg p-4">
              <div className="text-surface-100/60 text-xs mb-2">Residual Value Trend</div>
              <div className="flex items-end justify-between gap-1 h-24">
                {terms.map((term) => {
                  const value = (pbCurve as any)[`term${term}`];
                  return (
                    <div key={term} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t transition-all duration-300"
                        style={{ height: `${value}%` }}
                      />
                      <div className="text-surface-100/60 text-xs">{term}m</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Example */}
            <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="text-blue-400 text-xs">
                <strong>Example:</strong> A lead-acid forklift with 60-month lease retains{' '}
                <strong>{pbCurve.term60}%</strong> of its value at end of term.
              </div>
            </div>
          </div>
        )}

        {/* Lithium-Ion Curve */}
        {liCurve && (
          <div className="bg-surface-800/40 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-surface-100 font-semibold flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-green-400" />
                  Lithium-Ion (Li-ion) Batteries
                </h4>
                <p className="text-surface-100/60 text-sm mt-1">
                  Impact: {impacts['lithium-ion'] !== undefined ? impacts['lithium-ion'] : '-'} active quotes
                </p>
              </div>
            </div>

            {/* Validation Errors for Li-ion */}
            {errors['lithium-ion'] && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <ul className="text-red-300 text-sm space-y-1">
                  {errors['lithium-ion'].map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Term Inputs */}
            <div className="space-y-3 mb-4">
              {terms.map((term) => (
                <div key={term} className="flex items-center gap-4">
                  <label className="w-20 text-surface-100/80 text-sm">{term} months</label>
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="number"
                      value={(liCurve as any)[`term${term}`]}
                      onChange={(e) => updateCurve('lithium-ion', term, Number(e.target.value))}
                      min="0"
                      max="100"
                      step="0.1"
                      className="flex-1 bg-surface-800/40 border border-surface-700/50 rounded-lg px-3 py-2 text-surface-100 focus:outline-none focus:border-brand-500"
                    />
                    <span className="text-surface-100/60 text-sm w-8">%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview Chart (Simple Bar Visualization) */}
            <div className="bg-surface-800/40 rounded-lg p-4">
              <div className="text-surface-100/60 text-xs mb-2">Residual Value Trend</div>
              <div className="flex items-end justify-between gap-1 h-24">
                {terms.map((term) => {
                  const value = (liCurve as any)[`term${term}`];
                  return (
                    <div key={term} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all duration-300"
                        style={{ height: `${value}%` }}
                      />
                      <div className="text-surface-100/60 text-xs">{term}m</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Example */}
            <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="text-blue-400 text-xs">
                <strong>Example:</strong> A lithium-ion forklift with 60-month lease retains{' '}
                <strong>{liCurve.term60}%</strong> of its value at end of term.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <div className="text-yellow-400 text-sm">
          <strong>Important:</strong> Residual values should decrease as lease term increases.
          Changes will affect lease rate calculations for new quotes immediately.
        </div>
      </div>
    </div>
  );
};

export default ResidualCurvesEditor;
