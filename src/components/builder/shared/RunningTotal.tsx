import { motion, AnimatePresence } from 'framer-motion';
import { useQuoteStore } from '../../../store/useQuoteStore';
import { formatZAR } from '../../../engine/formatters';

export function RunningTotal() {
  const getQuoteTotals = useQuoteStore((s) => s.getQuoteTotals);
  const totals = getQuoteTotals();

  if (totals.unitCount === 0) return null;

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-surface-400">Units:</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={totals.unitCount}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="font-semibold text-surface-100"
          >
            {totals.unitCount}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="h-4 w-px bg-surface-700" />

      <div className="flex items-center gap-1.5">
        <span className="text-surface-400">Monthly:</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={Math.round(totals.totalMonthly)}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="font-semibold text-brand-400"
          >
            {formatZAR(totals.totalMonthly, false)}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="h-4 w-px bg-surface-700 hidden sm:block" />

      <div className="items-center gap-1.5 hidden sm:flex">
        <span className="text-surface-400">Contract:</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={Math.round(totals.totalContractValue)}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="font-semibold text-surface-100"
          >
            {formatZAR(totals.totalContractValue, false)}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
