import type { QualificationStatus } from '../../../types/leads';
import {
  Sparkles,
  Eye,
  CheckCircle2,
  XCircle,
  Phone,
  ArrowRightCircle,
  Clock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface LeadStatusConfig {
  key: QualificationStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: LucideIcon;
}

export const LEAD_STATUSES: LeadStatusConfig[] = [
  {
    key: 'new',
    label: 'New',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500',
    icon: Sparkles,
  },
  {
    key: 'reviewing',
    label: 'Reviewing',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500',
    icon: Eye,
  },
  {
    key: 'qualified',
    label: 'Qualified',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500',
    icon: CheckCircle2,
  },
  {
    key: 'rejected',
    label: 'Rejected',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500',
    icon: XCircle,
  },
  {
    key: 'contacted',
    label: 'Contacted',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/20',
    borderColor: 'border-teal-500',
    icon: Phone,
  },
  {
    key: 'converted',
    label: 'Converted',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500',
    icon: ArrowRightCircle,
  },
  {
    key: 'stale',
    label: 'Stale',
    color: 'text-surface-400',
    bgColor: 'bg-surface-500/20',
    borderColor: 'border-surface-500',
    icon: Clock,
  },
];

export const LEAD_STATUS_MAP = new Map(LEAD_STATUSES.map((s) => [s.key, s]));

export function getLeadStatusConfig(status: QualificationStatus): LeadStatusConfig {
  return LEAD_STATUS_MAP.get(status) || LEAD_STATUSES[0];
}
