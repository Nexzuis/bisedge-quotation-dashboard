import { motion } from 'framer-motion';
import { useQuoteStore } from '../../../store/useQuoteStore';
import { useBuilder } from '../BuilderContext';

export function UnitTabs() {
  const slots = useQuoteStore((s) => s.slots);
  const { activeUnitTab, setActiveUnitTab } = useBuilder();
  const activeSlots = slots.filter((s) => !s.isEmpty && s.modelCode !== '0');

  if (activeSlots.length <= 1) return null;

  return (
    <div className="flex gap-1 mb-4 bg-surface-800/50 rounded-lg p-1 overflow-x-auto">
      {activeSlots.map((slot, i) => (
        <button
          key={slot.slotIndex}
          onClick={() => setActiveUnitTab(i)}
          className={`relative px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
            activeUnitTab === i
              ? 'text-brand-400'
              : 'text-surface-400 hover:text-surface-200'
          }`}
        >
          {activeUnitTab === i && (
            <motion.div
              layoutId="activeUnitTab"
              className="absolute inset-0 bg-surface-700/50 rounded-md"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <span className="relative z-10">Unit {i + 1}: {slot.modelName}</span>
        </button>
      ))}
    </div>
  );
}
