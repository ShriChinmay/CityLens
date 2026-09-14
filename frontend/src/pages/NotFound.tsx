import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { buttonPrimaryClass } from '../lib/ui';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-subtle">
        <Compass size={22} aria-hidden="true" />
      </div>
      <div className="text-sm font-semibold text-ink-subtle">404</div>
      <h1 className="text-2xl font-semibold text-ink">Page not found</h1>
      <p className="max-w-md text-sm text-ink-muted">
        This page is not available. Return to the overview to continue reviewing road issues.
      </p>
      <Link to="/" className={`${buttonPrimaryClass} mt-2`}>
        Back to overview
      </Link>
    </div>
  );
}
