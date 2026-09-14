import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  className?: string;
}

function alignClass(align?: 'left' | 'right' | 'center'): string {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  empty,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className={cn('overflow-hidden rounded-lg border border-line bg-surface shadow-xs', className)}>
        {empty}
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-surface shadow-xs', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2/75">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted',
                    alignClass(column.align),
                    column.headerClassName
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  'transition-colors duration-150',
                  onRowClick
                    ? 'cursor-pointer hover:bg-surface-2/60 focus-visible:bg-surface-2/60'
                    : 'hover:bg-surface-2/30'
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn('px-5 py-3.5 align-middle text-ink', alignClass(column.align), column.className)}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
