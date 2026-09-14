import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Bus,
  Camera,
  Compass,
  LayoutDashboard,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { fetchHealth } from '../api/client';

interface NavTab {
  to: string;
  label: string;
  icon: ComponentType<{ size?: string | number; className?: string }>;
  end?: boolean;
}

const NAV_TABS: NavTab[] = [
  { to: '/', label: 'Live Operations', icon: LayoutDashboard, end: true },
  { to: '/events', label: 'Incidents', icon: TriangleAlert },
  { to: '/buses', label: 'Fleet', icon: Bus },
  { to: '/cameras', label: 'Vision', icon: Camera },
];

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [localTime, setLocalTime] = useState<string>('');

  const checkConnection = async () => {
    try {
      const res = await fetchHealth();
      setConnected(Boolean(res?.status === 'ok'));
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateClock = () => {
      setLocalTime(
        new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date())
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerManualRefresh = async () => {
    setRefreshing(true);
    await checkConnection();
    window.dispatchEvent(new CustomEvent('citylens:refresh'));
    setTimeout(() => setRefreshing(false), 500);
  };

  const isLiveOps = location.pathname === '/';

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-canvas text-ink">
      {/* Streamlined Operational Header */}
      <header className="relative z-30 flex h-11 shrink-0 items-center justify-between border-b border-line bg-surface px-4 select-none">
        {/* Left: Brand & Incident Ops Subtitle */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-ink font-semibold tracking-tight text-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-surface-2 border border-line text-ink-muted">
              <Compass size={13} aria-hidden="true" />
            </span>
            <span>CityLens</span>
          </div>
          <span className="text-ink-subtle text-xs select-none">/</span>
          <span className="text-xs text-ink-muted font-normal">Incident Ops</span>
        </div>

        {/* Center: Clean Operational Tabs */}
        <nav className="flex items-center gap-0.5" aria-label="Operations Views">
          {NAV_TABS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-sm',
                  isActive
                    ? 'text-ink bg-surface-2 font-semibold'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-2/50'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span>{label}</span>
                  {isActive && (
                    <span className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 h-[2px] w-4 bg-accent rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right: Demo Mode Status + Clock + Refresh */}
        <div className="flex items-center gap-4 text-xs">
          {/* Subtle Demo Status Indicator */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            {connected === null ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-ink-subtle animate-pulse" />
                <span className="text-ink-subtle">CONNECTING...</span>
              </>
            ) : connected ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-low" />
                <span className="text-ink-muted">API ONLINE</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-medium" />
                <span className="text-ink-muted text-[10px] tracking-wide uppercase">DEMO MODE · BACKEND OFFLINE</span>
              </>
            )}
          </div>

          {/* Clock: 24h format */}
          <span className="hidden font-mono text-xs text-ink-subtle md:inline-block">
            {localTime || '00:00:00'}
          </span>

          {/* Refresh Control */}
          <button
            type="button"
            onClick={triggerManualRefresh}
            disabled={refreshing}
            className="inline-flex h-6 items-center gap-1 rounded border border-line bg-surface-2 px-2 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50"
            title="Refresh incident telemetry"
          >
            <RefreshCw size={11} className={cn(refreshing && 'animate-spin text-accent')} />
            <span className="text-[11px]">Refresh</span>
          </button>
        </div>
      </header>

      {/* Main View Area */}
      {isLiveOps ? (
        // Operations Console: full height, zero padding, map dominates viewport
        <main className="h-[calc(100vh-44px)] w-full overflow-hidden flex flex-col">
          {children}
        </main>
      ) : (
        // Secondary pages: clean operational container
        <main className="h-[calc(100vh-44px)] w-full overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      )}
    </div>
  );
}
