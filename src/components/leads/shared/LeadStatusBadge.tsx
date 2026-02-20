import type { QualificationStatus } from '../../../types/leads';
import { getLeadStatusConfig } from './leadStatusConfig';

interface LeadStatusBadgeProps {
  status: QualificationStatus;
  className?: string;
}

export function LeadStatusBadge({ status, className = '' }: LeadStatusBadgeProps) {
  const config = getLeadStatusConfig(status);
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color} ${className}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
