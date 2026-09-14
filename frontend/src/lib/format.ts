import type { Id, Numeric } from '../types';

export function toNumber(value: Numeric | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

export function formatId(id: Id | null | undefined, length = 8): string {
  if (id === null || id === undefined) return '—';
  const value = String(id);
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

export function confidencePercent(value: Numeric | null | undefined): number {
  const parsed = toNumber(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function formatConfidence(value: Numeric | null | undefined): string {
  return `${confidencePercent(value)}%`;
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatRelative(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

export function formatCoords(
  latitude: Numeric | null | undefined,
  longitude: Numeric | null | undefined,
  precision = 4
): string {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '—';
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const ISSUE_TYPE_LABELS: Record<string, string> = {
  POTHOLE: 'Pothole',
  DAMAGED_ROAD: 'Damaged road',
  WATERLOGGING: 'Waterlogging',
  ACCIDENT: 'Accident',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  MAINTENANCE: 'Maintenance',
};

const POSITION_LABELS: Record<string, string> = {
  FRONT: 'Front',
  REAR: 'Rear',
  SIDE: 'Side',
  CABIN: 'Cabin',
};

export function severityLabel(severity?: string | null): string {
  const key = (severity ?? '').toUpperCase();
  return SEVERITY_LABELS[key] ?? 'Unknown';
}

export function issueTypeLabel(type?: string | null): string {
  const key = (type ?? '').toUpperCase();
  return ISSUE_TYPE_LABELS[key] ?? 'Unclassified';
}

export function statusLabel(status?: string | null): string {
  const key = (status ?? '').toUpperCase();
  return STATUS_LABELS[key] ?? (key || 'Unknown');
}

export function positionLabel(position?: string | null): string {
  const key = (position ?? '').toUpperCase();
  return POSITION_LABELS[key] ?? (key || 'Unknown');
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#22c55e',      // Green
  MEDIUM: '#eab308',   // Amber/Yellow
  HIGH: '#f97316',     // Orange
  CRITICAL: '#ef4444', // Red
};

export function severityColor(severity?: string | null): string {
  const key = (severity ?? '').toUpperCase();
  return SEVERITY_COLORS[key] ?? '#949aa7';
}

export interface SpatialCluster {
  id: string;
  name: string;
  center: [number, number];
  count: number;
  criticalCount: number;
}

export function computeSpatialClusters(events: Array<{ latitude?: unknown; longitude?: unknown; severity?: unknown }>): SpatialCluster[] {
  const valid = events.filter((e) => {
    const lat = toNumber(e.latitude as number);
    const lng = toNumber(e.longitude as number);
    return Number.isFinite(lat) && Number.isFinite(lng);
  });

  if (valid.length === 0) return [];

  const lats = valid.map((e) => toNumber(e.latitude as number));
  const lngs = valid.map((e) => toNumber(e.longitude as number));
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;

  const quadrants: Record<string, { name: string; events: typeof valid }> = {
    NW: { name: 'Northwest Quadrant', events: [] },
    NE: { name: 'Northeast Quadrant', events: [] },
    SW: { name: 'Southwest Quadrant', events: [] },
    SE: { name: 'Southeast Quadrant', events: [] },
  };

  valid.forEach((e) => {
    const lat = toNumber(e.latitude as number);
    const lng = toNumber(e.longitude as number);
    const ns = lat >= midLat ? 'N' : 'S';
    const ew = lng >= midLng ? 'E' : 'W';
    quadrants[`${ns}${ew}`].events.push(e);
  });

  return Object.entries(quadrants)
    .filter(([, group]) => group.events.length > 0)
    .map(([id, group]) => {
      const gLats = group.events.map((e) => toNumber(e.latitude as number));
      const gLngs = group.events.map((e) => toNumber(e.longitude as number));
      const avgLat = gLats.reduce((a, b) => a + b, 0) / gLats.length;
      const avgLng = gLngs.reduce((a, b) => a + b, 0) / gLngs.length;
      const crit = group.events.filter((e) => String(e.severity).toUpperCase() === 'CRITICAL').length;
      return {
        id,
        name: group.name,
        center: [Number(avgLat.toFixed(5)), Number(avgLng.toFixed(5))],
        count: group.events.length,
        criticalCount: crit,
      };
    });
}

