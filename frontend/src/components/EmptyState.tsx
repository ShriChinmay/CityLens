import type { ReactNode } from 'react';
import { CircleAlert, Inbox, RefreshCw } from 'lucide-react';
import { cn } from '../lib/cn';

type EmptyVariant = 'empty' | 'loading' | 'error';

interface EmptyStateProps {
  variant?: EmptyVariant;
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({
  variant = 'empty',
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  if (variant === 'loading') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 px-6 py-14 text-center',
          className
        )}
      >
        <RefreshCw size={22} className="animate-spin text-brand" aria-hidden="true" />
        <p className="text-sm text-ink-muted">{title ?? 'Loading…'}</p>
      </div>
    );
  }

  const isError = variant === 'error';
  const defaultIcon = isError ? (
    <CircleAlert size={22} aria-hidden="true" />
  ) : (
    <Inbox size={22} aria-hidden="true" />
  );

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-6 py-14 text-center',
        className
      )}
    >
      <div
        className={cn(
          'mb-1 flex h-11 w-11 items-center justify-center rounded-full',
          isError ? 'bg-critical-soft text-critical' : 'bg-surface-2 text-ink-subtle'
        )}
      >
        {icon ?? defaultIcon}
      </div>
      <h3 className="text-sm font-semibold text-ink">
        {title ?? (isError ? 'Something went wrong' : 'Nothing to show')}
      </h3>
      {description && (
        <p className="max-w-md text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
