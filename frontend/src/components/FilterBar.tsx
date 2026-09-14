import { X } from 'lucide-react';
import type { Bus, EventFilters } from '../types';
import { selectClass, buttonSecondaryClass } from '../lib/ui';

interface FilterBarProps {
  filters: EventFilters;
  buses?: Bus[];
  onChange: (filters: EventFilters) => void;
  onClear: () => void;
}

export function FilterBar({ filters, buses = [], onChange, onClear }: FilterBarProps) {
  const update = (field: keyof EventFilters, value: string) => {
    onChange({ ...filters, [field]: value });
  };

  const hasActiveFilters =
    (filters.event_type && filters.event_type !== 'ALL') ||
    (filters.severity && filters.severity !== 'ALL') ||
    (filters.bus_id && filters.bus_id !== 'ALL');

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface px-4 py-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-type" className="text-xs font-medium text-ink-subtle">
          Issue type
        </label>
        <select
          id="filter-type"
          className={selectClass}
          value={filters.event_type ?? 'ALL'}
          onChange={(event) => update('event_type', event.target.value)}
        >
          <option value="ALL">All types</option>
          <option value="POTHOLE">Pothole</option>
          <option value="DAMAGED_ROAD">Damaged road</option>
          <option value="WATERLOGGING">Waterlogging</option>
          <option value="ACCIDENT">Accident</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-severity" className="text-xs font-medium text-ink-subtle">
          Severity
        </label>
        <select
          id="filter-severity"
          className={selectClass}
          value={filters.severity ?? 'ALL'}
          onChange={(event) => update('severity', event.target.value)}
        >
          <option value="ALL">All severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      {buses.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-bus" className="text-xs font-medium text-ink-subtle">
            Vehicle
          </label>
          <select
            id="filter-bus"
            className={selectClass}
            value={String(filters.bus_id ?? 'ALL')}
            onChange={(event) => update('bus_id', event.target.value)}
          >
            <option value="ALL">All vehicles</option>
            {buses.map((bus) => (
              <option key={String(bus.id)} value={String(bus.id)}>
                {bus.bus_number}
              </option>
            ))}
          </select>
        </div>
      )}

      {hasActiveFilters && (
        <button type="button" className={`${buttonSecondaryClass} ml-auto`} onClick={onClear}>
          <X size={14} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}
