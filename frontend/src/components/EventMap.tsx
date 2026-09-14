import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { Bus as BusIcon, Camera as CameraIcon } from 'lucide-react';
import { issueTypeLabel, severityColor, severityLabel, toNumber } from '../lib/format';
import { cn } from '../lib/cn';
import type { Bus, Camera, RoadEvent } from '../types';

const DEFAULT_CENTER: [number, number] = [28.62, 77.21];

type MapStyle = 'light' | 'street' | 'dark';

const TILE_LAYERS: Record<MapStyle, { url: string; attribution: string; subdomains?: string }> = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
  },
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
  },
};

interface MapControllerProps {
  center: [number, number];
  zoom: number;
  bounds?: [[number, number], [number, number]] | null;
}

function MapController({ center, zoom, bounds }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 15, duration: 1.2 });
    } else {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom, bounds, map]);

  return null;
}

interface EventMapProps {
  events?: RoadEvent[];
  buses?: Bus[];
  cameras?: Camera[];
  center?: [number, number];
  zoom?: number;
  bounds?: [[number, number], [number, number]] | null;
  selectedEventId?: string | number | null;
  hoveredEventId?: string | number | null;
  onSelectEvent?: (event: RoadEvent) => void;
  onHoverEvent?: (id: string | number | null) => void;
  layers?: {
    incidents: boolean;
    vehicles: boolean;
    cameras: boolean;
  };
  height?: number | string;
  className?: string;
}

export function EventMap({
  events = [],
  buses = [],
  cameras = [],
  center = DEFAULT_CENTER,
  zoom = 12,
  bounds = null,
  selectedEventId = null,
  hoveredEventId = null,
  onSelectEvent,
  onHoverEvent,
  layers = { incidents: true, vehicles: false, cameras: false },
  height = '100%',
  className,
}: EventMapProps) {
  // Basemap style toggle: defaults to clean light GIS map ('kinda white')
  const [mapStyle, setMapStyle] = useState<MapStyle>('light');

  const validEvents = events.filter(
    (event) =>
      Number.isFinite(toNumber(event.latitude)) &&
      Number.isFinite(toNumber(event.longitude))
  );

  // Map buses with known coordinates
  const busesWithCoords = buses
    .map((bus) => {
      const busEvents = validEvents.filter((e) => String(e.bus_id) === String(bus.id));
      if (busEvents.length > 0) {
        return {
          ...bus,
          lat: toNumber(busEvents[0].latitude),
          lng: toNumber(busEvents[0].longitude),
          latestEvent: busEvents[0],
        };
      }
      return null;
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-canvas ${className ?? ''}`}
      style={{ height }}
    >
      {/* Floating Basemap Style Switcher (Top Right) */}
      <div className="absolute top-3 right-3 z-[400] flex rounded border border-line bg-surface/95 p-0.5 text-[11px] backdrop-blur-sm shadow-xs select-none">
        {(['light', 'street', 'dark'] as const).map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => setMapStyle(style)}
            className={cn(
              'px-2 py-0.5 rounded capitalize transition-colors',
              mapStyle === style
                ? 'bg-surface-3 text-ink font-medium shadow-xs'
                : 'text-ink-muted hover:text-ink'
            )}
          >
            {style}
          </button>
        ))}
      </div>

      {/* Floating Severity Legend: quiet, compact, restrained (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-[400] flex items-center gap-2.5 rounded border border-line bg-surface/90 px-2.5 py-1 text-[11px] text-ink-muted backdrop-blur-sm select-none">
        {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
          <span key={sev} className="flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: severityColor(sev) }}
              aria-hidden="true"
            />
            <span className="text-[10px] uppercase font-medium tracking-tight text-ink-muted">
              {severityLabel(sev)}
            </span>
          </span>
        ))}
        {layers.vehicles && (
          <span className="flex items-center gap-1 border-l border-line pl-2 text-accent text-[10px]">
            <BusIcon size={11} />
            <span>Fleet</span>
          </span>
        )}
        {layers.cameras && (
          <span className="flex items-center gap-1 border-l border-line pl-2 text-ink-muted text-[10px]">
            <CameraIcon size={11} />
            <span>Cameras</span>
          </span>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        zoomControl={true}
        className="h-full w-full"
        style={{ width: '100%', height: '100%' }}
      >
        <MapController center={center} zoom={zoom} bounds={bounds} />

        {/* Dynamic Basemap Tile Layer */}
        <TileLayer
          key={mapStyle}
          attribution={TILE_LAYERS[mapStyle].attribution}
          url={TILE_LAYERS[mapStyle].url}
          subdomains={TILE_LAYERS[mapStyle].subdomains ?? 'abc'}
          maxZoom={19}
        />

        {/* Incident Markers: Clean, solid, semantic colors, no neon glow */}
        {layers.incidents &&
          validEvents.map((event) => {
            const lat = toNumber(event.latitude);
            const lng = toNumber(event.longitude);
            const isSelected = String(event.id) === String(selectedEventId);
            const isHovered = String(event.id) === String(hoveredEventId);
            const color = severityColor(event.severity);
            const isCritical = String(event.severity).toUpperCase() === 'CRITICAL';

            // Restrained, precise marker radii
            const radius = isSelected ? 8.5 : isHovered ? 8 : isCritical ? 6.5 : 5.5;

            return (
              <CircleMarker
                key={String(event.id)}
                center={[lat, lng]}
                radius={radius}
                eventHandlers={{
                  click: () => onSelectEvent?.(event),
                  mouseover: () => onHoverEvent?.(event.id),
                  mouseout: () => onHoverEvent?.(null),
                }}
                pathOptions={{
                  color: isSelected ? '#3B82F6' : isHovered ? '#FFFFFF' : '#0B0D10',
                  fillColor: color,
                  fillOpacity: 0.95,
                  weight: isSelected ? 2.5 : isHovered ? 2 : 1,
                }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                  <div className="text-[11px] font-medium leading-tight">
                    <span className="font-semibold text-ink">{issueTypeLabel(event.event_type)}</span>
                    <span className="block text-ink-muted text-[10px]">
                      {severityLabel(event.severity)}
                    </span>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

        {/* Vehicle Markers */}
        {layers.vehicles &&
          busesWithCoords.map((bus) => (
            <CircleMarker
              key={`bus-${bus.id}`}
              center={[bus.lat, bus.lng]}
              radius={6.5}
              pathOptions={{
                color: '#15191F',
                fillColor: '#3B82F6',
                fillOpacity: 0.95,
                weight: 1.5,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <div className="flex items-center gap-1 text-[11px] font-medium">
                  <BusIcon size={11} />
                  <span>{bus.bus_number}</span>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}

        {/* Camera Markers */}
        {layers.cameras &&
          cameras.map((camera) => {
            const bus = busesWithCoords.find((b) => String(b.id) === String(camera.bus_id));
            if (!bus) return null;
            return (
              <CircleMarker
                key={`cam-${camera.id}`}
                center={[bus.lat + 0.0008, bus.lng + 0.0008]}
                radius={5}
                pathOptions={{
                  color: '#15191F',
                  fillColor: '#60A5FA',
                  fillOpacity: 0.95,
                  weight: 1.5,
                }}
              >
                <Tooltip direction="top" offset={[0, -6]}>
                  <div className="flex items-center gap-1 text-[11px] font-medium">
                    <CameraIcon size={11} />
                    <span>{camera.camera_type}</span>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}
