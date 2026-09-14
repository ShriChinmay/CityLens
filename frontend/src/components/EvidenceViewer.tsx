import { useEffect, useRef, useState } from 'react';
import { ImageOff, Maximize2, X } from 'lucide-react';
import { getEvidenceUrl } from '../api/client';
import { cn } from '../lib/cn';

interface EvidenceViewerProps {
  evidenceUrl?: string | null;
  title?: string;
  className?: string;
}

export function EvidenceViewer({
  evidenceUrl,
  title = 'Evidence photo',
  className,
}: EvidenceViewerProps) {
  const [failed, setFailed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const url = getEvidenceUrl(evidenceUrl);

  useEffect(() => {
    setFailed(false);
  }, [evidenceUrl]);

  if (!url || failed) {
    return (
      <div className={cn('overflow-hidden rounded-card border border-line bg-surface', className)}>
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
          <ImageOff size={22} className="text-ink-subtle" aria-hidden="true" />
          <p className="text-sm text-ink-muted">No evidence photo available</p>
          <p className="text-xs text-ink-subtle">
            The photo was not captured or could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-card border border-line bg-surface', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand transition-colors hover:text-brand-hover"
        >
          <Maximize2 size={13} aria-hidden="true" />
          Enlarge
        </button>
      </div>

      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="group relative block w-full"
        aria-label={`Enlarge ${title}`}
      >
        <img
          src={url}
          alt={title}
          onError={() => setFailed(true)}
          loading="lazy"
          className="max-h-[420px] w-full object-cover"
        />
        <span className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-ink/40 text-sm font-medium text-white group-hover:flex">
          View full size
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto max-h-[92vh] w-[92vw] max-w-5xl rounded-card border border-line bg-surface p-0 backdrop:bg-ink/70"
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            dialogRef.current?.close();
          }
        }}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-sm font-medium text-ink">{title}</span>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-2"
            aria-label="Close"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <img src={url} alt={title} className="max-h-[80vh] w-full object-contain" />
      </dialog>
    </div>
  );
}
