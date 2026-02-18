import { useState } from 'react';
import { DndContext, DragOverlay, rectIntersection, type DragEndEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { PIPELINE_STAGES } from '../shared/stageConfig';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { useCompanies } from '../../../hooks/useCompanies';
import { useActivities } from '../../../hooks/useActivities';
import { useAuth } from '../../auth/AuthContext';
import { toast } from '../../ui/Toast';
import { staggerContainer } from '../shared/motionVariants';
import type { StoredCompany } from '../../../db/interfaces';
import type { PipelineStage } from '../../../types/crm';

interface KanbanBoardProps {
  companies: StoredCompany[];
  onRefresh: () => void;
}

export function KanbanBoard({ companies, onRefresh }: KanbanBoardProps) {
  const { updateStage } = useCompanies();
  const { logStageChange } = useActivities();
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const companyId = active.id as string;
    const targetStage = over.id as string;

    // Find the company
    const company = companies.find((c) => c.id === companyId);
    if (!company || company.pipelineStage === targetStage) return;

    try {
      await updateStage(companyId, targetStage as PipelineStage);
      await logStageChange(companyId, company.pipelineStage, targetStage, user?.id || '');
      toast.success(`Moved ${company.name} to ${targetStage.replace('-', ' ')}`);
      onRefresh();
    } catch (err) {
      console.error('Failed to update stage:', err);
      toast.error('Failed to update pipeline stage');
    }
  };

  const activeCompany = activeId ? companies.find((c) => c.id === activeId) : null;

  // Group companies by stage
  const byStage = new Map<string, StoredCompany[]>();
  for (const stage of PIPELINE_STAGES) {
    byStage.set(stage.key, []);
  }
  for (const company of companies) {
    const list = byStage.get(company.pipelineStage) || byStage.get('lead');
    if (list) list.push(company);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto pb-2">
        <motion.div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${PIPELINE_STAGES.length}, minmax(240px, 1fr))` }}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {PIPELINE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage.key}
              stage={stage}
              companies={byStage.get(stage.key) || []}
            />
          ))}
        </motion.div>
      </div>
      <DragOverlay>
        {activeCompany ? <KanbanCard company={activeCompany} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
