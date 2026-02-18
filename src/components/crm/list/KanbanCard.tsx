import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatZAR } from '../../../engine/formatters';
import type { StoredCompany } from '../../../db/interfaces';

interface KanbanCardProps {
  company: StoredCompany;
}

export function KanbanCard({ company }: KanbanCardProps) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: company.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const handleClick = () => {
    // Don't navigate if we just finished dragging
    if (!isDragging) {
      navigate(`/customers/${company.id}`);
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.3 : 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
      transition={{ duration: 0.2 }}
      className="bg-surface-800/60 border border-surface-700/50 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-surface-600 transition-colors"
    >
      <div className="text-sm font-medium text-surface-100 truncate">{company.name}</div>
      {company.estimatedValue > 0 && (
        <div className="text-xs text-brand-400 mt-1">{formatZAR(company.estimatedValue, false)}</div>
      )}
      {company.tags && company.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {company.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-surface-700/50 text-surface-400 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
