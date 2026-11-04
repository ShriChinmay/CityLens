import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bus as BusIcon, Camera as CameraIcon, MapPin } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Surface, SurfaceHeader } from '../components/Surface';
import { SeverityBadge } from '../components/SeverityBadge';
import { IssueTypeBadge } from '../components/IssueTypeBadge';
import { ConfidenceMeter } from '../components/ConfidenceMeter';
import { EvidenceViewer } from '../components/EvidenceViewer';
import { EventMap } from '../components/EventMap';
import { EmptyState } from '../components/EmptyState';
import {
  fetchBusById,
  fetchCameraById,
  fetchEventById,
  fetchEventObservations,
  updateEventStatus,
} from '../api/client';
import { cn } from '../lib/cn';
import { buttonSecondaryClass } from '../lib/ui';
import {
  formatCoords,
  formatDateTime,
  formatId,
  issueTypeLabel,
  positionLabel,
  severityLabel,
  toNumber,
} from '../lib/format';
import type {
  Bus,
  Camera,
  EventObservation,
  EventStatus,
  RoadEvent,
} from '../types';

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatMetadataValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function MetadataList({ metadata }: { metadata?: Record<string, unknown> | null }) {
  const entries = metadata ? Object.entries(metadata) : [];

  if (entries.length === 0) {
    return <p className="px-4 py-4 text-sm text-ink-subtle">No additional details recorded.</p>;
  }

  return (
    <dl className="divide-y divide-line px-4">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-sm text-ink-muted">{humanizeKey(key)}</dt>
          <dd className="text-right text-sm font-medium text-ink">
            {formatMetadataValue(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-right text-sm font-medium text-ink">{children}</span>
    </div>
  );
}
const incidentStatusStyles: Record<EventStatus, string> = {
  DETECTED: 'border-medium-line bg-medium-soft text-medium',
  VERIFIED: 'border-low-line bg-low-soft text-low',
  WORK_ORDER_ISSUED: 'border-brand/20 bg-brand/10 text-brand',
  RESOLVED: 'border-low-line bg-low-soft text-low',
  AUDITED: 'border-line bg-surface-2 text-ink-subtle',
};

function incidentStatusLabel(status: EventStatus): string {
  return status.replace(/_/g, ' ');
}

const nextIncidentStatus: Partial<
  Record<EventStatus, { status: EventStatus; label: string }>
> = {
  DETECTED: { status: 'VERIFIED', label: 'Verify incident' },
  VERIFIED: { status: 'WORK_ORDER_ISSUED', label: 'Issue work order' },
  WORK_ORDER_ISSUED: { status: 'RESOLVED', label: 'Mark as resolved' },
  RESOLVED: { status: 'AUDITED', label: 'Complete audit' },
};

export default function RoadIssueDetail() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<RoadEvent | null>(null);
  const [bus, setBus] = useState<Bus | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [observations, setObservations] = useState<EventObservation[]>([]);
  const [observationsError, setObservationsError] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  async function handleStatusUpdate(nextStatus: EventStatus) {
    if (!id || updatingStatus) return;

    setUpdatingStatus(true);
    setStatusError('');

    try {
      const response = await updateEventStatus(id, nextStatus);
      setEvent(response.event);
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : 'Failed to update incident status.'
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  useEffect(() => {
    let active = true;
    if (!id) return;

    setLoading(true);
    
    

    setObservations([]);
    setObservationsError(false);

    fetchEventObservations(id)
      .then((response) => {
        if (active) setObservations(response.observations);
      })
      .catch(() => {
        if (active) setObservationsError(true);
      });
    fetchEventById(id)
      .then((fetched) => {
        if (!active) return;
        setEvent(fetched);
        if (fetched.bus_id !== undefined) {
          fetchBusById(String(fetched.bus_id))
            .then((result) => active && setBus(result))
            .catch(() => undefined);
        }
        if (fetched.camera_id !== undefined) {
          fetchCameraById(String(fetched.camera_id))
            .then((result) => active && setCamera(result))
            .catch(() => undefined);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <Surface>
        <EmptyState variant="loading" title="Loading road issue…" />
      </Surface>
    );
  }

  if (!event) {
    return (
      <EmptyState
        variant="error"
        title="Road issue not found"
        description={`The issue "${id ?? ''}" could not be found.`}
        action={
          <Link to="/events" className={buttonSecondaryClass}>
            <ArrowLeft size={14} aria-hidden="true" />
            Back to road issues
          </Link>
        }
      />
    );
  }

  const latitude = toNumber(event.latitude);
  const longitude = toNumber(event.longitude);
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
  const currentTransition = event.status
  ? nextIncidentStatus[event.status]
  : undefined;
  return (
    <div className="space-y-6">
      <Link
        to="/events"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to road issues
      </Link>

      <PageHeader
        title={`${issueTypeLabel(event.event_type)} · ${severityLabel(event.severity)}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <IssueTypeBadge type={event.event_type} />
            <SeverityBadge severity={event.severity} />
            <span className="font-mono text-xs text-ink-subtle">
              #{formatId(event.id)}
            </span>
          </span>
        }
      />

        <Surface>
        <SurfaceHeader title="Incident lifecycle" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-ink-muted">Current status</p>
            {event.status ? (
              <span
                className={cn(
                  'mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
                  incidentStatusStyles[event.status]
                )}
              >
                {incidentStatusLabel(event.status)}
              </span>
            ) : (
              <p className="mt-2 text-sm text-ink-subtle">Not available</p>
            )}
          </div>

          <div>
            <p className="text-xs text-ink-muted">Total detections</p>
            <p className="mt-2 text-lg font-semibold text-ink">
              {event.detection_count ?? '—'}
            </p>
          </div>

          <div>
            <p className="text-xs text-ink-muted">First observed</p>
            <p className="mt-2 text-sm font-medium text-ink">
              {event.first_seen_at
                ? formatDateTime(event.first_seen_at)
                : 'Not available'}
            </p>
          </div>

          <div>
            <p className="text-xs text-ink-muted">Last observed</p>
            <p className="mt-2 text-sm font-medium text-ink">
              {event.last_seen_at
                ? formatDateTime(event.last_seen_at)
                : 'Not available'}
            </p>
          </div>
        </div>
        <div className="border-t border-line px-4 py-3">
          {currentTransition ? (
            <button
              type="button"
              disabled={updatingStatus}
              onClick={() => handleStatusUpdate(currentTransition.status)}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updatingStatus
                ? 'Updating...'
                : currentTransition.label}
            </button>
          ) : (
            <p className="text-sm text-ink-subtle">
              {event.status === 'AUDITED'
                ? 'This incident has completed its lifecycle.'
                : 'Status transition unavailable.'}
            </p>
          )}

          {statusError && (
            <p className="mt-2 text-sm text-red-600">{statusError}</p>
          )}
        </div>
      </Surface>

      <Surface>
      <SurfaceHeader
        title="Detection history"
        action={
          <span className="text-xs text-ink-subtle">
            {observations.length} observations
          </span>
        }
      />

      {observationsError ? (
        <p className="px-4 py-4 text-sm text-ink-subtle">
          Detection history is currently unavailable.
        </p>
      ) : observations.length === 0 ? (
        <p className="px-4 py-4 text-sm text-ink-subtle">
          No detection observations recorded yet.
        </p>
      ) : (
        <div className="divide-y divide-line">
          {observations.map((observation) => (
            <div
              key={observation.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-ink">
                  Detection #{formatId(observation.id)}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Bus #{formatId(observation.bus_id)} · Camera #{formatId(observation.camera_id)}
                </p>
                <p className="mt-1 text-xs text-ink-subtle">
                  {formatCoords(observation.latitude, observation.longitude, 6)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium text-ink">
                  {formatDateTime(observation.observed_at)}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Confidence: {Math.round(toNumber(observation.confidence) * 100)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Surface>


      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <EvidenceViewer
            evidenceUrl={event.evidence_url}
            title={`Evidence photo · ${issueTypeLabel(event.event_type)}`}
          />

          <Surface>
            <SurfaceHeader title="Issue details" />
            <MetadataList metadata={event.metadata} />
          </Surface>
        </div>

        <div className="space-y-6">
          <Surface>
            <SurfaceHeader
              title="Location"
              action={
                hasCoords ? (
                  <span className="font-mono text-xs text-ink-subtle">
                    {formatCoords(event.latitude, event.longitude)}
                  </span>
                ) : undefined
              }
            />
            <div className="p-3">
              {hasCoords ? (
                <EventMap
                  events={[event]}
                  center={[latitude, longitude]}
                  zoom={15}
                  selectedEventId={event.id}
                  height={360}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                  <MapPin size={22} className="text-ink-subtle" aria-hidden="true" />
                  <p className="text-sm text-ink-muted">No location recorded for this issue.</p>
                </div>
              )}
            </div>
          </Surface>

          <Surface>
            <SurfaceHeader title="Report" />
            <div className="divide-y divide-line px-4">
              <DetailRow label="Detection confidence">
                <ConfidenceMeter value={event.confidence} />
              </DetailRow>
              <DetailRow label="Reported">
                {formatDateTime(event.detected_at)}
              </DetailRow>
              <DetailRow label="Vehicle">
                {bus ? (
                  <Link
                    to={`/buses/${bus.id}`}
                    className="inline-flex items-center gap-1.5 text-brand transition-colors hover:text-brand-hover"
                  >
                    <BusIcon size={14} aria-hidden="true" />
                    {bus.bus_number}
                  </Link>
                ) : (
                  <span className="font-mono text-xs text-ink-subtle">
                    {formatId(event.bus_id)}
                  </span>
                )}
              </DetailRow>
              <DetailRow label="Camera">
                {camera ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CameraIcon size={14} className="text-ink-subtle" aria-hidden="true" />
                    {camera.camera_type} ({positionLabel(camera.position)})
                  </span>
                ) : (
                  <span className="font-mono text-xs text-ink-subtle">
                    {formatId(event.camera_id)}
                  </span>
                )}
              </DetailRow>
              <DetailRow label="Coordinates">
                <span className={cn('font-mono text-xs', !hasCoords && 'text-ink-subtle')}>
                  {formatCoords(event.latitude, event.longitude, 6)}
                </span>
              </DetailRow>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
