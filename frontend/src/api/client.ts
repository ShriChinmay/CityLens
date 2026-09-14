import type {
  Bus,
  BusesResponse,
  Camera,
  CamerasResponse,
  EventFilters,
  EventsResponse,
  HealthResponse,
  RoadEvent,
} from '../types';
import { MOCK_BUSES, MOCK_CAMERAS, MOCK_EVENTS } from './mockData';

const API_BASE = '/api/v1';

let isBackendLive = false;

export function getIsBackendLive(): boolean {
  return isBackendLive;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    isBackendLive = true;
    return (await res.json()) as T;
  } catch (err) {
    isBackendLive = false;
    throw err;
  }
}

function filterMockEvents(filters: EventFilters = {}): RoadEvent[] {
  let filtered = [...MOCK_EVENTS];

  if (filters.event_type && filters.event_type !== 'ALL') {
    filtered = filtered.filter((event) => event.event_type === filters.event_type);
  }
  if (filters.severity && filters.severity !== 'ALL') {
    filtered = filtered.filter((event) => event.severity === filters.severity);
  }
  if (filters.bus_id && filters.bus_id !== 'ALL') {
    filtered = filtered.filter((event) => String(event.bus_id) === String(filters.bus_id));
  }
  if (filters.camera_id && filters.camera_id !== 'ALL') {
    filtered = filtered.filter((event) => String(event.camera_id) === String(filters.camera_id));
  }

  return filtered;
}

export async function fetchEvents(filters: EventFilters = {}): Promise<EventsResponse> {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'ALL') {
        params.append(key, String(value));
      }
    });

    const query = params.toString() ? `?${params.toString()}` : '';
    return await request<EventsResponse>(`${API_BASE}/events${query}`);
  } catch {
    const events = filterMockEvents(filters);
    return { count: events.length, events };
  }
}

export async function fetchEventById(id: string): Promise<RoadEvent> {
  try {
    return await request<RoadEvent>(`${API_BASE}/events/${id}`);
  } catch {
    const found = MOCK_EVENTS.find((event) => String(event.id) === String(id));
    return found ?? MOCK_EVENTS[0];
  }
}

export async function fetchBuses(): Promise<BusesResponse> {
  try {
    return await request<BusesResponse>(`${API_BASE}/buses`);
  } catch {
    return { count: MOCK_BUSES.length, buses: MOCK_BUSES };
  }
}

export async function fetchBusById(id: string): Promise<Bus> {
  try {
    return await request<Bus>(`${API_BASE}/buses/${id}`);
  } catch {
    const found = MOCK_BUSES.find((bus) => String(bus.id) === String(id));
    return found ?? MOCK_BUSES[0];
  }
}

export async function fetchCameras(): Promise<CamerasResponse> {
  try {
    return await request<CamerasResponse>(`${API_BASE}/cameras`);
  } catch {
    return { count: MOCK_CAMERAS.length, cameras: MOCK_CAMERAS };
  }
}

export async function fetchCameraById(id: string): Promise<Camera> {
  try {
    return await request<Camera>(`${API_BASE}/cameras/${id}`);
  } catch {
    const found = MOCK_CAMERAS.find((camera) => String(camera.id) === String(id));
    return found ?? MOCK_CAMERAS[0];
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  try {
    return await request<HealthResponse>('/health');
  } catch {
    return { status: 'simulation', online: false };
  }
}

export function getEvidenceUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/evidence/')) return path;
  return `/evidence/${path}`;
}
