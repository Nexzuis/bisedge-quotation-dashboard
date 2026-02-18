import { motion } from 'framer-motion';
import { Truck } from 'lucide-react';
import { formatZAR } from '../../../engine/formatters';

interface ModelCardProps {
  modelName: string;
  materialNumber: string;
  baseEurCost: number;
  factoryROE: number;
  onClick: () => void;
}

export function ModelCard({ modelName, baseEurCost, factoryROE, onClick }: ModelCardProps) {
  const zarPrice = baseEurCost * factoryROE;

  return (
    <motion.button
      onClick={onClick}
      className="text-left w-full glass rounded-xl p-5 border border-surface-600 hover:border-feature-500/50 transition-colors group"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-feature-500/10 flex items-center justify-center flex-shrink-0">
          <Truck className="w-5 h-5 text-feature-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-surface-100 group-hover:text-feature-400 transition-colors">
            {modelName}
          </div>
          <div className="text-xs text-surface-400 mt-1 font-mono">
            Base: {formatZAR(zarPrice, false)}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
