import type { PipelineStage } from '../../../types/crm';
import { getStageConfig } from './stageConfig';

interface PipelineStageBadgeProps {
  stage: PipelineStage;
  className?: string;
}

export function PipelineStageBadge({ stage, className = '' }: PipelineStageBadgeProps) {
  const config = getStageConfig(stage);
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
