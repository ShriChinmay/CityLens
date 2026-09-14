export type Id = string | number;

export type Numeric = number | string;

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IssueType = 'POTHOLE' | 'DAMAGED_ROAD' | 'WATERLOGGING' | 'ACCIDENT';

export type VehicleStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | string;

export interface Bus {
  id: Id;
  bus_number: string;
  operator?: string | null;
  model?: string | null;
  status: VehicleStatus;
  created_at?: string;
}

export interface Camera {
  id: Id;
  bus_id: Id;
  camera_type: string;
  position?: string | null;
  status: VehicleStatus;
  created_at?: string;
}

export interface RoadEvent {
  id: Id;
  bus_id: Id;
  camera_id: Id;
  event_type: IssueType | string;
  confidence: Numeric;
  severity: Severity | string;
  detected_at: string;
  latitude: Numeric;
  longitude: Numeric;
  metadata?: Record<string, unknown> | null;
  evidence_url?: string | null;
  created_at?: string;
}

export interface EventFilters {
  event_type?: string;
  severity?: string;
  bus_id?: string | number;
  camera_id?: string | number;
}

export interface EventsResponse {
  count: number;
  events: RoadEvent[];
}

export interface BusesResponse {
  count: number;
  buses: Bus[];
}

export interface CamerasResponse {
  count: number;
  cameras: Camera[];
}

export interface HealthResponse {
  status: string;
  online?: boolean;
}
