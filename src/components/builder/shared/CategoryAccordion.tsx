import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface CategoryAccordionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CategoryAccordion({ title, count, defaultOpen = false, children }: CategoryAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-surface-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-800/30 hover:bg-surface-800/50 transition-colors"
      >
        <span className="text-sm font-semibold text-surface-300">{title}</span>
        <div className="flex items-center gap-2">
          {count !== undefined && (
            <span className="text-xs text-surface-500">{count} options</span>
          )}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-surface-500" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div className="px-4 py-2 space-y-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
