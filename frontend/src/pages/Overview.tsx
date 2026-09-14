import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Camera as CameraIcon,
  Car,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { EventMap } from '../components/EventMap';
import { FloatingDetailCard } from '../components/FloatingDetailCard';
import { fetchBuses, fetchCameras, fetchEvents } from '../api/client';
import {
  formatRelative,
  issueTypeLabel,
  severityColor,
  severityLabel,
  toNumber,
} from '../lib/format';
import { cn } from '../lib/cn';
import type { Bus, Camera, RoadEvent } from '../types';

type SeverityKey = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface Zone {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
}

const DELHI_ZONES: Zone[] = [
  { id: 'dwarka', name: 'Dwarka', center: [28.5921, 77.0460], zoom: 13.5 },
  { id: 'noida', name: 'Noida Sec 62', center: [28.6280, 77.3649], zoom: 13.5 },
  { id: 'ghitorni', name: 'Ghitorni', center: [28.4936, 77.1325], zoom: 13.5 },
  { id: 'saket', name: 'Saket', center: [28.5244, 77.2167], zoom: 13.5 },
];

function getEventZone(event: RoadEvent): Zone {
  const lat = toNumber(event.latitude);
  const lng = toNumber(event.longitude);
  let closest = DELHI_ZONES[0];
  let minDistance = Infinity;
  for (const zone of DELHI_ZONES) {
    const d = Math.hypot(lat - zone.center[0], lng - zone.center[1]);
    if (d < minDistance) {
      minDistance = d;
      closest = zone;
    }
  }
  return closest;
}

