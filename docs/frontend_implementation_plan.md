# CityLens Frontend — Minimal Professional Reimplementation Plan

## Purpose

Rebuild the CityLens frontend as a calm, credible civic-operations product. The current implementation should not be incrementally decorated: its visual system, layout hierarchy, and component boundaries should be replaced.

This is a **planning document only**. It does not authorize implementation, dependency installation, server startup, backend changes, or Git operations.

## The Product Direction

CityLens is a workspace for people responsible for reviewing road-condition reports. It should feel like a well-made operational tool, not an AI demo, military dashboard, or futuristic control room.

The visual character should be:

- Minimal, light-first, and editorial rather than dark and decorative.
- Information-led: data, map, and evidence have visual priority over gradients and ornament.
- Calm but decisive: use color only for severity and important actions.
- Dense enough for daily operational use, with comfortable spacing and obvious hierarchy.
- Accessible: readable contrast, keyboard-visible focus states, semantic controls, and no animation required to understand state.

Avoid all of the following: neon glows, glassmorphism, radar imagery, fake pings/FPS/latency, all-caps technical labels, pulsing decorations, heavy gradients, and duplicate summary cards.

## Technical Direction

Do **not** replace React. React is not the visual problem; the problem is the current unstructured CSS and the lack of a coherent design system.

Use:

| Area | Decision |
| --- | --- |
| Framework | Keep React 18 + Vite |
| Language | Migrate frontend files from JSX to TypeScript (`.tsx`) during the rewrite |
| Styling | Tailwind CSS with a small token-based theme in `tailwind.config` and `src/styles/globals.css` |
| UI primitives | Radix UI only where behavior is difficult to implement accessibly (select, dialog, tooltip) |
| Icons | Lucide React; one consistent stroke style, no custom decorative icon set |
| Maps | Keep React Leaflet; default to a light, low-detail basemap |
| Data/API | Keep the existing API client and offline fallback contract |

Use `clsx` and `tailwind-merge` for class composition. Do not introduce a large all-in-one dashboard/template library. `shadcn/ui`-style components may be used as local source components, but only for the small set defined below; do not add components merely because a library provides them.

## Design Tokens

Define the following tokens once and use them everywhere. The next implementation should not use ad-hoc hex values in components.

| Token group | Direction |
| --- | --- |
| Canvas | Warm off-white `#F8FAFC`; dark mode is secondary, not the primary design target |
| Surfaces | White, 1px cool-gray border, very subtle shadow only where elevation is useful |
| Text | Slate/navy hierarchy: near-black headings, muted gray descriptions, no low-contrast gray text |
| Brand | One restrained indigo/blue for links, selected navigation, and primary action |
| Severity | Semantic green, amber, orange, red; each has a text, soft-background, and border token |
| Radius | 8px controls, 12px cards, 16px primary feature surface; no pill-shaped containers except statuses |
| Typography | Inter or Geist; 14px base, 12px metadata, 16px body, 24–30px page titles |
| Spacing | 4px base scale; page gutters 32px desktop and 16px mobile |

## Information Architecture

Keep the existing routes and data relationships:

- Overview (`/`)
- Road issues (`/events`)
- Road issue detail (`/events/:id`)
- Vehicles (`/buses`)
- Vehicle detail (`/buses/:id`)
- Cameras (`/cameras`)

Navigation should use simple, human labels: **Overview**, **Road issues**, **Vehicles**, **Cameras**. Do not expose terms such as “edge mesh,” “inference core,” “telemetry node,” or “command center” in the product UI.

## App Shell

### Desktop

- Fixed 232–248px left sidebar: CityLens wordmark, the four navigation items, then one small connection indicator at the bottom.
- 64px top bar: breadcrumb on the left; one timestamp or refresh affordance and theme toggle on the right.
- Content area: max width 1440px, comfortable whitespace, no background grid texture.

### Mobile

- Replace the fixed sidebar with a compact top bar and an accessible navigation drawer.
- Keep primary page controls visible; tables must scroll horizontally within their own container.
- Stack dashboard sections in priority order: priority summary, map, latest reports, issue mix.

## Component Inventory

Build a compact local component set before rebuilding pages:

