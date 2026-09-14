import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, RefreshCw, Search, X } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Surface } from '../components/Surface';
import { Metric } from '../components/Metric';
import { DataTable, type Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { fetchBuses, fetchCameras } from '../api/client';
import { controlClass, buttonSecondaryClass } from '../lib/ui';
import { cn } from '../lib/cn';
import { formatDate } from '../lib/format';
import type { Bus, Camera } from '../types';

export default function Vehicles() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'MAINTENANCE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [busesRes, camerasRes] = await Promise.all([fetchBuses(), fetchCameras()]);
    setBuses(busesRes.buses);
    setCameras(camerasRes.cameras);
    setLoading(false);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setTimeout(() => setRefreshing(false), 500);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cameraCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    cameras.forEach((camera) => {
      const key = String(camera.bus_id);
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [cameras]);

  const activeCount = buses.filter(
    (bus) => String(bus.status).toUpperCase() === 'ACTIVE'
  ).length;
  const maintenanceCount = buses.filter(
    (bus) => String(bus.status).toUpperCase() === 'MAINTENANCE'
  ).length;

  const query = search.trim().toLowerCase();
  const filteredBuses = useMemo(() => {
    return buses.filter((bus) => {
      if (statusFilter !== 'ALL' && String(bus.status).toUpperCase() !== statusFilter) {
        return false;
      }
      if (query) {
        return [bus.bus_number, bus.operator, bus.model]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      }
      return true;
    });
  }, [buses, query, statusFilter]);

  const columns: Column<Bus>[] = [
    {
      key: 'vehicle',
      header: 'Vehicle Identifier',
      render: (bus) => (
        <Link
          to={`/buses/${bus.id}`}
          className="font-semibold text-ink transition-colors hover:text-brand"
        >
          {bus.bus_number}
        </Link>
      ),
    },
    {
      key: 'operator',
      header: 'Operator Agency',
      render: (bus) => <span className="text-ink-muted">{bus.operator ?? '—'}</span>,
    },
    {
      key: 'model',
      header: 'Chassis / Model',
      render: (bus) => <span className="text-ink-muted">{bus.model ?? '—'}</span>,
    },
    {
      key: 'cameras',
      header: 'Vision Nodes',
      render: (bus) => (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          {cameraCounts[String(bus.id)] ?? 0} cameras
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Fleet Status',
      render: (bus) => <StatusBadge status={bus.status} />,
    },
    {
      key: 'added',
      header: 'Enrollment Date',
      render: (bus) => <span className="text-ink-muted text-xs">{formatDate(bus.created_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (bus) => (
        <Link
          to={`/buses/${bus.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand transition-colors hover:text-brand-hover"
        >
          Inspect
          <ChevronRight size={13} aria-hidden="true" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transit Fleet Telemetry"
        description="Public transport vehicles fitted with edge AI vision sensors streaming continuous road observations."
        actions={
          <button
            type="button"
            className={buttonSecondaryClass}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={cn('text-ink-muted', refreshing && 'animate-spin')} />
            Refresh Fleet
          </button>
        }
      />

      <Surface className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Metric label="Enrolled Fleet" value={buses.length} note="Buses configured in NCR" />
        <Metric label="Active in Transit" value={activeCount} tone="positive" note="Streaming edge AI feeds" />
        <Metric label="Under Maintenance" value={maintenanceCount} tone="warning" note="Depot service scheduled" />
      </Surface>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 shadow-xs">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              statusFilter === 'ALL'
                ? 'bg-ink text-canvas shadow-xs'
                : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
            )}
          >
            All Fleet ({buses.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
            )}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('MAINTENANCE')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              statusFilter === 'MAINTENANCE'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
            )}
          >
            Maintenance ({maintenanceCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search bus number, operator..."
            aria-label="Search vehicles"
            className={`${controlClass} w-full pl-9 pr-9`}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center text-ink-subtle hover:text-ink"
              aria-label="Clear search"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <Surface>
          <EmptyState variant="loading" title="Loading fleet registry…" />
        </Surface>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredBuses}
          getRowKey={(bus) => String(bus.id)}
          empty={
            <EmptyState
              title="No vehicles found"
              description={
                search
                  ? `No vehicles match "${search}".`
                  : 'No vehicles match the selected fleet status.'
              }
            />
          }
        />
      )}
    </div>
  );
}
