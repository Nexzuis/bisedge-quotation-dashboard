import { useState, useMemo } from 'react';
import { Package, Truck, ChevronDown, ChevronUp, AlertTriangle, Info, DollarSign, Zap, RefreshCw } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { CardHeader } from '../ui/Card';
import { useQuoteStore } from '../../store/useQuoteStore';
import { useIsReadOnly } from '../../hooks/ReadOnlyContext';
import type { ShippingEntry, UnitSlot, ContainerMapping } from '../../types/quote';
import { useContainerMappings } from '../../hooks/usePriceList';
import { formatZAR, formatEUR } from '../../engine/formatters';
import {
  generateShippingSuggestion,
  collectMappingNotes,
  computeSuggestionSignature,
  signaturesMatch,
  type SuggestionSignature,
} from '../../engine/shippingSuggestion';

/** Global logistics warnings — universal truths, not series-specific */
const LOGISTICS_WARNINGS = [
  'Quantities based on standard spec',
  'Attachments ordered with units will reduce container quantity',
  'Dismantled masts reduce container quantity',
  'For special specs truck builds, check with Jozua',
];

export function LogisticsPanel() {
  const slots = useQuoteStore((state) => state.slots);
  const shippingEntries = useQuoteStore((state) => state.shippingEntries);
  const addShippingEntry = useQuoteStore((state) => state.addShippingEntry);
  const updateShippingEntry = useQuoteStore((state) => state.updateShippingEntry);
  const removeShippingEntry = useQuoteStore((state) => state.removeShippingEntry);
  const setShippingEntries = useQuoteStore((state) => state.setShippingEntries);
  const factoryROE = useQuoteStore((state) => state.factoryROE);
  const activeSlots = slots.filter((s) => !s.isEmpty && s.modelCode !== '0');
  const { isReadOnly } = useIsReadOnly();

  const [showReference, setShowReference] = useState(true);
  const [showWarnings, setShowWarnings] = useState(false);
  const [suggestionSignature, setSuggestionSignature] = useState<SuggestionSignature | null>(null);
  const [confirmAction, setConfirmAction] = useState<'suggest' | 'recalculate' | null>(null);

  // Gather unique series codes
  const uniqueSeriesCodes = useMemo(
    () => [...new Set(activeSlots.map((s) => s.seriesCode).filter(Boolean))],
    [activeSlots]
  );

  // Fetch container mappings for all series in the fleet (single query)
  const allMappings = useContainerMappings(uniqueSeriesCodes);
  const resolvedMappings = useMemo(
    () => allMappings.filter((m): m is ContainerMapping => m !== null),
    [allMappings]
  );

  // Current suggestion signature (for stale detection)
  const currentSignature = useMemo(
    () => computeSuggestionSignature(activeSlots, factoryROE),
    [activeSlots, factoryROE]
  );

  // Stale detection:
  // - If signature was set this session: compare against current fleet state
  // - If suggestions exist but no signature (loaded from saved quote): treat as potentially stale
  const hasSuggestions = shippingEntries.some((e) => e.source === 'suggested');
  const isStale = hasSuggestions && (
    suggestionSignature === null || !signaturesMatch(currentSignature, suggestionSignature)
  );

  // Per-mapping notes for the current fleet
  const mappingNotes = useMemo(
    () => collectMappingNotes(resolvedMappings, uniqueSeriesCodes),
    [resolvedMappings, uniqueSeriesCodes]
  );

  if (activeSlots.length === 0) {
    return (
      <Panel accent="none">
        <CardHeader icon={Package} title="Logistics & Shipping" />
        <div className="text-center py-8">
          <Truck className="w-12 h-12 text-surface-600 mx-auto mb-3" />
          <p className="text-surface-400 text-sm">
            Configure units in Fleet Builder to calculate shipping containers
          </p>
        </div>
      </Panel>
    );
  }

  // Calculate totals
  const totalUnits = activeSlots.reduce((sum, s) => sum + s.quantity, 0);
  const totalContainers = shippingEntries.reduce((sum, c) => sum + c.quantity, 0);
  const totalShippingCost = shippingEntries.reduce((sum, c) => sum + c.costZAR * c.quantity, 0);
  const costPerUnit = totalUnits > 0 ? totalShippingCost / totalUnits : 0;

  const addContainer = () => {
    addShippingEntry();
  };

  const removeContainer = (id: string) => {
    removeShippingEntry(id);
  };

  const updateContainer = (
    id: string,
    field: keyof Omit<ShippingEntry, 'id'>,
    value: string | number
  ) => {
    updateShippingEntry(id, { [field]: value } as Partial<ShippingEntry>);
  };

  const handleApplySuggestion = () => {
    const entries = generateShippingSuggestion({
      activeSlots: activeSlots.map((s) => ({ seriesCode: s.seriesCode, quantity: s.quantity })),
      mappings: resolvedMappings,
      factoryROE,
    });
    setShippingEntries(entries);
    setSuggestionSignature(computeSuggestionSignature(activeSlots, factoryROE));
    setConfirmAction(null);
  };

  return (
    <Panel accent="none">
      <CardHeader icon={Package} title="Logistics & Shipping" />

      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-lg p-3">
            <div className="text-xs text-surface-400 mb-1">Containers</div>
            <div className="text-xl font-bold text-brand-400">{totalContainers}</div>
          </div>
          <div className="glass rounded-lg p-3">
            <div className="text-xs text-surface-400 mb-1">Total Cost</div>
            <div className="text-lg font-bold text-surface-100">{formatZAR(totalShippingCost, false)}</div>
          </div>
          <div className="glass rounded-lg p-3">
            <div className="text-xs text-surface-400 mb-1">Per Unit</div>
            <div className="text-lg font-bold text-surface-100">{formatZAR(costPerUnit, false)}</div>
          </div>
        </div>

        {/* Container Reference Info */}
        <div className="glass rounded-lg overflow-hidden">
          <button
            onClick={() => setShowReference(!showReference)}
            className="w-full flex items-center justify-between p-3 text-xs font-semibold text-surface-300 hover:bg-surface-700/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-brand-400" />
              Container Reference (from Price List)
            </div>
            {showReference ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showReference && (
            <div className="px-3 pb-3 space-y-2">
              {uniqueSeriesCodes.map((code, idx) => (
                <ContainerReferenceRow key={code} seriesCode={code} mapping={allMappings[idx] ?? null} factoryROE={factoryROE} />
              ))}
              {uniqueSeriesCodes.length === 0 && (
                <p className="text-xs text-surface-500 py-2">No series selected in fleet builder.</p>
              )}
              <div className="mt-2 border-t border-surface-700/50 pt-2">
                <p className="text-xs text-surface-500 italic">
                  Reference only. Use suggestion below or enter actual costs manually.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Suggestion Controls */}
        <fieldset disabled={isReadOnly} className="border-0 p-0 m-0 min-w-0">
        <div className="glass rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-surface-300">
              <Zap className="w-4 h-4 text-brand-400" />
              Auto-Suggestion
            </div>
            <div className="flex items-center gap-2">
              {hasSuggestions && (
                <button
                  onClick={() => setConfirmAction('recalculate')}
                  className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Recalculate
                </button>
              )}
              {!hasSuggestions && (
                <button
                  onClick={() => setConfirmAction('suggest')}
                  className="text-xs bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded transition-colors"
                >
                  Calculate Suggested Shipping
                </button>
              )}
            </div>
          </div>

          {/* Stale indicator */}
          {isStale && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 rounded px-2 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              Suggestions may be outdated — fleet or ROE changed since last calculation.
              <button
                onClick={() => setConfirmAction('recalculate')}
                className="ml-auto text-amber-300 hover:text-amber-200 underline whitespace-nowrap"
              >
                Recalculate
              </button>
            </div>
          )}

          {/* Confirmation modal */}
          {confirmAction && (
            <div className="border border-surface-600 rounded-lg p-3 bg-surface-800/80">
              <p className="text-xs text-surface-300 mb-3">
                {confirmAction === 'suggest'
                  ? 'This will replace your current shipping entries with calculated suggestions. Continue?'
                  : 'This will replace all entries (including manual edits) with fresh suggestions. Continue?'}
              </p>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="text-xs text-surface-400 hover:text-surface-300 px-3 py-1 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplySuggestion}
                  className="text-xs bg-brand-600 hover:bg-brand-500 text-white px-3 py-1 rounded transition-colors"
                >
                  Replace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Per-mapping notes (amber badges, contextually relevant only) */}
        {mappingNotes.length > 0 && (
          <div className="space-y-1">
            {mappingNotes.map((note, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-amber-400 bg-amber-400/10 rounded px-2 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        )}

        {/* Manual Container Builder */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-surface-300">Shipping Containers</div>
            <button
              onClick={addContainer}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              + Add Container
            </button>
          </div>

          <div className="space-y-2">
            {shippingEntries.map((container, idx) => (
              <div key={container.id} className="glass rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-brand-400" />
                    <span className="text-xs font-semibold text-surface-200">Container {idx + 1}</span>
                    {container.source === 'suggested' && (
                      <span className="text-[10px] bg-brand-600/30 text-brand-300 px-1.5 py-0.5 rounded">
                        Suggested
                      </span>
                    )}
                  </div>
                  {shippingEntries.length > 1 && (
                    <button
                      onClick={() => removeContainer(container.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Description */}
                  <div className="col-span-2">
                    <label className="block text-xs text-surface-400 mb-1">Description</label>
                    <input
                      type="text"
                      value={container.description}
                      onChange={(e) => updateContainer(container.id, 'description', e.target.value)}
                      placeholder="e.g., Main fleet shipment"
                      className="w-full bg-surface-800 border border-surface-600 rounded px-2 py-1.5 text-xs text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Container Type */}
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">Container Type</label>
                    <select
                      value={container.containerType}
                      onChange={(e) => updateContainer(container.id, 'containerType', e.target.value)}
                      className="w-full bg-surface-800 border border-surface-600 rounded px-2 py-1.5 text-xs text-surface-100 focus:outline-none focus:border-brand-500"
                    >
                      <option value="20' standard">20' Standard</option>
                      <option value="40' standard">40' Standard</option>
                      <option value="40' high cube">40' High Cube</option>
                      <option value="flat rack">Flat Rack</option>
                      <option value="open top">Open Top</option>
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">Qty</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={container.quantity}
                      onChange={(e) => updateContainer(
                        container.id,
                        'quantity',
                        Math.max(1, parseInt(e.target.value, 10) || 1)
                      )}
                      className="w-full bg-surface-800 border border-surface-600 rounded px-2 py-1.5 text-xs text-surface-100 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Cost per container */}
                  <div className="col-span-2">
                    <label className="block text-xs text-surface-400 mb-1">Cost per Container (ZAR)</label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={container.costZAR || ''}
                      onChange={(e) => updateContainer(
                        container.id,
                        'costZAR',
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )}
                      placeholder="Enter shipping quote cost"
                      className="w-full bg-surface-800 border border-surface-600 rounded px-2 py-1.5 text-xs text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Line total */}
                <div className="flex justify-between text-xs pt-1 border-t border-surface-700/50">
                  <span className="text-surface-400">Line Total:</span>
                  <span className="font-mono text-surface-200 font-semibold">
                    {formatZAR(container.costZAR * container.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        </fieldset>

        {/* Fit Check Warnings (per-series aware) */}
        <FitCheckWarnings
          activeSlots={activeSlots}
          containers={shippingEntries}
          mappings={resolvedMappings}
          seriesCodes={uniqueSeriesCodes}
        />

        {/* Global Logistics Warnings (config-driven, collapsible) */}
        <div className="glass rounded-lg overflow-hidden">
          <button
            onClick={() => setShowWarnings(!showWarnings)}
            className="w-full flex items-center justify-between p-3 text-xs font-semibold text-surface-300 hover:bg-surface-700/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" />
              General Logistics Notes
            </div>
            {showWarnings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showWarnings && (
            <div className="px-3 pb-3 space-y-1.5">
              {LOGISTICS_WARNINGS.map((warning, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-surface-400">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cost Summary */}
        <div className="glass-brand rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-surface-300 mb-2">
            <DollarSign className="w-4 h-4" />
            Shipping Cost Summary
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-surface-400">Total Containers:</span>
              <span className="font-mono text-surface-200">{totalContainers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Total Shipping Cost:</span>
              <span className="font-mono text-surface-200">{formatZAR(totalShippingCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Cost per Unit:</span>
              <span className="font-mono text-surface-200">{formatZAR(costPerUnit)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-surface-700/50">
              <span className="text-surface-300 font-semibold">Units Being Shipped:</span>
              <span className="font-mono text-brand-400 font-semibold">{totalUnits}</span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** Shows reference container mapping info for a series code */
function ContainerReferenceRow({ seriesCode, mapping, factoryROE }: { seriesCode: string; mapping: ContainerMapping | null; factoryROE: number }) {
  if (!mapping) {
    return (
      <div className="flex items-center justify-between text-xs py-1">
        <span className="text-surface-400">Series {seriesCode.replace(/0+$/, '') || seriesCode}</span>
        <span className="text-surface-500 italic">No container data</span>
      </div>
    );
  }

  const shortCode = mapping.seriesCode || seriesCode.replace(/0+$/, '');
  const costZAR = mapping.containerCostEUR * factoryROE;

  return (
    <div className="flex items-center justify-between text-xs py-1 border-b border-surface-700/30 last:border-0">
      <div>
        <span className="text-surface-200 font-medium">{shortCode}</span>
        <span className="text-surface-500 ml-2">{mapping.category}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-surface-400">
          {mapping.qtyPerContainer} units/{mapping.containerType}
        </span>
        <span className="font-mono text-surface-300">
          {formatEUR(mapping.containerCostEUR, false)} ({formatZAR(costZAR, false)})
        </span>
      </div>
    </div>
  );
}

/** Per-series aware fit check warnings */
function FitCheckWarnings({
  activeSlots,
  containers,
  mappings,
  seriesCodes,
}: {
  activeSlots: UnitSlot[];
  containers: ShippingEntry[];
  mappings: ContainerMapping[];
  seriesCodes: string[];
}) {
  const warnings: string[] = [];

  const totalUnits = activeSlots.reduce((sum, s) => sum + s.quantity, 0);

  // Basic: no cost entered at all
  const hasAnyCost = containers.some((c) => c.costZAR > 0);
  if (!hasAnyCost && totalUnits > 0) {
    warnings.push('No shipping costs entered. Enter costs from your freight quote for accurate pricing.');
  }

  // Determine if any entries have series assignments (suggested flow vs purely manual)
  const hasAnySeriesAssignment = containers.some((e) => e.seriesCodes && e.seriesCodes.length > 0);

  // Per-series fit checks
  for (const code of seriesCodes) {
    const shortCode = code.replace(/0+$/, '') || code;

    // Units for this series
    const seriesUnits = activeSlots
      .filter((s) => s.seriesCode === code)
      .reduce((sum, s) => sum + s.quantity, 0);

    // Find mapping for this series
    const mapping = mappings.find(
      (m) =>
        m.seriesCode === code ||
        code.startsWith(m.seriesCode) ||
        m.seriesCode === code.replace(/0+\d?$/, '')
    );

    if (!mapping) {
      warnings.push(`Series ${shortCode}: no container mapping found — enter shipping manually.`);
      continue;
    }

    const neededContainers = Math.ceil(seriesUnits / mapping.qtyPerContainer);

    // Check entries assigned to this series
    const assignedEntries = containers.filter(
      (e) => e.seriesCodes && e.seriesCodes.includes(code)
    );

    if (assignedEntries.length > 0) {
      // Suggested/assigned flow: compare assigned containers vs needed
      const assignedContainers = assignedEntries.reduce((sum, e) => sum + e.quantity, 0);
      if (assignedContainers < neededContainers) {
        warnings.push(
          `Series ${shortCode}: ${assignedContainers} container(s) entered but ${neededContainers} needed for ${seriesUnits} units.`
        );
      }
    } else if (!hasAnySeriesAssignment) {
      // Fully manual flow (no entries have seriesCodes): use aggregate heuristic
      // Total containers across all manual entries vs total needed for this series
      const totalContainers = containers.reduce((sum, c) => sum + c.quantity, 0);
      const totalNeeded = seriesCodes.reduce((sum, sc) => {
        const units = activeSlots.filter((s) => s.seriesCode === sc).reduce((s, slot) => s + slot.quantity, 0);
        const m = mappings.find(
          (mp) => mp.seriesCode === sc || sc.startsWith(mp.seriesCode) || mp.seriesCode === sc.replace(/0+\d?$/, '')
        );
        return sum + (m ? Math.ceil(units / m.qtyPerContainer) : 0);
      }, 0);

      if (totalContainers < totalNeeded) {
        warnings.push(
          `${totalContainers} container(s) entered but at least ${totalNeeded} needed for ${totalUnits} units across all series.`
        );
        break; // Only show aggregate warning once
      }
    }
  }

  if (warnings.length === 0) return null;

  return (
    <div>
      <div className="text-xs font-semibold text-surface-300 mb-2">Warnings</div>
      <div className="space-y-2">
        {warnings.map((warning, idx) => (
          <div key={idx} className="glass rounded-lg p-2 border-l-2 border-warning flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-warning">{warning}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
