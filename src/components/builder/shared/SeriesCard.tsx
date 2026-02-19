import { motion } from 'framer-motion';
import { Package } from 'lucide-react';

interface SeriesCardProps {
  seriesCode: string;
  seriesName: string;
  modelCount: number;
  onClick: () => void;
}

export function SeriesCard({ seriesCode: _seriesCode, seriesName, modelCount, onClick }: SeriesCardProps) {
  return (
    <motion.button
      onClick={onClick}
      className="text-left w-full glass rounded-xl p-5 border border-surface-600 hover:border-brand-500/50 transition-colors group"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
          <Package className="w-5 h-5 text-brand-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-surface-100 group-hover:text-brand-400 transition-colors truncate">
            {seriesName}
          </div>
          <div className="text-xs text-surface-500 mt-0.5">
            {modelCount} model{modelCount !== 1 ? 's' : ''} available
          </div>
        </div>
      </div>
    </motion.button>
  );
}
