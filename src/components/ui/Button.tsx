import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'feature';
  icon?: LucideIcon;
  children: ReactNode;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  icon: Icon,
  children,
  loading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const variantClass = `btn-${variant}`;

  return (
    <button
      className={`${variantClass} inline-flex items-center gap-2 ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <div className="spinner" />}
      {!loading && Icon && <Icon className="w-4 h-4" />}
      <span>{children}</span>
    </button>
  );
}
