import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PipelineStageBadge } from '../shared/PipelineStageBadge';
import { formatZAR } from '../../../engine/formatters';
import { fadeInUp } from '../shared/motionVariants';
import type { StoredCompany } from '../../../db/interfaces';
import type { PipelineStage } from '../../../types/crm';

interface CustomerTableRowProps {
  company: StoredCompany;
  selected?: boolean;
  onToggle?: (id: string) => void;
  userNameMap?: Record<string, string>;
}

export function CustomerTableRow({ company, selected, onToggle, userNameMap }: CustomerTableRowProps) {
  const navigate = useNavigate();

  return (
    <motion.tr
      variants={fadeInUp}
      whileHover={{ backgroundColor: 'rgba(0, 212, 255, 0.04)' }}
      onClick={() => navigate(`/customers/${company.id}`)}
      className="border-b border-surface-700/30 hover:bg-surface-700/20 transition-colors cursor-pointer"
    >
      {onToggle !== undefined && (
        <td className="px-4 py-3 w-10" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={() => onToggle(company.id)}
            className="accent-brand-500"
          />
        </td>
      )}
      <td className="px-4 py-3 text-sm text-surface-100 font-medium">{company.name}</td>
      <td className="px-4 py-3">
        <PipelineStageBadge stage={company.pipelineStage as PipelineStage} />
      </td>
      <td className="px-4 py-3 text-sm text-surface-300">
        {company.estimatedValue > 0 ? formatZAR(company.estimatedValue, false) : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-surface-400">{(company.assignedTo && userNameMap?.[company.assignedTo]) || company.assignedTo || '—'}</td>
      <td className="px-4 py-3 text-xs text-surface-500">
        {new Date(company.updatedAt).toLocaleDateString('en-ZA')}
      </td>
      <td className="px-4 py-3 text-xs text-surface-500">
        {new Date(company.createdAt).toLocaleDateString('en-ZA')}
      </td>
    </motion.tr>
  );
}
