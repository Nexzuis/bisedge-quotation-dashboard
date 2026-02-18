import type { ReactNode } from 'react';
import { CornerBrackets } from './CornerBrackets';
import { DotGrid } from './DotGrid';

interface PanelProps {
  children: ReactNode;
  accent?: 'brand' | 'feature' | 'none';
  className?: string;
}

export function Panel({ children, accent = 'none', className = '' }: PanelProps) {
  const accentClass =
    accent === 'brand'
      ? 'glass-brand'
      : accent === 'feature'
      ? 'glass-feature'
      : 'glass';

  return (
    <div className={`panel ${accentClass} relative ${className}`} role="region">
      <CornerBrackets accent={accent} />
      <DotGrid />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
