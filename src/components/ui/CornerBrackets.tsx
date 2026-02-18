interface CornerBracketsProps {
  accent?: 'brand' | 'feature' | 'none';
}

export function CornerBrackets({ accent = 'none' }: CornerBracketsProps) {
  const colorClass =
    accent === 'brand'
      ? 'border-brand-500/30'
      : accent === 'feature'
      ? 'border-feature-500/30'
      : 'border-surface-600/30';

  return (
    <>
      <div
        className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 ${colorClass} pointer-events-none z-0`}
      />
      <div
        className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 ${colorClass} pointer-events-none z-0`}
      />
    </>
  );
}
