import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowLeft, Search } from 'lucide-react';
import { useQuoteStore } from '../../../store/useQuoteStore';
import { usePriceListSeries, useSeriesData, getStandardOptionsForModel } from '../../../hooks/usePriceList';
import { useBuilder } from '../BuilderContext';
import { StepHeader } from '../shared/StepHeader';
import { UnitCard } from '../shared/UnitCard';
import { SeriesCard } from '../shared/SeriesCard';
import { ModelCard } from '../shared/ModelCard';
import { toast } from '../../ui/Toast';
import type { SlotIndex } from '../../../types/quote';

export function SelectUnitsStep() {
  const slots = useQuoteStore((s) => s.slots);
  const selectSeries = useQuoteStore((s) => s.selectSeries);
  const selectModel = useQuoteStore((s) => s.selectModel);
  const toggleOption = useQuoteStore((s) => s.toggleOption);
  const clearSlot = useQuoteStore((s) => s.clearSlot);
  const updateSlot = useQuoteStore((s) => s.updateSlot);
  const factoryROE = useQuoteStore((s) => s.factoryROE);

  const { setCanProceed, activeSlotIndex, setActiveSlotIndex, unitPickerPhase, setUnitPickerPhase } = useBuilder();

  const [searchFilter, setSearchFilter] = useState('');
  const [selectedSeriesCode, setSelectedSeriesCode] = useState('');
  const [quantity, setQuantity] = useState(1);

  const activeSlots = slots.filter((s) => !s.isEmpty && s.modelCode !== '0');
  const allSeries = usePriceListSeries();
  const seriesData = useSeriesData(selectedSeriesCode);

  // Allow proceed when at least 1 unit is configured
  useEffect(() => {
    setCanProceed(activeSlots.length > 0);
  }, [activeSlots.length, setCanProceed]);

  const filteredSeries = useMemo(() => {
    if (!searchFilter) return allSeries;
    const lower = searchFilter.toLowerCase();
    return allSeries.filter((s) =>
      s.seriesName.toLowerCase().includes(lower) || s.seriesCode.includes(searchFilter)
    );
  }, [allSeries, searchFilter]);

  const filteredModels = useMemo(() => {
    if (!seriesData) return [];
    if (!searchFilter) return seriesData.models;
    const lower = searchFilter.toLowerCase();
    return seriesData.models.filter((m) =>
      m.modelName.toLowerCase().includes(lower)
    );
  }, [seriesData, searchFilter]);

  // Find next empty slot
  const getNextEmptySlot = (): SlotIndex | null => {
    for (let i = 0; i < 6; i++) {
      if (slots[i].isEmpty) return i as SlotIndex;
    }
    return null;
  };

  const handleAddUnit = () => {
    const nextSlot = getNextEmptySlot();
    if (nextSlot === null) return;
    setActiveSlotIndex(nextSlot);
    setUnitPickerPhase('series');
    setSearchFilter('');
    setSelectedSeriesCode('');
    setQuantity(1);
  };

  const handleSeriesSelect = (seriesCode: string) => {
    setSelectedSeriesCode(seriesCode);
    if (activeSlotIndex !== null) {
      selectSeries(activeSlotIndex as SlotIndex, seriesCode);
    }
    setUnitPickerPhase('model');
    setSearchFilter('');
  };

  const handleModelSelect = (materialNumber: string) => {
    if (activeSlotIndex === null || !seriesData) return;
    const model = seriesData.models.find((m) => m.materialNumber === materialNumber);
    if (!model) return;

    const slotIdx = activeSlotIndex as SlotIndex;
    selectModel(slotIdx, model.materialNumber, model.modelName, model.baseEurCost, model.indxColumn);
    updateSlot(slotIdx, { quantity });

    // Auto-select standard options
    const stdOpts = getStandardOptionsForModel(seriesData.options, model.indxColumn, seriesData.models);
    Object.entries(stdOpts).forEach(([specCode, matNum]) => {
      toggleOption(slotIdx, specCode, matNum);
    });

    // Return to roster
    setActiveSlotIndex(null);
    setUnitPickerPhase('roster');
    setSearchFilter('');
  };

  const handleBack = () => {
    if (unitPickerPhase === 'model') {
      setUnitPickerPhase('series');
      setSelectedSeriesCode('');
      setSearchFilter('');
    } else if (unitPickerPhase === 'series') {
      // Cancel adding unit - clear the slot if we started one
      if (activeSlotIndex !== null) {
        clearSlot(activeSlotIndex as SlotIndex);
      }
      setActiveSlotIndex(null);
      setUnitPickerPhase('roster');
      setSearchFilter('');
    }
  };

  const handleEditUnit = (slotIndex: SlotIndex) => {
    setActiveSlotIndex(slotIndex);
    setSelectedSeriesCode(slots[slotIndex].seriesCode);
    setUnitPickerPhase('series');
    setSearchFilter('');
  };

  const handleRemoveUnit = (slotIndex: SlotIndex) => {
    clearSlot(slotIndex);
    toast.success('Unit removed');
  };

  // --- Render: Roster View ---
  if (unitPickerPhase === 'roster') {
    return (
      <div className="glass rounded-xl p-6">
        <StepHeader
          step={2}
          title="Select Units"
          subtitle={`Add up to 6 units to your quote. ${activeSlots.length} configured so far.`}
        />

        {/* Unit cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <AnimatePresence mode="popLayout">
            {activeSlots.map((slot) => (
              <UnitCard
                key={slot.slotIndex}
                slotIndex={slot.slotIndex}
                onEdit={() => handleEditUnit(slot.slotIndex)}
                onRemove={() => handleRemoveUnit(slot.slotIndex)}
              />
            ))}
          </AnimatePresence>

          {/* Add Unit button */}
          {activeSlots.length < 6 && (
            <motion.button
              onClick={handleAddUnit}
              className="glass rounded-xl p-6 border-2 border-dashed border-surface-600 hover:border-brand-500/50 flex flex-col items-center justify-center gap-2 transition-colors min-h-[120px]"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-6 h-6 text-surface-500" />
              <span className="text-sm text-surface-400">Add Unit</span>
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  // --- Render: Series Selection ---
  if (unitPickerPhase === 'series') {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={handleBack} className="p-2 rounded-lg hover:bg-surface-700/50 text-surface-400 hover:text-surface-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <StepHeader
            step={2}
            title="Choose Series"
            subtitle="Select a forklift series to see available models."
          />
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            placeholder="Search series..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="input w-full pl-10 text-sm"
          />
        </div>

        {/* Series grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredSeries.map((series, i) => (
            <motion.div
              key={series.seriesCode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <SeriesCard
                seriesCode={series.seriesCode}
                seriesName={series.seriesName}
                modelCount={series.modelCount}
                onClick={() => handleSeriesSelect(series.seriesCode)}
              />
            </motion.div>
          ))}
        </div>

        {filteredSeries.length === 0 && (
          <div className="text-center py-8 text-surface-500">
            No series found matching "{searchFilter}"
          </div>
        )}
      </div>
    );
  }

  // --- Render: Model Selection ---
  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={handleBack} className="p-2 rounded-lg hover:bg-surface-700/50 text-surface-400 hover:text-surface-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <StepHeader
          step={2}
          title="Choose Model"
          subtitle={seriesData ? `${seriesData.seriesName} — select a model` : 'Select a model'}
        />
      </div>

      {/* Quantity selector */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-surface-400">Quantity:</label>
        <input
          type="number"
          min="1"
          max="99"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
          className="input w-20 text-sm text-center"
        />
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
        <input
          type="text"
          placeholder="Search models..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="input w-full pl-10 text-sm"
        />
      </div>

      {/* Models grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredModels.map((model, i) => (
          <motion.div
            key={model.materialNumber}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <ModelCard
              modelName={model.modelName}
              materialNumber={model.materialNumber}
              baseEurCost={model.baseEurCost}
              factoryROE={factoryROE}
              onClick={() => handleModelSelect(model.materialNumber)}
            />
          </motion.div>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <div className="text-center py-8 text-surface-500">
          {seriesData ? 'No models found' : 'Loading models...'}
        </div>
      )}
    </div>
  );
}
