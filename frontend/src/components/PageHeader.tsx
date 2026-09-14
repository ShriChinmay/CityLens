import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span>CityLens Platform</span>
        </div>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 max-w-2xl text-xs text-ink-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}
