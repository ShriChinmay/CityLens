import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Download, Search, X } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Surface } from '../components/Surface';
import { FilterBar } from '../components/FilterBar';
import { DataTable, type Column } from '../components/DataTable';
import { IssueTypeBadge } from '../components/IssueTypeBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { ConfidenceMeter } from '../components/ConfidenceMeter';
import { EmptyState } from '../components/EmptyState';
import { fetchBuses, fetchEvents } from '../api/client';
import { buttonSecondaryClass, controlClass } from '../lib/ui';
import { cn } from '../lib/cn';
import { formatCoords, formatDateTime, formatId } from '../lib/format';
import type { Bus, EventFilters, RoadEvent } from '../types';

const INITIAL_FILTERS: EventFilters = {
  event_type: 'ALL',
  severity: 'ALL',
  bus_id: 'ALL',
};

export default function RoadIssues() {
  const [filters, setFilters] = useState<EventFilters>(INITIAL_FILTERS);
  const [events, setEvents] = useState<RoadEvent[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'confidence'>('newest');

  useEffect(() => {
    fetchBuses().then((res) => setBuses(res.buses));
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const res = await fetchEvents(filters);
    setEvents(res.events);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const busMap = useMemo(() => {
    const map: Record<string, Bus> = {};
    buses.forEach((bus) => {
      map[String(bus.id)] = bus;
    });
    return map;
  }, [buses]);

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? events.filter((event) => {
          const bus = busMap[String(event.bus_id)];
          return [event.event_type, event.severity, bus?.bus_number, String(event.id)]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedQuery));
        })
      : events;

    return [...filtered].sort((a, b) => {
      if (sort === 'confidence') return Number(b.confidence) - Number(a.confidence);
      const difference = new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
      return sort === 'newest' ? difference : -difference;
    });
  }, [busMap, events, query, sort]);

  const exportResults = () => {
    const rows = visibleEvents.map((event) => {
      const bus = busMap[String(event.bus_id)];
      return [
        event.id,
        event.event_type,
        event.severity,
        event.confidence,
        event.detected_at,
        bus?.bus_number ?? '',
        event.latitude,
        event.longitude,
      ];
    });
    const csv = [
      ['Report ID', 'Issue type', 'Severity', 'Confidence', 'Reported at', 'Vehicle', 'Latitude', 'Longitude'],
      ...rows,
    ]
      .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'citylens-road-issues.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<RoadEvent>[] = [
    {
      key: 'type',
      header: 'Issue type',
      render: (event) => <IssueTypeBadge type={event.event_type} />,
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (event) => <SeverityBadge severity={event.severity} />,
    },
    {
      key: 'confidence',
      header: 'Detection confidence',
      render: (event) => <ConfidenceMeter value={event.confidence} />,
    },
    {
      key: 'reported',
      header: 'Reported',
      render: (event) => (
        <span className="text-ink-muted">{formatDateTime(event.detected_at)}</span>
      ),
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (event) => {
        const bus = busMap[String(event.bus_id)];
        if (bus) {
          return (
            <Link
              to={`/buses/${bus.id}`}
              className="font-medium text-ink transition-colors hover:text-brand"
            >
              {bus.bus_number}
            </Link>
          );
        }
        return (
          <span className="font-mono text-xs text-ink-subtle">{formatId(event.bus_id)}</span>
        );
      },
    },
    {
      key: 'location',
      header: 'Location',
      render: (event) => (
        <span className="font-mono text-xs text-ink-muted">
          {formatCoords(event.latitude, event.longitude)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (event) => (
        <Link
          to={`/events/${event.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand transition-colors hover:text-brand-hover"
        >
          View
          <ChevronRight size={13} aria-hidden="true" />
        </Link>
      ),
    },
  ];

  const criticalCount = useMemo(() => events.filter((e) => e.severity === 'CRITICAL').length, [events]);
  const highCount = useMemo(() => events.filter((e) => e.severity === 'HIGH').length, [events]);
  const mediumCount = useMemo(() => events.filter((e) => e.severity === 'MEDIUM').length, [events]);
  const lowCount = useMemo(() => events.filter((e) => e.severity === 'LOW').length, [events]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Road Issues & Telemetry"
        description="Comprehensive audit log of surface distress, potholes, waterlogging, and hazards detected across Delhi NCR."
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {visibleEvents.length} Active Records
            </span>
          </div>
        }
      />

      {/* Severity breakdown pills */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, severity: prev.severity === 'CRITICAL' ? 'ALL' : 'CRITICAL' }))}
          className={cn(
            'flex items-center justify-between rounded-xl border p-3 text-left transition-all',
            filters.severity === 'CRITICAL'
              ? 'border-red-500 bg-red-500/10 shadow-sm'
              : 'border-line bg-surface hover:border-line-strong'
          )}
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Critical Hazards</div>
            <div className="mt-1 text-xl font-bold text-red-500">{criticalCount}</div>
          </div>
          <span className="h-2 w-2 rounded-full bg-red-500" />
        </button>

        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, severity: prev.severity === 'HIGH' ? 'ALL' : 'HIGH' }))}
          className={cn(
            'flex items-center justify-between rounded-xl border p-3 text-left transition-all',
            filters.severity === 'HIGH'
              ? 'border-orange-500 bg-orange-500/10 shadow-sm'
              : 'border-line bg-surface hover:border-line-strong'
          )}
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">High Severity</div>
            <div className="mt-1 text-xl font-bold text-orange-500">{highCount}</div>
          </div>
          <span className="h-2 w-2 rounded-full bg-orange-500" />
        </button>

        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, severity: prev.severity === 'MEDIUM' ? 'ALL' : 'MEDIUM' }))}
          className={cn(
            'flex items-center justify-between rounded-xl border p-3 text-left transition-all',
            filters.severity === 'MEDIUM'
              ? 'border-amber-500 bg-amber-500/10 shadow-sm'
              : 'border-line bg-surface hover:border-line-strong'
          )}
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Medium Risk</div>
            <div className="mt-1 text-xl font-bold text-amber-500">{mediumCount}</div>
          </div>
          <span className="h-2 w-2 rounded-full bg-amber-500" />
        </button>

        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, severity: prev.severity === 'LOW' ? 'ALL' : 'LOW' }))}
          className={cn(
            'flex items-center justify-between rounded-xl border p-3 text-left transition-all',
            filters.severity === 'LOW'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
              : 'border-line bg-surface hover:border-line-strong'
          )}
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Low Severity</div>
            <div className="mt-1 text-xl font-bold text-emerald-500">{lowCount}</div>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        </button>
      </div>

      <FilterBar
        filters={filters}
        buses={buses}
        onChange={setFilters}
        onClear={() => setFilters(INITIAL_FILTERS)}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-xs">
        <div className="relative min-w-[240px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reports, issue type, vehicle number, or ID..."
            className={`${controlClass} w-full pl-9 pr-9`}
            aria-label="Search road issues"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center text-ink-subtle hover:text-ink"
              aria-label="Clear report search"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
          Sort
          <select
            className={controlClass}
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            aria-label="Sort reports"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="confidence">Highest confidence</option>
          </select>
        </label>
        <button type="button" className={buttonSecondaryClass} onClick={exportResults}>
          <Download size={14} aria-hidden="true" />
          Export CSV
        </button>
      </div>

      {loading ? (
        <Surface>
          <EmptyState variant="loading" title="Loading road issues…" />
        </Surface>
      ) : (
        <DataTable
          columns={columns}
          rows={visibleEvents}
          getRowKey={(event) => String(event.id)}
          empty={
            <EmptyState
              title="No road issues match"
              description={query ? `No reports match "${query}".` : 'Try clearing a filter or wait for new reports to arrive.'}
            />
          }
        />
      )}
    </div>
  );
}
