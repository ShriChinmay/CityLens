import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera as CameraIcon, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Surface } from '../components/Surface';
import { Metric } from '../components/Metric';
import { DataTable, type Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { fetchBuses, fetchCameras } from '../api/client';
import { buttonSecondaryClass } from '../lib/ui';
import { cn } from '../lib/cn';
import { formatDate, positionLabel } from '../lib/format';
import type { Bus, Camera } from '../types';

const POSITIONS = ['ALL', 'FRONT', 'REAR', 'SIDE', 'CABIN'] as const;

export default function Cameras() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [position, setPosition] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [camerasRes, busesRes] = await Promise.all([fetchCameras(), fetchBuses()]);
    setCameras(camerasRes.cameras);
    setBuses(busesRes.buses);
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

  const busMap = useMemo(() => {
    const map: Record<string, Bus> = {};
    buses.forEach((bus) => {
      map[String(bus.id)] = bus;
    });
    return map;
  }, [buses]);

  const positionCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: cameras.length };
    cameras.forEach((cam) => {
      const pos = String(cam.position).toUpperCase();
      counts[pos] = (counts[pos] ?? 0) + 1;
    });
    return counts;
  }, [cameras]);

  const filteredCameras = useMemo(() => {
    if (position === 'ALL') return cameras;
    return cameras.filter(
      (camera) => String(camera.position).toUpperCase() === position
    );
  }, [cameras, position]);

  const activeCount = cameras.filter(
    (camera) => String(camera.status).toUpperCase() === 'ACTIVE'
  ).length;
  const availability =
    cameras.length > 0 ? Math.round((activeCount / cameras.length) * 100) : 0;

  const columns: Column<Camera>[] = [
    {
      key: 'camera',
      header: 'Optical Sensor Model',
      render: (camera) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-surface-2 text-ink-muted">
            <CameraIcon size={14} />
          </div>
          <div>
            <span className="font-semibold text-ink">{camera.camera_type}</span>
            <span className="block font-mono text-[10px] text-ink-subtle">ID: #{camera.id}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: 'Assigned Vehicle',
      render: (camera) => {
        const bus = busMap[String(camera.bus_id)];
        if (bus) {
          return (
            <Link
              to={`/buses/${bus.id}`}
              className="font-medium text-brand transition-colors hover:text-brand-hover"
            >
              {bus.bus_number}
              <span className="ml-1.5 text-xs text-ink-subtle">({bus.operator ?? 'DTC'})</span>
            </Link>
          );
        }
        return <span className="text-xs text-ink-subtle">Unassigned Depot Unit</span>;
      },
    },
    {
      key: 'position',
      header: 'Mount Position',
      render: (camera) => (
        <span className="inline-flex items-center rounded-md border border-line bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-muted">
          {positionLabel(camera.position)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Stream Status',
      render: (camera) => <StatusBadge status={camera.status} />,
    },
    {
      key: 'added',
      header: 'Commission Date',
      render: (camera) => <span className="text-ink-muted text-xs">{formatDate(camera.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edge AI Vision Nodes"
        description="High-resolution optical sensors and edge inferencing units deployed across transit buses for real-time hazard detection."
        actions={
          <button
            type="button"
            className={buttonSecondaryClass}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={cn('text-ink-muted', refreshing && 'animate-spin')} />
            Refresh Nodes
          </button>
        }
      />

      <Surface className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Metric label="Total Vision Nodes" value={cameras.length} note="Onboard optical units" />
        <Metric label="Online & Streaming" value={activeCount} tone="positive" note="Transmitting inference frames" />
        <Metric label="Fleet Optical Uptime" value={`${availability}%`} tone="brand" note="Nominal operational state" />
      </Surface>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Mount Position:
          </span>
          {POSITIONS.map((pos) => {
            const count = positionCounts[pos] ?? 0;
            const isSelected = position === pos;
            return (
              <button
                key={pos}
                type="button"
                onClick={() => setPosition(pos)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                  isSelected
                    ? 'bg-ink text-canvas shadow-xs'
                    : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
                )}
              >
                <span>{pos === 'ALL' ? 'All Positions' : positionLabel(pos)}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px]',
                    isSelected ? 'bg-canvas/20 text-canvas' : 'bg-surface-3 text-ink-muted'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {position !== 'ALL' && (
          <button
            type="button"
            className="text-xs font-medium text-brand hover:underline"
            onClick={() => setPosition('ALL')}
          >
            Reset filter
          </button>
        )}
      </div>

      {loading ? (
        <Surface>
          <EmptyState variant="loading" title="Loading vision node telemetry…" />
        </Surface>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredCameras}
          getRowKey={(camera) => String(camera.id)}
          empty={
            <EmptyState
              title="No vision nodes found"
              description="No cameras match the selected mount position."
            />
          }
        />
      )}
    </div>
  );
}
