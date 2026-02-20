import { useEffect } from 'react';
import { useQuoteStore } from '../../../store/useQuoteStore';
import { useTelematicsPackages } from '../../../hooks/usePriceList';
import { useBuilder } from '../BuilderContext';
import { StepHeader } from '../shared/StepHeader';
import { UnitTabs } from '../shared/UnitTabs';
import { CostFieldGroup } from '../shared/CostFieldGroup';
import { SearchableSelect } from '../../ui/SearchableSelect';
import type { SlotIndex, ClearingCharges, LocalCosts } from '../../../types/quote';

function UnitCostsPanel({ slotIndex }: { slotIndex: SlotIndex }) {
  const slot = useQuoteStore((s) => s.slots[slotIndex]);
  const setLocalBatteryCost = useQuoteStore((s) => s.setLocalBatteryCost);
  const selectTelematicsPackage = useQuoteStore((s) => s.selectTelematicsPackage);
  const updateSlot = useQuoteStore((s) => s.updateSlot);
  const setClearingCharge = useQuoteStore((s) => s.setClearingCharge);
  const setLocalCost = useQuoteStore((s) => s.setLocalCost);

  const telematicsPackages = useTelematicsPackages();

  const handleTelematicsChange = (packageId: string) => {
    if (!packageId) {
      selectTelematicsPackage(slotIndex, '', 0);
      return;
    }
    const pkg = telematicsPackages.find((p) => p.id === packageId);
    if (pkg) {
      selectTelematicsPackage(slotIndex, pkg.id, pkg.costZAR);
    }
  };

  return (
    <div className="space-y-6">
      {/* Local Battery */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-surface-500 uppercase">Local Battery</h4>
        <input
          type="text"
          placeholder="Battery description (e.g. 48V 700Ah Lead-Acid)"
          value={slot.localBatteryDescription}
          onChange={(e) => setLocalBatteryCost(slotIndex, slot.localBatteryCostZAR, e.target.value)}
          className="input w-full text-sm"
        />
        <div className="flex items-center gap-1">
          <span className="text-xs text-surface-500">R</span>
          <input
            type="number"
            min="0"
            max={5000000}
            step="500"
            value={slot.localBatteryCostZAR || ''}
            onChange={(e) => setLocalBatteryCost(slotIndex, Math.min(parseFloat(e.target.value) || 0, 5000000), slot.localBatteryDescription)}
            placeholder="0"
            className="input w-full text-sm"
          />
        </div>
      </div>

      {/* Telematics Package */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-surface-500 uppercase">Telematics Package</h4>
        <SearchableSelect
          value={slot.telematicsPackageId}
          onChange={handleTelematicsChange}
          placeholder="None selected"
          options={telematicsPackages.map((p) => ({
            value: p.id,
            label: `${p.name} (R${p.costZAR.toLocaleString()})`,
          }))}
        />
      </div>

      {/* Local Attachment Cost */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-surface-500 uppercase">Local Attachment Cost</h4>
        <div className="flex items-center gap-1">
          <span className="text-xs text-surface-500">R</span>
          <input
            type="number"
            min="0"
            max={5000000}
            step="500"
            value={slot.localAttachmentCostZAR || ''}
            onChange={(e) => updateSlot(slotIndex, { localAttachmentCostZAR: Math.min(parseFloat(e.target.value) || 0, 5000000) })}
            placeholder="0"
            className="input w-full text-sm"
          />
        </div>
      </div>

      {/* Clearing Charges */}
      <CostFieldGroup
        title="Clearing Charges"
        collapsible
        defaultOpen={false}
        fields={([
          ['inlandFreight', 'Inland Freight'],
          ['seaFreight', 'Sea Freight'],
          ['portCharges', 'Port Charges'],
          ['transport', 'Transport'],
          ['destuffing', 'Destuffing'],
          ['duties', 'Duties'],
          ['warranty', 'Warranty'],
        ] as [keyof ClearingCharges, string][]).map(([key, label]) => ({
          key,
          label,
          value: slot.clearingCharges[key],
          onChange: (val: number) => setClearingCharge(slotIndex, key, val),
        }))}
      />

      {/* Local Costs */}
      <CostFieldGroup
        title="Local Costs"
        collapsible
        defaultOpen={false}
        fields={([
          ['assembly', 'Assembly'],
          ['loadTest', 'Load Test'],
          ['delivery', 'Delivery'],
          ['pdi', 'PDI'],
          ['extras', 'Extras'],
        ] as [keyof LocalCosts, string][]).map(([key, label]) => ({
          key,
          label,
          value: slot.localCosts[key],
          onChange: (val: number) => setLocalCost(slotIndex, key, val),
        }))}
      />
    </div>
  );
}

export function CostsStep() {
  const slots = useQuoteStore((s) => s.slots);
  const { setCanProceed, activeUnitTab } = useBuilder();

  const activeSlots = slots.filter((s) => !s.isEmpty && s.modelCode !== '0');

  // Costs are fully optional — always allow proceed
  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  if (activeSlots.length === 0) {
    return (
      <div className="glass rounded-xl p-6">
        <StepHeader step={4} title="Costs" subtitle="No units to configure costs for." />
      </div>
    );
  }

  const currentSlot = activeSlots[Math.min(activeUnitTab, activeSlots.length - 1)];

  return (
    <div className="glass rounded-xl p-6">
      <StepHeader
        step={4}
        title="Costs"
        subtitle="Add battery, telematics, clearing charges, and local costs. All fields are optional."
      />

      <UnitTabs />

      <UnitCostsPanel slotIndex={currentSlot.slotIndex} />
    </div>
  );
}
