import { cn } from '../lib/cn';
import { confidencePercent } from '../lib/format';
import type { Numeric } from '../types';

interface ConfidenceMeterProps {
  value?: Numeric | null;
  className?: string;
}

export function ConfidenceMeter({ value, className }: ConfidenceMeterProps) {
  const percent = confidencePercent(value);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${percent}%` }}
          aria-hidden="true"
        />
      </div>
      <span className="text-xs tabular-nums text-ink-muted">{percent}%</span>
    </div>
  );
}
