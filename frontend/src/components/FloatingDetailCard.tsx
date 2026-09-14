import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bus as BusIcon,
  Camera as CameraIcon,
  Clock,
  ExternalLink,
  MapPin,
  Maximize2,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';
import { IssueTypeBadge } from './IssueTypeBadge';
import { getEvidenceUrl } from '../api/client';
import { confidencePercent, formatCoords, formatDateTime, formatRelative, toNumber } from '../lib/format';
import type { Bus, Camera, RoadEvent } from '../types';

interface FloatingDetailCardProps {
  event: RoadEvent;
  bus?: Bus | null;
  camera?: Camera | null;
  onClose: () => void;
}

export function FloatingDetailCard({
  event,
  bus,
  camera,
  onClose,
}: FloatingDetailCardProps) {
  const [copied, setCopied] = useState(false);
  const [photoEnlarged, setPhotoEnlarged] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (photoEnlarged) {
          setPhotoEnlarged(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, photoEnlarged]);

  const confidence = confidencePercent(event.confidence);
  const evidenceUrl = getEvidenceUrl(event.evidence_url);
  const coordsStr = formatCoords(event.latitude, event.longitude, 5);

  const copyCoordinates = () => {
    if (!coordsStr || coordsStr === '—') return;
    navigator.clipboard.writeText(`${toNumber(event.latitude)}, ${toNumber(event.longitude)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <div
        className="absolute top-3 left-3 z-[1000] w-[320px] max-w-[calc(100vw-24px)] rounded-lg border border-line bg-surface p-3.5 shadow-xl shadow-black/80 backdrop-blur-sm transition-all"
        role="dialog"
        aria-label="Incident Details"
      >
        {/* Header: Badges and Close button */}
        <div className="flex items-start justify-between gap-2 border-b border-line pb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <SeverityBadge severity={event.severity} />
            <IssueTypeBadge type={event.event_type} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            aria-label="Close detail card"
          >
            <X size={14} />
          </button>
        </div>

        {/* Evidence Photo Preview (if available) */}
        {evidenceUrl && !photoFailed && (
          <div className="relative mt-2.5 overflow-hidden rounded border border-line bg-canvas">
            <img
              src={evidenceUrl}
              alt={`${event.event_type} evidence`}
              onError={() => setPhotoFailed(true)}
              className="h-32 w-full object-cover"
              loading="lazy"
            />
            <button
              type="button"
              onClick={() => setPhotoEnlarged(true)}
              className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-black/90 focus-visible:outline-none"
            >
              <Maximize2 size={10} />
              <span>Expand</span>
            </button>
          </div>
        )}

        {/* Detail Rows */}
        <div className="mt-2.5 space-y-2 text-xs">
          {/* Inference Confidence Bar */}
          <div>
            <div className="flex items-center justify-between text-ink-muted text-[11px]">
              <span>Inference Confidence</span>
              <span className="font-mono font-medium text-ink">{confidence}%</span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded bg-surface-3">
              <div
                className="h-full rounded bg-accent"
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>

          {/* Time: Relative & Exact */}
          <div className="flex items-center justify-between border-t border-line/60 pt-2 text-ink-muted">
            <span className="inline-flex items-center gap-1 text-[11px]">
              <Clock size={11} className="text-ink-subtle" />
              <span>Detected</span>
            </span>
            <div className="text-right">
              <span className="font-medium text-ink text-xs">{formatRelative(event.detected_at)}</span>
              <span className="block font-mono text-[10px] text-ink-subtle">
                {formatDateTime(event.detected_at)}
              </span>
            </div>
          </div>

          {/* Coordinates */}
          <div className="flex items-center justify-between border-t border-line/60 pt-2 text-ink-muted">
            <span className="inline-flex items-center gap-1 text-[11px]">
              <MapPin size={11} className="text-ink-subtle" />
              <span>Coordinates</span>
            </span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs text-ink">{coordsStr}</span>
              <button
                type="button"
                onClick={copyCoordinates}
                className="inline-flex h-4 w-4 items-center justify-center rounded text-ink-subtle hover:text-ink focus-visible:outline-none"
                title="Copy coordinates"
              >
                {copied ? <Check size={11} className="text-low" /> : <Copy size={11} />}
              </button>
            </div>
          </div>

          {/* Reporting Vehicle */}
          <div className="flex items-center justify-between border-t border-line/60 pt-2 text-ink-muted">
            <span className="inline-flex items-center gap-1 text-[11px]">
              <BusIcon size={11} className="text-ink-subtle" />
              <span>Vehicle</span>
            </span>
            {bus ? (
              <Link
                to={`/buses/${bus.id}`}
                className="font-medium text-ink hover:text-accent hover:underline text-xs"
              >
                {bus.bus_number}
              </Link>
            ) : (
              <span className="font-mono text-ink text-xs">Bus #{String(event.bus_id).slice(0, 8)}</span>
            )}
          </div>

          {/* Edge Camera Sensor */}
          {camera && (
            <div className="flex items-center justify-between border-t border-line/60 pt-2 text-ink-muted">
              <span className="inline-flex items-center gap-1 text-[11px]">
                <CameraIcon size={11} className="text-ink-subtle" />
                <span>Sensor</span>
              </span>
              <span className="text-ink text-xs">
                {camera.camera_type} ({camera.position})
              </span>
            </div>
          )}
        </div>

        {/* Footer Link */}
        <div className="mt-3 border-t border-line pt-2.5">
          <Link
            to={`/events/${event.id}`}
            className="flex w-full items-center justify-center gap-1.5 rounded border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <span>Open Incident Record</span>
            <ExternalLink size={11} />
          </Link>
        </div>
      </div>

      {/* Full-size Photo Lightbox */}
      {photoEnlarged && evidenceUrl && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setPhotoEnlarged(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg border border-line bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-3.5 py-2">
              <span className="text-xs font-medium text-ink">
                Evidence Capture · {event.event_type}
              </span>
              <button
                type="button"
                onClick={() => setPhotoEnlarged(false)}
                className="inline-flex h-5 w-5 items-center justify-center rounded text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <X size={14} />
              </button>
            </div>
            <img
              src={evidenceUrl}
              alt="High resolution evidence"
              className="max-h-[80vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
