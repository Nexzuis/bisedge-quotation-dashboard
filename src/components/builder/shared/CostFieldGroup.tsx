import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface CostField {
  key: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}

interface CostFieldGroupProps {
  title: string;
  fields: CostField[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function CostFieldGroup({ title, fields, collapsible = false, defaultOpen = true }: CostFieldGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const content = (
    <div className="space-y-2">
      {fields.map((field) => (
        <div key={field.key} className="flex items-center gap-3">
          <label className="text-sm text-surface-400 w-40 flex-shrink-0">
            {field.label}
          </label>
          <div className="flex items-center gap-1 flex-1">
            <span className="text-xs text-surface-500">R</span>
            <input
              type="number"
              min="0"
              step={field.step || 100}
              value={field.value || ''}
              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="input w-full text-sm"
            />
          </div>
        </div>
      ))}
    </div>
  );

  if (!collapsible) {
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-surface-500 uppercase">{title}</h4>
        {content}
      </div>
    );
  }

  return (
    <div className="border border-surface-700/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-800/20 hover:bg-surface-800/40 transition-colors"
      >
        <span className="text-xs font-bold text-surface-500 uppercase">{title}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-surface-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4">{content}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
