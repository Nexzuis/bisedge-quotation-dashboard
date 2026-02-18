import { useEffect } from 'react';
import { useQuoteStore } from '../../../store/useQuoteStore';
import { useBuilder } from '../BuilderContext';
import { StepHeader } from '../shared/StepHeader';
import { UnitTabs } from '../shared/UnitTabs';
import { LivePricingPreview } from '../shared/LivePricingPreview';
import { Input } from '../../ui/Input';
import type { SlotIndex, LeaseTermMonths } from '../../../types/quote';

const LEASE_TERMS: LeaseTermMonths[] = [36, 48, 60, 72, 84];

function UnitCommercialPanel({ slotIndex }: { slotIndex: SlotIndex }) {
  const slot = useQuoteStore((s) => s.slots[slotIndex]);
  const setCommercialField = useQuoteStore((s) => s.setCommercialField);
  const updateSlot = useQuoteStore((s) => s.updateSlot);

  const numField = (field: string, label: string, step: number = 1, min: number = 0) => (
    <div>
      <label className="block text-xs text-surface-400 mb-1">{label}</label>
      <input
        type="number"
        step={step}
        min={min}
        value={(slot as any)[field] || ''}
        onChange={(e) => setCommercialField(slotIndex, field, parseFloat(e.target.value) || 0)}
        placeholder="0"
        className="input w-full text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Discount & Markup */}
      <div>
        <h4 className="text-xs font-bold text-surface-500 uppercase mb-3">Pricing</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-surface-400 mb-1">Discount %</label>
            <input
              type="number"
              step={0.5}
              min={0}
              max={100}
              value={slot.discountPct || ''}
              onChange={(e) => updateSlot(slotIndex, { discountPct: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) })}
              placeholder="0"
              className="input w-full text-sm"
            />
          </div>
          {numField('markupPct', 'Markup %', 0.5)}
          {numField('financeCostPct', 'Finance Cost % (Annual)', 0.25)}
        </div>
      </div>

      {/* Operating Hours & Lease Term */}
      <div>
        <h4 className="text-xs font-bold text-surface-500 uppercase mb-3">Term & Hours</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-surface-400 mb-1">Operating Hours/Month</label>
            <input
              type="number"
              min={0}
              max={720}
              value={slot.operatingHoursPerMonth || ''}
              onChange={(e) => updateSlot(slotIndex, { operatingHoursPerMonth: parseInt(e.target.value) || 0 })}
              placeholder="180"
              className="input w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Lease Term</label>
            <select
              value={slot.leaseTermMonths}
              onChange={(e) => updateSlot(slotIndex, { leaseTermMonths: parseInt(e.target.value) as LeaseTermMonths })}
              className="input w-full text-sm"
            >
              {LEASE_TERMS.map((t) => (
                <option key={t} value={t}>{t} months</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Residual Values */}
      <div>
        <h4 className="text-xs font-bold text-surface-500 uppercase mb-3">Residual Values</h4>
        <div className="grid grid-cols-3 gap-4">
          {numField('residualValueTruckPct', 'Truck %')}
          {numField('residualValueBatteryPct', 'Battery %')}
          {numField('residualValueAttachmentPct', 'Attachment %')}
        </div>
      </div>

      {/* Maintenance Rates */}
      <div>
        <h4 className="text-xs font-bold text-surface-500 uppercase mb-3">Maintenance Rates (R/hr)</h4>
        <div className="grid grid-cols-3 gap-4">
          {numField('maintenanceRateTruckPerHr', 'Truck')}
          {numField('maintenanceRateTiresPerHr', 'Tires')}
          {numField('maintenanceRateAttachmentPerHr', 'Attachment')}
        </div>
      </div>

      {/* Telematics Subscription */}
      <div>
        <h4 className="text-xs font-bold text-surface-500 uppercase mb-3">Telematics Subscription</h4>
        <div className="grid grid-cols-2 gap-4">
          {numField('telematicsSubscriptionCostPerMonth', 'Cost/Month (R)', 10)}
          {numField('telematicsSubscriptionSellingPerMonth', 'Selling/Month (R)', 10)}
        </div>
      </div>

      {/* Operator Price */}
      <div>
        <h4 className="text-xs font-bold text-surface-500 uppercase mb-3">Operator</h4>
        {numField('operatorPricePerMonth', 'Operator Price/Month (R)', 100)}
      </div>

      {/* Live Pricing Preview */}
      <LivePricingPreview slotIndex={slotIndex} />
    </div>
  );
}

export function CommercialStep() {
  const slots = useQuoteStore((s) => s.slots);
  const { setCanProceed, activeUnitTab } = useBuilder();

  const activeSlots = slots.filter((s) => !s.isEmpty && s.modelCode !== '0');

  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  if (activeSlots.length === 0) {
    return (
      <div className="glass rounded-xl p-6">
        <StepHeader step={5} title="Commercial" subtitle="No units to configure." />
      </div>
    );
  }

  const currentSlot = activeSlots[Math.min(activeUnitTab, activeSlots.length - 1)];

  return (
    <div className="glass rounded-xl p-6">
      <StepHeader
        step={5}
        title="Commercial"
        subtitle="Set markup, residual values, maintenance rates, and lease terms for each unit."
      />

      <UnitTabs />

      <UnitCommercialPanel slotIndex={currentSlot.slotIndex} />
    </div>
  );
}
