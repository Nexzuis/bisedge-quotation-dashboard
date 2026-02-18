import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { formatZAR } from '../../../engine/formatters';

interface OptionRowProps {
  description: string;
  isSelected: boolean;
  isStandard: boolean;
  availabilityLevel: 0 | 1 | 2 | 3;
  eurPrice: number;
  factoryROE: number;
  onToggle: () => void;
  delay?: number;
  notes?: string;
}

function getAvailBadge(level: number): { label: string; variant: 'success' | 'info' | 'warning' | 'danger' } {
  switch (level) {
    case 1: return { label: 'Standard', variant: 'success' };
    case 2: return { label: 'Optional', variant: 'info' };
    case 3: return { label: 'Non-Standard', variant: 'warning' };
    default: return { label: 'N/A', variant: 'danger' };
  }
}

export function OptionRow({ description, isSelected, isStandard, availabilityLevel, eurPrice, factoryROE, onToggle, delay = 0, notes }: OptionRowProps) {
  const badge = getAvailBadge(availabilityLevel);
  const zarPrice = eurPrice * factoryROE;

  return (
    <motion.label
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={`flex items-start gap-3 py-2 px-2 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-brand-500/5' : 'hover:bg-surface-800/30'
      } ${isStandard ? 'opacity-70' : ''}`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        disabled={isStandard}
        className="w-4 h-4 mt-0.5 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500/50 disabled:opacity-50 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-surface-300 truncate block">{description}</span>
        {notes && (
          <span className="text-xs text-surface-500 italic block mt-0.5">{notes}</span>
        )}
      </div>
      <Badge variant={badge.variant} className="text-2xs flex-shrink-0">{badge.label}</Badge>
      {availabilityLevel >= 2 && eurPrice > 0 && (
        <span className="text-xs font-mono text-brand-400 flex-shrink-0">
          +{formatZAR(zarPrice, false)}
        </span>
      )}
      {availabilityLevel === 3 && (
        <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
      )}
    </motion.label>
  );
}
