import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface SurfaceProps {
  children: ReactNode;
  className?: string;
}

export function Surface({ children, className }: SurfaceProps) {
  return (
    <div className={cn('rounded-lg border border-line bg-surface shadow-xs overflow-hidden', className)}>
      {children}
    </div>
  );
}

interface SurfaceHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SurfaceHeader({ title, subtitle, action, className }: SurfaceHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-b border-line px-5 py-4 bg-surface',
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
