import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Surface, SurfaceHeader } from '../components/Surface';
import { Metric } from '../components/Metric';
import { DataTable, type Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { IssueTypeBadge } from '../components/IssueTypeBadge';
import { EmptyState } from '../components/EmptyState';
import { fetchBusById, fetchCameras, fetchEvents } from '../api/client';
import { buttonSecondaryClass } from '../lib/ui';
import { formatCoords, formatDate, formatDateTime, positionLabel } from '../lib/format';
import type { Bus, Camera, RoadEvent } from '../types';

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const [bus, setBus] = useState<Bus | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [events, setEvents] = useState<RoadEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!id) return;

    setLoading(true);
    Promise.all([fetchBusById(id), fetchCameras(), fetchEvents({ bus_id: id })])
      .then(([busResult, camerasResult, eventsResult]) => {
        if (!active) return;
        setBus(busResult);
        setCameras(
          camerasResult.cameras.filter((camera) => String(camera.bus_id) === String(id))
        );
        setEvents(eventsResult.events);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const cameraColumns: Column<Camera>[] = useMemo(
    () => [
      {
        key: 'type',
        header: 'Camera',
        render: (camera) => <span className="font-medium text-ink">{camera.camera_type}</span>,
      },
      {
        key: 'position',
        header: 'Position',
        render: (camera) => (
          <span className="text-ink-muted">{positionLabel(camera.position)}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (camera) => <StatusBadge status={camera.status} />,
      },
      {
        key: 'added',
        header: 'Added',
        render: (camera) => <span className="text-ink-muted">{formatDate(camera.created_at)}</span>,
      },
    ],
    []
  );

  const eventColumns: Column<RoadEvent>[] = useMemo(
    () => [
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
        key: 'reported',
        header: 'Reported',
        render: (event) => (
          <span className="text-ink-muted">{formatDateTime(event.detected_at)}</span>
        ),
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
    ],
    []
  );

  if (loading) {
    return (
      <Surface>
        <EmptyState variant="loading" title="Loading vehicle…" />
      </Surface>
    );
  }

  if (!bus) {
    return (
      <EmptyState
        variant="error"
        title="Vehicle not found"
        description={`The vehicle "${id ?? ''}" could not be found.`}
        action={
          <Link to="/buses" className={buttonSecondaryClass}>
            <ArrowLeft size={14} aria-hidden="true" />
            Back to vehicles
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/buses"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to vehicles
      </Link>

      <PageHeader
        title={bus.bus_number}
        description={
          <span className="flex items-center gap-2">
            <StatusBadge status={bus.status} />
            <span className="text-sm text-ink-muted">
              {bus.operator ?? 'Unknown operator'}
            </span>
          </span>
        }
      />

      <Surface className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 lg:grid-cols-4 sm:divide-x sm:divide-y-0">
        <Metric label="Operator" value={bus.operator ?? '—'} />
        <Metric label="Model" value={bus.model ?? '—'} />
        <Metric label="Cameras" value={cameras.length} />
        <Metric label="Reports" value={events.length} />
      </Surface>

      <Surface>
        <SurfaceHeader title="Cameras" subtitle={`${cameras.length} installed`} />
        {cameras.length === 0 ? (
          <EmptyState
            title="No cameras configured"
            description="No cameras are currently mapped to this vehicle."
          />
        ) : (
          <DataTable
            columns={cameraColumns}
            rows={cameras}
            getRowKey={(camera) => String(camera.id)}
            className="rounded-none border-0 shadow-none"
          />
        )}
      </Surface>

      <Surface>
        <SurfaceHeader title="Road issues reported" subtitle={`${events.length} reports`} />
        {events.length === 0 ? (
          <EmptyState
            title="No reports yet"
            description="This vehicle has not reported any road issues."
          />
        ) : (
          <DataTable
            columns={eventColumns}
            rows={events}
            getRowKey={(event) => String(event.id)}
            className="rounded-none border-0 shadow-none"
          />
        )}
      </Surface>
    </div>
  );
}
