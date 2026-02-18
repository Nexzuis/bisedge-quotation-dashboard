import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div className={`card ${hover ? 'card-hover' : ''} ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  icon?: LucideIcon;
  title: string;
  action?: ReactNode;
}

export function CardHeader({ icon: Icon, title, action }: CardHeaderProps) {
  return (
    <div className="panel-header">
      <div className="panel-title">
        {Icon && <Icon className="w-5 h-5 text-brand-500" />}
        <span>{title}</span>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`panel-body ${className}`}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return <div className={`panel-footer ${className}`}>{children}</div>;
}
