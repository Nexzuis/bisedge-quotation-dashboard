import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'brand';
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'info', children, className = '' }: BadgeProps) {
  const variantClass = `badge-${variant}`;

  return <span className={`${variantClass} ${className}`}>{children}</span>;
}
