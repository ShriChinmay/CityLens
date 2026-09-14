import type { ComponentType } from 'react';
import {
  CircleAlert,
  CircleDot,
  Construction,
  Droplets,
  TriangleAlert,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { issueTypeLabel } from '../lib/format';

type IconComponent = ComponentType<{ size?: string | number; className?: string }>;

const typeIcons: Record<string, IconComponent> = {
  POTHOLE: CircleDot,
  DAMAGED_ROAD: Construction,
  WATERLOGGING: Droplets,
  ACCIDENT: TriangleAlert,
};

interface IssueTypeBadgeProps {
  type?: string | null;
  className?: string;
  showIcon?: boolean;
}

export function IssueTypeBadge({ type, className, showIcon = true }: IssueTypeBadgeProps) {
  const key = (type ?? '').toUpperCase();
  const Icon = typeIcons[key] ?? CircleAlert;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-muted',
        className
      )}
    >
      {showIcon && <Icon size={11} className="shrink-0 text-ink-subtle" />}
      <span>{issueTypeLabel(type)}</span>
    </span>
  );
}
