import {
  Pencil,
  Clock,
  Eye,
  Edit3,
  CheckCircle,
  XCircle,
  Send,
  Timer,
} from 'lucide-react';
import type { QuoteStatus } from '../../types/quote';

interface QuoteStatusBadgeProps {
  status: QuoteStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  QuoteStatus,
  { label: string; icon: typeof Pencil; bg: string; border: string; text: string; pulse?: boolean }
> = {
  draft: {
    label: 'Draft',
    icon: Pencil,
    bg: 'bg-surface-500/10',
    border: 'border-surface-500/30',
    text: 'text-surface-300',
  },
  'pending-approval': {
    label: 'Pending Approval',
    icon: Clock,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    pulse: true,
  },
  'in-review': {
    label: 'In Review',
    icon: Eye,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    pulse: true,
  },
  'changes-requested': {
    label: 'Changes Requested',
    icon: Edit3,
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
  },
  'sent-to-customer': {
    label: 'Sent to Customer',
    icon: Send,
    bg: 'bg-brand-500/10',
    border: 'border-brand-500/30',
    text: 'text-brand-400',
  },
  expired: {
    label: 'Expired',
    icon: Timer,
    bg: 'bg-surface-500/10',
    border: 'border-surface-500/30',
    text: 'text-surface-400',
  },
};

export function QuoteStatusBadge({ status, className = '' }: QuoteStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.border} ${config.text} ${className}`}
    >
      <Icon className={`w-3 h-3 ${config.pulse ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
}
