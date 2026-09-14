import { cn } from '../lib/cn';
import { statusLabel } from '../lib/format';

const styles: Record<string, string> = {
  ACTIVE: 'border-low-line bg-low-soft text-low',
  MAINTENANCE: 'border-medium-line bg-medium-soft text-medium',
  INACTIVE: 'border-line bg-surface-2 text-ink-subtle',
};

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = (status ?? '').toUpperCase();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        styles[key] ?? 'border-line bg-surface-2 text-ink-muted',
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}
