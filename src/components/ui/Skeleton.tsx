import React from 'react';

interface SkeletonProps {
  className?: string;
}

/**
 * Skeleton loading placeholder component
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-surface-700/50 rounded ${className}`} />
  );
};

/**
 * Skeleton panel for loading states
 */
export const SkeletonPanel: React.FC = () => {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
};