export default function Overview() {
  const [events, setEvents] = useState<RoadEvent[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  // Interaction State: Unified selection and hover sync
  const [selectedEvent, setSelectedEvent] = useState<RoadEvent | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | number | null>(null);

  // Search corridor or code
  const [searchQuery, setSearchQuery] = useState('');

  // Zone selection state
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Severity filter state
  const [severityFilters, setSeverityFilters] = useState<Record<SeverityKey, boolean>>({
    CRITICAL: true,
    HIGH: true,
    MEDIUM: true,
    LOW: true,
  });

  // Category filter state
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>({
    POTHOLE: true,
    DAMAGED_ROAD: true,
    WATERLOGGING: true,
    ACCIDENT: true,
  });

  // Layer toggles
  const [layers, setLayers] = useState({
    incidents: true,
    vehicles: false,
    cameras: false,
  });

  // Map viewport control
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.62, 77.21]);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [mapBounds, setMapBounds] = useState<[[number, number], [number, number]] | null>(null);

  // Load telemetry data
  const loadData = useCallback(async () => {
    try {
      const [eventsRes, busesRes, camerasRes] = await Promise.all([
        fetchEvents(),
        fetchBuses(),
        fetchCameras(),
      ]);
      setEvents(eventsRes.events);
      setBuses(busesRes.buses);
      setCameras(camerasRes.cameras);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('citylens:refresh', handleRefresh);
    return () => window.removeEventListener('citylens:refresh', handleRefresh);
  }, [loadData]);

  // Lookup maps
  const busMap = useMemo(() => {
    const map: Record<string, Bus> = {};
    buses.forEach((b) => {
      map[String(b.id)] = b;
    });
    return map;
  }, [buses]);

  const cameraMap = useMemo(() => {
    const map: Record<string, Camera> = {};
    cameras.forEach((c) => {
      map[String(c.id)] = c;
    });
    return map;
  }, [cameras]);

  // Dynamic real counts for severity
  const severityCounts = useMemo(() => {
    return {
      CRITICAL: events.filter((e) => String(e.severity).toUpperCase() === 'CRITICAL').length,
      HIGH: events.filter((e) => String(e.severity).toUpperCase() === 'HIGH').length,
      MEDIUM: events.filter((e) => String(e.severity).toUpperCase() === 'MEDIUM').length,
      LOW: events.filter((e) => String(e.severity).toUpperCase() === 'LOW').length,
    };
  }, [events]);

  // Dynamic real counts for zones
  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {
      dwarka: 0,
      noida: 0,
      ghitorni: 0,
      saket: 0,
    };
    events.forEach((e) => {
      const z = getEventZone(e);
      counts[z.id] = (counts[z.id] || 0) + 1;
    });
    return counts;
  }, [events]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events
      .filter((e) => {
        const sevKey = String(e.severity).toUpperCase() as SeverityKey;
        const typeKey = String(e.event_type).toUpperCase();
        const sevMatch = severityFilters[sevKey] ?? true;
        const typeMatch = typeFilters[typeKey] ?? true;
        if (!sevMatch || !typeMatch) return false;

        // Zone filter
        if (selectedZoneId) {
          const z = getEventZone(e);
          if (z.id !== selectedZoneId) return false;
        }

        // Search query filter (matches ID, type, severity, bus number, or zone name)
        if (q) {
          const bus = busMap[String(e.bus_id)];
          const zone = getEventZone(e);
          const match =
            String(e.id).toLowerCase().includes(q) ||
            String(e.event_type).toLowerCase().includes(q) ||
            String(e.severity).toLowerCase().includes(q) ||
            (bus?.bus_number && bus.bus_number.toLowerCase().includes(q)) ||
            zone.name.toLowerCase().includes(q);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());
  }, [events, severityFilters, typeFilters, selectedZoneId, searchQuery, busMap]);

  // Operational metrics
  const activeVehicles = useMemo(
    () => buses.filter((b) => String(b.status).toUpperCase() === 'ACTIVE').length,
    [buses]
  );
  const activeCameras = useMemo(
    () => cameras.filter((c) => String(c.status).toUpperCase() === 'ACTIVE').length,
    [cameras]
  );
  const avgConfidence = useMemo(() => {
    if (events.length === 0) return 0;
    const total = events.reduce((acc, e) => acc + (Number(e.confidence) || 0), 0);
    return Math.round((total / events.length) * 100);
  }, [events]);

  // Filter actions
  const toggleSeverity = (key: SeverityKey) => {
    setSeverityFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedZoneId(null);
    setSeverityFilters({ CRITICAL: true, HIGH: true, MEDIUM: true, LOW: true });
    setTypeFilters({ POTHOLE: true, DAMAGED_ROAD: true, WATERLOGGING: true, ACCIDENT: true });
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border border-line-strong border-t-accent" />
          <span className="font-mono text-[11px] text-ink-subtle">Loading incident operations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-canvas relative select-none">
      {/* ========================================================================= */}
      {/* 1. LEFT RAIL: Filters & Zones Cards (~250px)                              */}
      {/* ========================================================================= */}
      <div
        className={cn(
          'shrink-0 h-full relative transition-[width] duration-200 ease-in-out z-20',
          isFiltersOpen ? 'w-[255px]' : 'w-0'
        )}
      >
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-[255px] border-r border-line bg-canvas flex flex-col h-full overflow-y-auto p-3 space-y-3 transition-transform duration-200 ease-in-out',
            isFiltersOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          aria-label="Incident Telemetry Filters"
        >
          {/* Card 1: Filters */}
          <div className="rounded-lg border border-line bg-surface p-3.5 shadow-xs">
            <h2 className="font-display text-xl text-ink font-normal leading-none tracking-tight">
              Filters
            </h2>

            {/* Search Input: Search corridor or code */}
            <div className="relative mt-3">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search corridor or code"
                className="h-8 w-full rounded-md border border-line bg-surface-2 pl-8 pr-7 text-xs text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* SEVERITY Section */}
            <div className="mt-4">
              <span className="text-[10px] font-semibold tracking-wider text-ink-subtle uppercase block mb-1">
                Severity
              </span>
              <div className="space-y-0.5">
                {(
                  [
                    { key: 'CRITICAL', label: 'Critical', color: '#ef4444' },
                    { key: 'HIGH', label: 'High', color: '#22c55e' },
                    { key: 'MEDIUM', label: 'Medium', color: '#9AA1AA' },
                    { key: 'LOW', label: 'Low', color: '#69717C' },
                  ] as const
                ).map(({ key, label, color }) => {
                  const count = severityCounts[key];
                  const active = severityFilters[key];

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleSeverity(key)}
                      className={cn(
                        'group flex w-full items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                        active
                          ? 'hover:bg-surface-2 text-ink'
                          : 'text-ink-subtle hover:bg-surface-2/60'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        {active ? (
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                            aria-hidden="true"
                          />
                        ) : (
                          <span
                            className="h-2 w-2 rounded-full border border-ink-subtle shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        <span className={cn('text-xs font-normal', active ? 'text-ink' : 'text-ink-subtle')}>
                          {label}
                        </span>
                      </div>
                      <span className="font-mono text-xs tabular-nums text-ink-muted">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LAYER Section */}
            <div className="mt-4">
              <span className="text-[10px] font-semibold tracking-wider text-ink-subtle uppercase block mb-2">
                Layer
              </span>
              <div className="flex flex-wrap gap-1.5">
                {/* Incidents Toggle */}
                <button
                  type="button"
                  onClick={() => setLayers((l) => ({ ...l, incidents: !l.incidents }))}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors border',
                    layers.incidents
                      ? 'bg-surface-3 text-ink border-line-strong font-medium shadow-xs'
                      : 'border-line bg-surface-2 text-ink-muted hover:text-ink hover:bg-surface-3'
                  )}
                >
                  <span>Incidents</span>
                </button>

                {/* Vehicles Toggle */}
                <button
                  type="button"
                  onClick={() => setLayers((l) => ({ ...l, vehicles: !l.vehicles }))}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors border',
                    layers.vehicles
                      ? 'bg-ink text-canvas border-ink font-semibold shadow-xs'
                      : 'border-line bg-surface-2 text-ink-muted hover:text-ink hover:bg-surface-3'
                  )}
                >
                  <Car size={13} className={layers.vehicles ? 'text-canvas' : 'text-ink-muted'} />
                  <span>Vehicles</span>
                </button>

                {/* Cameras Toggle */}
                <button
                  type="button"
                  onClick={() => setLayers((l) => ({ ...l, cameras: !l.cameras }))}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors border',
                    layers.cameras
                      ? 'bg-ink text-canvas border-ink font-semibold shadow-xs'
                      : 'border-line bg-surface-2 text-ink-muted hover:text-ink hover:bg-surface-3'
                  )}
                >
                  <CameraIcon size={13} className={layers.cameras ? 'text-canvas' : 'text-ink-muted'} />
                  <span>Cameras</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Zones */}
          <div className="rounded-lg border border-line bg-surface p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-ink font-normal leading-none tracking-tight">
                Zones
              </h2>
              {selectedZoneId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedZoneId(null);
                    setMapCenter([28.62, 77.21]);
                    setMapZoom(12);
                  }}
                  className="text-[10px] text-ink-subtle hover:text-ink font-mono"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="mt-2.5 space-y-0.5">
              {DELHI_ZONES.map((zone) => {
                const isSelected = selectedZoneId === zone.id;
                const count = zoneCounts[zone.id] ?? 0;

                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedZoneId(null);
                        setMapBounds(null);
                        setMapCenter([28.62, 77.21]);
                        setMapZoom(12);
                      } else {
                        setSelectedZoneId(zone.id);
                        setMapBounds(null);
                        setMapCenter(zone.center);
                        setMapZoom(zone.zoom);
                      }
                    }}
                    className={cn(
                      'flex w-full items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                      isSelected
                        ? 'bg-surface-2 text-ink font-semibold'
                        : 'text-ink-muted hover:text-ink hover:bg-surface-2/60'
                    )}
                  >
                    <span className="truncate">{zone.name}</span>
                    <span className={cn('font-mono text-xs tabular-nums', isSelected ? 'text-ink' : 'text-ink-muted')}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* ========================================================================= */}
      {/* 2. CENTER: Dominant Full-Height GIS Map Canvas                            */}
      {/* ========================================================================= */}
      <section className="relative flex-1 h-full overflow-hidden bg-canvas" aria-label="Live Incident Map">
        {/* Compact Drawer Toggle */}
        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="absolute top-3 left-3 z-[400] flex h-7 w-7 items-center justify-center rounded border border-line bg-surface/90 text-ink-muted hover:text-ink hover:bg-surface-2 shadow-sm backdrop-blur-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          title="Toggle Filters Panel"
        >
          <SlidersHorizontal size={13} />
        </button>

        {/* The Dominant GIS Map */}
        <EventMap
          events={filteredEvents}
          buses={buses}
          cameras={cameras}
          center={mapCenter}
          zoom={mapZoom}
          bounds={mapBounds}
          selectedEventId={selectedEvent?.id}
          hoveredEventId={hoveredEventId}
          onSelectEvent={(event) => {
            setSelectedEvent(event);
            setMapCenter([toNumber(event.latitude), toNumber(event.longitude)]);
          }}
          onHoverEvent={(id) => setHoveredEventId(id)}
          layers={layers}
          className="h-full w-full"
        />

        {/* Floating Detail Card: Rendered on marker click or feed selection */}
        {selectedEvent && (
          <FloatingDetailCard
            event={selectedEvent}
            bus={busMap[String(selectedEvent.bus_id)]}
            camera={cameraMap[String(selectedEvent.camera_id)]}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </section>

      {/* ========================================================================= */}
      {/* 3. RIGHT RAIL: Telemetry & Structured Incident Feed (~320px)              */}
      {/* ========================================================================= */}
      <aside
        className="w-[320px] shrink-0 border-l border-line bg-surface flex flex-col h-full overflow-hidden text-xs relative z-10"
        aria-label="Operational Telemetry and Feed"
      >
        {/* (a) Compact Telemetry Block */}
        <div className="shrink-0 border-b border-line p-3.5 bg-surface">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-semibold tracking-wider text-ink-subtle uppercase">
              Telemetry
            </span>
          </div>

          {/* 4 Compact Metric Blocks with subtle dividers */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {/* Metric 1: Open reports */}
            <div className="border-l border-line pl-2.5">
              <span className="text-[11px] text-ink-subtle block font-normal">
                Open reports
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono text-xl font-bold tabular-nums text-ink">
                  {events.length}
                </span>
                <span className="font-mono text-[10px] text-ink-subtle">
                  {filteredEvents.length} in view
                </span>
              </div>
            </div>

            {/* Metric 2: Active fleet */}
            <div className="border-l border-line pl-2.5">
              <span className="text-[11px] text-ink-subtle block font-normal">
                Active fleet
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono text-xl font-bold tabular-nums text-ink">
                  {activeVehicles}
                  <span className="font-normal text-xs text-ink-subtle">/{buses.length}</span>
                </span>
                <span className="text-[10px] text-ink-subtle">
                  buses active
                </span>
              </div>
            </div>

            {/* Metric 3: Vision nodes */}
            <div className="border-l border-line pl-2.5">
              <span className="text-[11px] text-ink-subtle block font-normal">
                Vision nodes
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono text-xl font-bold tabular-nums text-ink">
                  {activeCameras}
                  <span className="font-normal text-xs text-ink-subtle">/{cameras.length}</span>
                </span>
                <span className="text-[10px] text-ink-subtle">
                  cameras online
                </span>
              </div>
            </div>

            {/* Metric 4: Inference confidence */}
            <div className="border-l border-line pl-2.5">
              <span className="text-[11px] text-ink-subtle block font-normal">
                Inference confidence
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono text-xl font-bold tabular-nums text-ink">
                  {avgConfidence}%
                </span>
                <span className="text-[10px] text-ink-subtle">
                  avg model score
                </span>
              </div>
            </div>
          </div>

          {/* (b) Severity Breakdown: Compact Bar */}
          <div className="mt-4 pt-3 border-t border-line">
            <div className="flex items-center justify-between text-[10px] font-semibold text-ink-subtle uppercase tracking-wider mb-1.5">
              <span>Severity Breakdown</span>
              <span className="font-mono text-[10px] text-ink-subtle font-normal">{events.length} Total</span>
            </div>

            {/* Segmented Bar without glow */}
            <div className="flex h-1.5 w-full overflow-hidden rounded-xs bg-surface-3">
              {events.length > 0 && (
                <>
                  <div
                    style={{ width: `${(severityCounts.CRITICAL / events.length) * 100}%` }}
                    className="bg-critical h-full"
                    title={`Critical: ${severityCounts.CRITICAL}`}
                  />
                  <div
                    style={{ width: `${(severityCounts.HIGH / events.length) * 100}%` }}
                    className="bg-high h-full"
                    title={`High: ${severityCounts.HIGH}`}
                  />
                  <div
                    style={{ width: `${(severityCounts.MEDIUM / events.length) * 100}%` }}
                    className="bg-medium h-full"
                    title={`Medium: ${severityCounts.MEDIUM}`}
                  />
                  <div
                    style={{ width: `${(severityCounts.LOW / events.length) * 100}%` }}
                    className="bg-low h-full"
                    title={`Low: ${severityCounts.LOW}`}
                  />
                </>
              )}
            </div>

            {/* Summary Legend */}
            <div className="flex items-center justify-between text-[10px] text-ink-subtle mt-1.5 font-mono">
              <span className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-critical" />
                <span>Crit: {severityCounts.CRITICAL}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-high" />
                <span>High: {severityCounts.HIGH}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-medium" />
                <span>Med: {severityCounts.MEDIUM}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-low" />
                <span>Low: {severityCounts.LOW}</span>
              </span>
            </div>
          </div>
        </div>

        {/* (c) Structured Incident Feed */}
        <div className="flex-1 flex flex-col min-h-0 bg-surface">
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2 bg-surface shrink-0">
            <span className="text-[10px] font-semibold tracking-wider text-ink-subtle uppercase">
              Incident Feed
            </span>
            <span className="font-mono text-[10px] text-ink-subtle">
              {filteredEvents.length} records
            </span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-ink-muted">
              <AlertCircle size={20} className="text-ink-subtle mb-2" />
              <p className="font-medium text-xs text-ink">No incidents match active filters</p>
              <p className="text-[11px] text-ink-subtle mt-1 max-w-[200px]">
                Adjust search query, severity, or zone filters in the left rail.
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-3 inline-flex items-center gap-1.5 rounded border border-line bg-surface-2 px-2.5 py-1 text-xs text-ink hover:bg-surface-3 transition-colors"
              >
                <RotateCcw size={11} />
                <span>Reset Filters</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-line">
              {filteredEvents.map((event) => {
                const isSelected = selectedEvent?.id === event.id;
                const isHovered = hoveredEventId === event.id;
                const bus = busMap[String(event.bus_id)];
                const conf = Math.round((Number(event.confidence) || 0) * 100);
                const sev = String(event.severity).toUpperCase();
                const sevColor = severityColor(sev);

                return (
                  <div
                    key={event.id}
                    tabIndex={0}
                    onMouseEnter={() => setHoveredEventId(event.id)}
                    onMouseLeave={() => setHoveredEventId(null)}
                    onClick={() => {
                      setSelectedEvent(event);
                      setMapBounds(null);
                      setMapCenter([toNumber(event.latitude), toNumber(event.longitude)]);
                      setMapZoom(15);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedEvent(event);
                        setMapCenter([toNumber(event.latitude), toNumber(event.longitude)]);
                      }
                    }}
                    className={cn(
                      'px-3.5 py-2.5 cursor-pointer transition-colors text-left focus-visible:outline-none focus-visible:bg-surface-2 border-l-2',
                      isSelected
                        ? 'bg-surface-2 border-accent'
                        : isHovered
                          ? 'bg-surface-2/60 border-ink-subtle'
                          : 'border-transparent hover:bg-surface-2/40'
                    )}
                  >
                    {/* Line 1: Severity · Category and Relative Time */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: sevColor }}
                          aria-hidden="true"
                        />
                        <span
                          className="font-semibold uppercase text-[11px] tracking-tight"
                          style={{ color: sevColor }}
                        >
                          {severityLabel(event.severity)}
                        </span>
                        <span className="text-ink-subtle select-none">·</span>
                        <span className="text-ink text-xs font-normal">
                          {issueTypeLabel(event.event_type)}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-ink-subtle whitespace-nowrap">
                        {formatRelative(event.detected_at)}
                      </span>
                    </div>

                    {/* Line 2: Vehicle Identifier and Confidence Score */}
                    <div className="mt-1 flex items-center justify-between text-[11px] text-ink-subtle">
                      <span className="font-mono text-ink-muted">
                        {bus?.bus_number ?? `Bus #${String(event.bus_id).slice(0, 8)}`}
                      </span>
                      <span className="font-mono text-[10px] text-ink-subtle">
                        {conf}% conf
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
