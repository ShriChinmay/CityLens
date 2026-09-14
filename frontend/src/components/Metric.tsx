import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

type MetricTone = 'default' | 'brand' | 'positive' | 'warning' | 'critical';

const toneClasses: Record<MetricTone, string> = {
  default: 'text-ink',
  brand: 'text-brand',
  positive: 'text-low',
  warning: 'text-medium',
  critical: 'text-critical',
};

interface MetricProps {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: MetricTone;
  className?: string;
}

export function Metric({ label, value, note, tone = 'default', className }: MetricProps) {
  return (
    <div className={cn('px-5 py-4 transition-colors hover:bg-surface-2/30', className)}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">{label}</div>
      <div className={cn('mt-1.5 text-3xl font-bold tracking-tight leading-none tabular-nums', toneClasses[tone])}>
        {value}
      </div>
      {note && <div className="mt-1 text-xs text-ink-subtle">{note}</div>}
    </div>
  );
}
