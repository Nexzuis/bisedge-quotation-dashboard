import { useState } from 'react';
import { Package, Truck, ChevronDown, ChevronUp, AlertTriangle, Info, DollarSign } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { CardHeader } from '../ui/Card';
import { useQuoteStore } from '../../store/useQuoteStore';
import type { UnitSlot } from '../../types/quote';
import { useContainerMapping } from '../../hooks/usePriceList';
import { formatZAR, formatEUR } from '../../engine/formatters';

interface ContainerEntry {
  description: string;
  containerType: string;
  quantity: number;
  costZAR: number;
}

export function LogisticsPanel() {
  const slots = useQuoteStore((state) => state.slots);
  const factoryROE = useQuoteStore((state) => state.factoryROE);
  const activeSlots = slots.filter((s) => !s.isEmpty && s.modelCode !== '0');

  const [containers, setContainers] = useState<ContainerEntry[]>([
    { description: '', containerType: "40' standard", quantity: 1, costZAR: 0 },
  ]);
  const [showReference, setShowReference] = useState(true);

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

  // Gather unique series codes for container reference info
  const uniqueSeriesCodes = [...new Set(activeSlots.map((s) => s.seriesCode).filter(Boolean))];

  // Calculate totals
  const totalUnits = activeSlots.reduce((sum, s) => sum + s.quantity, 0);
  const totalContainers = containers.reduce((sum, c) => sum + c.quantity, 0);
  const totalShippingCost = containers.reduce((sum, c) => sum + c.costZAR * c.quantity, 0);
  const costPerUnit = totalUnits > 0 ? totalShippingCost / totalUnits : 0;

  const addContainer = () => {
    setContainers([...containers, { description: '', containerType: "40' standard", quantity: 1, costZAR: 0 }]);
  };

  const removeContainer = (index: number) => {
    if (containers.length <= 1) return;
    setContainers(containers.filter((_, i) => i !== index));
  };

  const updateContainer = (index: number, field: keyof ContainerEntry, value: string | number) => {
    setContainers(containers.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
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
              {uniqueSeriesCodes.map((code) => (
                <ContainerReferenceRow key={code} seriesCode={code} factoryROE={factoryROE} />
              ))}
              {uniqueSeriesCodes.length === 0 && (
                <p className="text-xs text-surface-500 py-2">No series selected in fleet builder.</p>
              )}
              <div className="mt-2 border-t border-surface-700/50 pt-2">
                <p className="text-xs text-surface-500 italic">
                  Reference only. Enter actual shipping costs from your freight quote below.
                </p>
              </div>
            </div>
          )}
        </div>

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
            {containers.map((container, idx) => (
              <div key={idx} className="glass rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-brand-400" />
                    <span className="text-xs font-semibold text-surface-200">Container {idx + 1}</span>
                  </div>
                  {containers.length > 1 && (
                    <button
                      onClick={() => removeContainer(idx)}
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
                      onChange={(e) => updateContainer(idx, 'description', e.target.value)}
                      placeholder="e.g., Main fleet shipment"
                      className="w-full bg-surface-800 border border-surface-600 rounded px-2 py-1.5 text-xs text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Container Type */}
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">Container Type</label>
                    <select
                      value={container.containerType}
                      onChange={(e) => updateContainer(idx, 'containerType', e.target.value)}
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
                      onChange={(e) => updateContainer(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
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
                      onChange={(e) => updateContainer(idx, 'costZAR', Math.max(0, parseFloat(e.target.value) || 0))}
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

        {/* Fit Check Warnings */}
        <FitCheckWarnings activeSlots={activeSlots} containers={containers} />

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
function ContainerReferenceRow({ seriesCode, factoryROE }: { seriesCode: string; factoryROE: number }) {
  const mapping = useContainerMapping(seriesCode);

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

/** Fit check warnings based on container mappings */
function FitCheckWarnings({
  activeSlots,
  containers,
}: {
  activeSlots: UnitSlot[];
  containers: ContainerEntry[];
}) {
  const warnings: string[] = [];

  // Total units being shipped
  const totalUnits = activeSlots.reduce((sum, s) => sum + s.quantity, 0);
  const totalContainers = containers.reduce((sum, c) => sum + c.quantity, 0);

  // Basic fit check: if no containers have cost entered
  const hasAnyCost = containers.some((c) => c.costZAR > 0);
  if (!hasAnyCost && totalUnits > 0) {
    warnings.push('No shipping costs entered. Enter costs from your freight quote for accurate pricing.');
  }

  // Check if container count seems low (rough heuristic)
  if (totalContainers > 0 && totalUnits > totalContainers * 6) {
    warnings.push(
      `${totalUnits} units with only ${totalContainers} container(s) may be insufficient. Check with logistics provider.`
    );
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
