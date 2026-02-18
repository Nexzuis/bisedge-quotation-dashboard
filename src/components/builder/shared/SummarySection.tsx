import { motion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

interface SummarySectionProps {
  title: string;
  children: ReactNode;
  onEdit?: () => void;
  editLabel?: string;
}

export function SummarySection({ title, children, onEdit, editLabel }: SummarySectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5 border border-surface-700/30"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-surface-200">{title}</h3>
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            {editLabel || 'Edit'}
          </button>
        )}
      </div>
      {children}
    </motion.div>
  );
}
