import { LayoutGrid, List } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCrmStore } from '../../../store/useCrmStore';

export function ViewToggle() {
  const viewMode = useCrmStore((s) => s.viewMode);
  const setViewMode = useCrmStore((s) => s.setViewMode);

  return (
    <div className="flex bg-surface-800/50 border border-surface-600 rounded-lg p-0.5 relative">
      <button
        onClick={() => setViewMode('kanban')}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors z-10 ${
          viewMode === 'kanban'
            ? 'text-white'
            : 'text-surface-400 hover:text-surface-200'
        }`}
      >
        {viewMode === 'kanban' && (
          <motion.div
            layoutId="viewMode"
            className="absolute inset-0 bg-brand-600 rounded-md"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <LayoutGrid className="w-4 h-4 relative z-10" />
        <span className="relative z-10">Kanban</span>
      </button>
      <button
        onClick={() => setViewMode('table')}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors z-10 ${
          viewMode === 'table'
            ? 'text-white'
            : 'text-surface-400 hover:text-surface-200'
        }`}
      >
        {viewMode === 'table' && (
          <motion.div
            layoutId="viewMode"
            className="absolute inset-0 bg-brand-600 rounded-md"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <List className="w-4 h-4 relative z-10" />
        <span className="relative z-10">Table</span>
      </button>
    </div>
  );
}