| Component | Responsibility |
| --- | --- |
| `AppShell` | Sidebar/topbar/layout and responsive navigation drawer |
| `PageHeader` | Title, supporting text, and optional actions |
| `Metric` | Small label + value + optional supporting note; not a decorative card by default |
| `Surface` | Consistent card/panel shell with optional header and footer |
| `StatusBadge` | Vehicle/camera status only |
| `SeverityBadge` | Issue severity only |
| `IssueTypeBadge` | Road issue type only |
| `DataTable` | Shared table wrapper, empty state, and mobile overflow behavior |
| `FilterBar` | Typed filters with clear/reset action |
| `EmptyState` | Plain empty, loading, and error states |
| `EvidenceViewer` | Image thumbnail and accessible dialog/lightbox |

Each component must have a small typed API. No inline style objects except dynamic values such as map marker color or percentage width.

## Page Specifications

### Overview

Make the map the focal point, not a row of metrics.

1. `PageHeader`: “Overview” with one-line summary and Refresh action.
2. A quiet priority strip: number of high/critical issues, with critical/high counts; it is informative, not a hero banner.
3. Two-column main area:
   - Main (about 70%): map with a compact title, severity filter tabs, and legend.
   - Side (about 30%): “Latest reports” list with issue type, severity, time, vehicle, and a small evidence thumbnail when present.
4. Bottom row: small issue-mix chart and three compact metrics (all reports, vehicles online, cameras online).

The map must be at least 520px high on desktop, visually clean, and use restrained severity markers. It must not include radar rings, HUD overlays, animated pins, or fake location labels.

### Road Issues

- Page title, result count, then filters in a single clean toolbar.
- Data table is the dominant element.
- Columns: issue type, severity, confidence, reported time, vehicle, coordinates, details action.
- Use one colored badge per row for severity; do not color every cell.
- Preserve sorting and filters, including an obvious “Clear filters” action.

### Road Issue Detail

- Back link, page title composed from issue type + severity, then a two-column detail layout.
- Left: evidence image and issue metadata.
- Right: map position, vehicle association, confidence, and report timestamp.
- Details should be grouped under short labels; no raw “telemetry payload” panel unless actual data is present and useful.

### Vehicles and Cameras

- Use the same page structure: header, three compact metrics, search/filter toolbar, data table.
- Avoid repeated large cards. A metric row is sufficient.
- Vehicle and camera detail pages should be profile-like: identity and status at top, related cameras/issues below.

## Interaction and Content Rules

- Refresh means “Refresh data,” not “Sync telemetry.”
- Use “Detection confidence,” not “AI match” or model jargon.
- Connection state must be truthful: “Connected” for the backend, “Demo data” for fallback data.
- All loading, empty, and error states must use natural language.
- Every icon button needs an accessible name and tooltip.
- Respect `prefers-reduced-motion`; keep transitions under 180ms and use them only for feedback.

## Implementation Sequence for the Next Model

1. Install and configure TypeScript, Tailwind CSS, Lucide React, `clsx`, and `tailwind-merge`. Add Radix primitives only if a required control needs them.
2. Preserve the existing API client and mock fallback. Define TypeScript types from its actual response shapes.
3. Replace the global CSS files with tokens and Tailwind layers. Remove all visual rules tied to neon/radar/glass styling.
4. Build `AppShell` and the shared component inventory; verify dark mode remains readable but prioritize light mode.
5. Rebuild Overview from the page specification, then Road Issues, detail, Vehicles, and Cameras.
6. Add responsive behavior and keyboard interaction before decorative refinement.
7. Run production build, verify all routes with live and fallback data, and inspect desktop (1440px) and mobile (390px) layouts.

## Acceptance Criteria

- The app looks like a polished B2B civic-operations tool at first glance.
- Light mode is the default and is fully usable; dark mode is a deliberate alternate theme.
- Overview has a clear map-first hierarchy and no generic four-card opening.
- There is no visible faux-technical language or animated decoration.
- Every route uses the same surfaces, spacing, labels, states, and table behavior.
- No backend, edge, ML, database, or API contract changes are required.
- `npm run build` passes after implementation.
- No Git push is performed.
