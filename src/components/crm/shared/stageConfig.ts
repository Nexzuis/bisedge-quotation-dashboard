import type { PipelineStage } from '../../../types/crm';
import {
  CircleDot,
  Phone,
  MapPin,
  FileText,
  MessageSquare,
  Trophy,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface StageConfig {
  key: PipelineStage;
  label: string;
  color: string;       // Tailwind text color
  bgColor: string;     // Tailwind bg color for badge
  borderColor: string; // Tailwind border color
  icon: LucideIcon;
}

export const PIPELINE_STAGES: StageConfig[] = [
  {
    key: 'lead',
    label: 'Lead',
    color: 'text-surface-400',
    bgColor: 'bg-surface-500/20',
    borderColor: 'border-surface-500',
    icon: CircleDot,
  },
  {
    key: 'contacted',
    label: 'Contacted',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500',
    icon: Phone,
  },
  {
    key: 'site-assessment',
    label: 'Site Assessment',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500',
    icon: MapPin,
  },
  {
    key: 'quoted',
    label: 'Quoted',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/20',
    borderColor: 'border-teal-500',
    icon: FileText,
  },
  {
    key: 'negotiation',
    label: 'Negotiation',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500',
    icon: MessageSquare,
  },
  {
    key: 'won',
    label: 'Won',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500',
    icon: Trophy,
  },
  {
    key: 'lost',
    label: 'Lost',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500',
    icon: XCircle,
  },
];

export const STAGE_MAP = new Map(PIPELINE_STAGES.map((s) => [s.key, s]));

export function getStageConfig(stage: PipelineStage): StageConfig {
  return STAGE_MAP.get(stage) || PIPELINE_STAGES[0];
}
