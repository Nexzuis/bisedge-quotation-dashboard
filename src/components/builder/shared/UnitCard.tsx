import { motion } from 'framer-motion';
import { Pencil, Trash2, Truck } from 'lucide-react';
import { useQuoteStore } from '../../../store/useQuoteStore';
import { formatZAR } from '../../../engine/formatters';
import type { SlotIndex } from '../../../types/quote';

interface UnitCardProps {
  slotIndex: SlotIndex;
  onEdit: () => void;
  onRemove: () => void;
}

export function UnitCard({ slotIndex, onEdit, onRemove }: UnitCardProps) {
  const slot = useQuoteStore((s) => s.slots[slotIndex]);
  const factoryROE = useQuoteStore((s) => s.factoryROE);
  const getSlotPricing = useQuoteStore((s) => s.getSlotPricing);
  const pricing = getSlotPricing(slotIndex);

  if (slot.isEmpty) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass rounded-xl p-4 border border-brand-500/20"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <div className="text-sm font-semibold text-surface-100">{slot.modelName || 'Unknown Model'}</div>
            <div className="text-xs text-surface-400">{slot.seriesCode ? `Series ${slot.seriesCode.slice(0, 4)}` : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-surface-700/50 text-surface-400 hover:text-brand-400 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-surface-700/50 text-surface-400 hover:text-danger transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-surface-500">Qty</span>
          <div className="font-semibold text-surface-200">{slot.quantity}</div>
        </div>
        <div>
          <span className="text-surface-500">Base Price</span>
          <div className="font-mono text-surface-200">{formatZAR(slot.eurCost * factoryROE, false)}</div>
        </div>
        <div>
          <span className="text-surface-500">Monthly</span>
          <div className="font-mono text-brand-400">{pricing ? formatZAR(pricing.totalMonthly, false) : '--'}</div>
        </div>
      </div>
    </motion.div>
  );
}
