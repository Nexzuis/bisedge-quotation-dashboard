interface LeadScoreBadgeProps {
  buyProbability: number;
  aiConfidence?: number;
  compact?: boolean;
  className?: string;
}

export function LeadScoreBadge({ buyProbability, aiConfidence, compact = false, className = '' }: LeadScoreBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400 bg-green-500/20 border-green-500/30';
    if (score >= 5) return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    return 'text-surface-400 bg-surface-500/20 border-surface-500/30';
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 70) return 'text-green-400';
    if (conf >= 40) return 'text-amber-400';
    return 'text-surface-400';
  };

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border ${getScoreColor(buyProbability)} ${className}`}>
        {buyProbability}/10
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-bold border ${getScoreColor(buyProbability)}`}>
        {buyProbability}/10
      </span>
      {aiConfidence !== undefined && aiConfidence > 0 && (
        <span className={`text-xs ${getConfidenceColor(aiConfidence)}`}>
          {aiConfidence}% AI
        </span>
      )}
    </div>
  );
}
