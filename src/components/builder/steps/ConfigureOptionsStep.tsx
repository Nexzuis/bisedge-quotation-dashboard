import { useMemo, useEffect } from 'react';
import { useQuoteStore } from '../../../store/useQuoteStore';
import {
  useSeriesData,
  useModelOptions,
  getOptionAvailability,
  calculateOptionsCost,
} from '../../../hooks/usePriceList';
import { useBuilder } from '../BuilderContext';
import { StepHeader } from '../shared/StepHeader';
import { UnitTabs } from '../shared/UnitTabs';
import { CategoryAccordion } from '../shared/CategoryAccordion';
import { OptionRow } from '../shared/OptionRow';
import { formatZAR } from '../../../engine/formatters';
import type { SlotIndex, PriceListOption } from '../../../types/quote';

function getSpecCategory(specCode: string): string {
  const code = parseInt(specCode, 10);
  if (code >= 1100 && code < 1200) return 'Basic';
  if (code >= 1200 && code < 1400) return 'Pedals & Brakes';
  if (code >= 1300 && code < 1400) return 'Wheels & Tires';
  if (code >= 1400 && code < 2000) return 'Wheels & Tires';
  if (code >= 2000 && code < 2300) return 'Battery Compartment';
  if (code >= 2300 && code < 3000) return 'Axle';
  if (code >= 3000 && code < 3500) return 'Mast';
  if (code >= 3500 && code < 4000) return 'Forks & Hydraulics';
  if (code >= 4000 && code < 5000) return 'Controls & Safety';
  if (code >= 5000 && code < 6000) return 'Cabin & Comfort';
  if (code >= 6000 && code < 7000) return 'Electrical';
  if (code >= 7000 && code < 8000) return 'Forks';
  return 'Other';
}

function UnitConfigPanel({ slotIndex }: { slotIndex: SlotIndex }) {
  const slot = useQuoteStore((s) => s.slots[slotIndex]);
  const factoryROE = useQuoteStore((s) => s.factoryROE);
  const toggleOption = useQuoteStore((s) => s.toggleOption);
  const updateSlot = useQuoteStore((s) => s.updateSlot);

  const seriesData = useSeriesData(slot.seriesCode);
  const modelOptions = useModelOptions(slot.seriesCode, slot.indxColumn);

  // Group options by category
  const groupedOptions = useMemo(() => {
    if (!modelOptions.length) return {};
    const groups: Record<string, PriceListOption[]> = {};
    modelOptions.forEach((opt) => {
      if (opt.specCode === '1100') return; // Skip MODEL spec
      const cat = getSpecCategory(opt.specCode);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(opt);
    });
    return groups;
  }, [modelOptions]);

  // Recalculate config cost
  useEffect(() => {
    if (!seriesData || !slot.indxColumn) return;
    const cost = calculateOptionsCost(slot.configuration, seriesData.options, slot.indxColumn, seriesData.models);
    if (cost !== slot.configurationCost) {
      updateSlot(slotIndex, { configurationCost: cost });
    }
  }, [slot.configuration, slot.indxColumn, seriesData]);

  const configCostZAR = (slot.configurationCost || 0) * factoryROE;

  return (
    <div>
      {/* Config cost header */}
      {configCostZAR > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-brand-500/5 border border-brand-500/20">
          <span className="text-sm text-surface-400">Configuration cost: </span>
          <span className="text-sm font-semibold font-mono text-brand-400">{formatZAR(configCostZAR, false)}</span>
        </div>
      )}

      {/* Category accordions */}
      <div className="space-y-2">
        {Object.entries(groupedOptions).map(([category, options]) => (
          <CategoryAccordion
            key={category}
            title={category}
            count={options.length}
            defaultOpen={category === 'Basic'}
          >
            {options.map((option, i) => {
              if (!seriesData) return null;
              const avail = getOptionAvailability(option, slot.indxColumn, seriesData.models);
              if (avail === 0) return null;

              const isSelected = slot.configuration[option.specCode] === option.materialNumber;
              const isStandard = avail === 1;

              return (
                <OptionRow
                  key={option.materialNumber}
                  description={option.description}
                  isSelected={isSelected}
                  isStandard={isStandard}
                  availabilityLevel={avail}
                  eurPrice={option.eurPrice}
                  factoryROE={factoryROE}
                  onToggle={() => toggleOption(slotIndex, option.specCode, option.materialNumber)}
                  delay={i * 0.03}
                  notes={option.notes}
                />
              );
            })}
          </CategoryAccordion>
        ))}
      </div>

      {Object.keys(groupedOptions).length === 0 && (
        <div className="text-center py-8 text-surface-500">
          No configuration options available for this model.
        </div>
      )}
    </div>
  );
}

export function ConfigureOptionsStep() {
  const slots = useQuoteStore((s) => s.slots);
  const { setCanProceed, activeUnitTab } = useBuilder();

  const activeSlots = slots.filter((s) => !s.isEmpty && s.modelCode !== '0');

  // This step is skippable — always allow proceed
  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  if (activeSlots.length === 0) {
    return (
      <div className="glass rounded-xl p-6">
        <StepHeader step={3} title="Configure Options" subtitle="No units to configure. Go back to add units first." />
      </div>
    );
  }

  const currentSlot = activeSlots[Math.min(activeUnitTab, activeSlots.length - 1)];

  return (
    <div className="glass rounded-xl p-6">
      <StepHeader
        step={3}
        title="Configure Options"
        subtitle="Customize configuration options for each unit. Standard options are pre-selected."
      />

      <UnitTabs />

      <UnitConfigPanel slotIndex={currentSlot.slotIndex} />
    </div>
  );
}
