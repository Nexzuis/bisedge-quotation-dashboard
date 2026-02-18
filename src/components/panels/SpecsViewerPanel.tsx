import { useState } from 'react';
import { FileText, Package, Battery, Ruler, Weight } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useQuoteStore } from '../../store/useQuoteStore';
import { formatEUR } from '../../engine/formatters';
import modelsData from '../../data/models.json';
import batteriesPbData from '../../data/batteries-pb.json';
import batteriesLiIonData from '../../data/batteries-li-ion.json';
import type { ForkliftModel, BatteryModel } from '../../types/quote';

const models: ForkliftModel[] = modelsData as any;
const allBatteries: BatteryModel[] = [...(batteriesPbData as any), ...(batteriesLiIonData as any)];

export function SpecsViewerPanel() {
  const slots = useQuoteStore((state) => state.slots);
  const activeSlots = slots.filter((s) => !s.isEmpty && s.modelCode !== '0');
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(0);

  // Show the selected configured unit
  const selectedSlot = activeSlots[selectedUnitIndex] || activeSlots[0];

  if (!selectedSlot) {
    return (
      <Panel accent="none">
        <CardHeader icon={FileText} title="Specifications" />
        <div className="text-center py-8">
          <Package className="w-12 h-12 text-surface-600 mx-auto mb-3" />
          <p className="text-surface-400 text-sm">
            Select a unit from Fleet Builder to view specifications
          </p>
        </div>
      </Panel>
    );
  }

  const model = models.find((m) => m.modelCode === selectedSlot.modelCode);
  const battery = allBatteries.find((b) => b.id === selectedSlot.batteryId);

  if (!model) {
    return (
      <Panel accent="none">
        <CardHeader icon={FileText} title="Specifications" />
        <div className="text-center py-8 text-surface-400 text-sm">
          Model data not found
        </div>
      </Panel>
    );
  }

  return (
    <Panel accent="none">
      <CardHeader
        icon={FileText}
        title="Specifications"
        action={
          activeSlots.length > 1 && (
            <select
              value={selectedUnitIndex}
              onChange={(e) => setSelectedUnitIndex(parseInt(e.target.value))}
              className="input text-xs px-2 py-1"
            >
              {activeSlots.map((slot, idx) => (
                <option key={slot.slotIndex} value={idx}>
                  Unit {slot.slotIndex + 1}: {slot.modelName}
                </option>
              ))}
            </select>
          )
        }
      />

      <div className="space-y-4">
        {/* Model Header */}
        <div className="glass-brand rounded-lg p-3">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-xs text-surface-400 mb-1">Model Number</div>
              <div className="text-xl font-bold font-mono text-brand-400">
                {model.modelCode}
              </div>
            </div>
            <Badge variant="brand">{model.category}</Badge>
          </div>
          <div className="text-sm font-semibold text-surface-200">{model.modelName}</div>
          <div className="text-xs text-surface-400 mt-1">{model.description}</div>
        </div>

        {/* Key Specifications */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-lg p-3">
            <div className="text-xs text-surface-400 mb-1">Capacity</div>
            <div className="text-lg font-bold text-surface-100">
              {(model.capacity / 1000).toFixed(1)}t
            </div>
          </div>
          <div className="glass rounded-lg p-3">
            <div className="text-xs text-surface-400 mb-1">EUR Cost</div>
            <div className="text-lg font-bold text-surface-100">
              {formatEUR(model.eurCost, false)}
            </div>
          </div>
        </div>

        {/* Dimensions */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-surface-300 mb-2">
            <Ruler className="w-4 h-4" />
            Dimensions
          </div>
          <div className="glass rounded-lg p-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-surface-400">Length:</span>
                <span className="ml-2 text-surface-200 font-mono">{model.dimensions.length} cm</span>
              </div>
              <div>
                <span className="text-surface-400">Width:</span>
                <span className="ml-2 text-surface-200 font-mono">{model.dimensions.width} cm</span>
              </div>
              <div>
                <span className="text-surface-400">Height:</span>
                <span className="ml-2 text-surface-200 font-mono">{model.dimensions.height} cm</span>
              </div>
              <div>
                <span className="text-surface-400">Weight:</span>
                <span className="ml-2 text-surface-200 font-mono">{model.dimensions.weight} kg</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mast Configuration */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-surface-300 mb-2">
            <Weight className="w-4 h-4" />
            Mast Configuration
          </div>
          <div className="glass rounded-lg p-3">
            <div className="text-xs mb-1">
              <span className="text-surface-400">Default:</span>
              <span className="ml-2 text-surface-200 font-semibold">{model.defaultMast}</span>
            </div>
            <div className="text-xs">
              <span className="text-surface-400">Available:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {model.availableMasts.map((mast, idx) => (
                  <Badge key={idx} variant="info" className="text-[10px]">
                    {mast}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Battery Information */}
        {battery ? (
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-surface-300 mb-2">
              <Battery className="w-4 h-4" />
              Selected Battery
            </div>
            <div className="glass-brand rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-surface-200">{battery.name}</div>
                <Badge variant={battery.chemistry === 'lithium-ion' ? 'success' : 'warning'}>
                  {battery.chemistry === 'lithium-ion' ? 'Li-Ion' : 'Lead Acid'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-surface-400">Voltage:</span>
                  <span className="ml-2 text-surface-200 font-mono">{battery.voltage}V</span>
                </div>
                <div>
                  <span className="text-surface-400">Capacity:</span>
                  <span className="ml-2 text-surface-200 font-mono">{battery.capacity}Ah</span>
                </div>
                <div>
                  <span className="text-surface-400">Weight:</span>
                  <span className="ml-2 text-surface-200 font-mono">{battery.weight} kg</span>
                </div>
                <div>
                  <span className="text-surface-400">Warranty:</span>
                  <span className="ml-2 text-surface-200 font-mono">{battery.warrantyYears} years</span>
                </div>
              </div>
              <div className="mt-2 text-xs">
                <span className="text-surface-400">Cost:</span>
                <span className="ml-2 text-brand-400 font-semibold">{formatEUR(battery.eurCost)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass rounded-lg p-3 border-warning/30">
            <div className="flex items-center gap-2 text-xs text-warning">
              <Battery className="w-4 h-4" />
              <span>No battery selected for this unit</span>
            </div>
          </div>
        )}

        {/* Technical Specifications */}
        <div>
          <div className="text-xs font-semibold text-surface-300 mb-2">Technical Codes</div>
          <div className="glass rounded-lg p-3">
            <div className="grid grid-cols-1 gap-2 text-xs">
              {Object.entries(model.specifications).map(([code, value]) => (
                <div key={code} className="flex justify-between">
                  <span className="text-surface-400 font-mono">{code}:</span>
                  <span className="text-surface-200">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
