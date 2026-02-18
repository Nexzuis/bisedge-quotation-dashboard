import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { KanbanCard } from './KanbanCard';
import { fadeInUp } from '../shared/motionVariants';
import type { StageConfig } from '../shared/stageConfig';
import type { StoredCompany } from '../../../db/interfaces';

interface KanbanColumnProps {
  stage: StageConfig;
  companies: StoredCompany[];
}

export function KanbanColumn({ stage, companies }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });

  return (
    <motion.div
      ref={setNodeRef}
      variants={fadeInUp}
      className={`flex flex-col ${isOver ? 'ring-2 ring-brand-500/50 rounded-xl' : ''}`}
    >
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl border-t-2 ${stage.borderColor} bg-surface-800/40`}>
        <stage.icon className={`w-4 h-4 ${stage.color}`} />
        <span className={`text-sm font-semibold ${stage.color}`}>{stage.label}</span>
        <span className="ml-auto text-xs text-surface-500 bg-surface-700/50 px-1.5 py-0.5 rounded-full">
          {companies.length}
        </span>
      </div>
      <div className="flex-1 p-2 space-y-2 bg-surface-800/20 rounded-b-xl min-h-[120px]">
        <SortableContext items={companies.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {companies.map((company) => (
            <KanbanCard key={company.id} company={company} />
          ))}
        </SortableContext>
      </div>
    </motion.div>
  );
}
