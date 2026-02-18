import { motion, AnimatePresence } from 'framer-motion';
import { useQuoteStore } from '../../../store/useQuoteStore';
import { formatZAR } from '../../../engine/formatters';
import type { SlotIndex } from '../../../types/quote';

interface LivePricingPreviewProps {
  slotIndex: SlotIndex;
}

export function LivePricingPreview({ slotIndex }: LivePricingPreviewProps) {
  const getSlotPricing = useQuoteStore((s) => s.getSlotPricing);
  const pricing = getSlotPricing(slotIndex);

  if (!pricing) return null;

  const items = [
    { label: 'Landed Cost', value: pricing.landedCostZAR, color: 'text-surface-200' },
    { label: 'Selling Price', value: pricing.sellingPriceZAR, color: 'text-brand-400' },
    { label: 'Margin', value: pricing.margin, color: pricing.margin >= 25 ? 'text-green-400' : pricing.margin >= 15 ? 'text-yellow-400' : 'text-red-400', isPercent: true },
    { label: 'Lease Rate', value: pricing.leaseRate, color: 'text-surface-200', suffix: '/mo' },
    { label: 'Maintenance', value: pricing.maintenanceMonthly, color: 'text-surface-200', suffix: '/mo' },
    { label: 'Total Monthly', value: pricing.totalMonthly, color: 'text-brand-400', suffix: '/mo', highlight: true },
    { label: 'Cost/Hour', value: pricing.costPerHour, color: 'text-surface-200' },
  ];

  return (
    <div className="mt-6 p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
      <h4 className="text-xs font-bold text-surface-500 uppercase mb-3">Live Pricing Preview</h4>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center justify-between ${item.highlight ? 'pt-2 border-t border-surface-700/50' : ''}`}
          >
            <span className={`text-sm ${item.highlight ? 'font-semibold text-surface-200' : 'text-surface-400'}`}>
              {item.label}
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={Math.round(item.value * 100)}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className={`text-sm font-mono font-semibold ${item.color}`}
              >
                {item.isPercent
                  ? `${item.value.toFixed(1)}%`
                  : `${formatZAR(item.value, false)}${item.suffix || ''}`
                }
              </motion.span>
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
