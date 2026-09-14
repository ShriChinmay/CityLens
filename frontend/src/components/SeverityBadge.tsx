import { AlertCircle, AlertTriangle, CheckCircle, OctagonAlert } from 'lucide-react';
import { cn } from '../lib/cn';
import { severityLabel } from '../lib/format';

interface SeverityConfig {
  style: string;
  icon: typeof AlertCircle;
}

const severityConfig: Record<string, SeverityConfig> = {
  CRITICAL: {
    style: 'border-critical/30 bg-critical/10 text-critical',
    icon: OctagonAlert,
  },
  HIGH: {
    style: 'border-high/30 bg-high/10 text-high',
    icon: AlertTriangle,
  },
  MEDIUM: {
    style: 'border-medium/30 bg-medium/10 text-medium',
    icon: AlertCircle,
  },
  LOW: {
    style: 'border-low/30 bg-low/10 text-low',
    icon: CheckCircle,
  },
};

interface SeverityBadgeProps {
  severity?: string | null;
  className?: string;
  showIcon?: boolean;
}

export function SeverityBadge({ severity, className, showIcon = true }: SeverityBadgeProps) {
  const key = (severity ?? '').toUpperCase();
  const config = severityConfig[key] ?? {
    style: 'border-line bg-surface-2 text-ink-muted',
    icon: AlertCircle,
  };
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium tracking-tight',
        config.style,
        className
      )}
    >
      {showIcon && <Icon size={11} className="shrink-0" aria-hidden="true" />}
      <span>{severityLabel(severity)}</span>
    </span>
  );
}
