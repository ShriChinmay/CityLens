# CityLens Frontend Dashboard

Autonomous urban sensing & road anomaly intelligence web dashboard for CityLens (Smart India Hackathon). Built with **React 18**, **Vite**, **Leaflet** maps, and custom CSS design system.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node v22)
- CityLens Backend running on `http://localhost:3000` (optional for preview; dashboard handles offline backend gracefully)

### 2. Run the Development Server
```bash
cd frontend
npm install
npm run dev
```

The app will be accessible at:
```
http://localhost:5173
```

The Vite dev server automatically proxies requests to `/api`, `/evidence`, and `/health` to `http://localhost:3000`.

### 3. Production Build
```bash
npm run build
```

---

## 🎨 Design System & Features

- **Minimalist Dark Aesthetic**: Vercel & Linear inspired dark palette (`#0a0a0b` background, `#111113` surface, `#222226` borders)
- **Interactive CartoDB Dark Matter Leaflet Map**:
  - Live color-coded circle markers by severity:
    - 🔴 **Critical** (`#ef4444`)
    - 🟠 **High** (`#f97316`)
    - 🟡 **Medium** (`#eab308`)
    - 🟢 **Low** (`#22c55e`)
  - Smooth pan/zoom and interactive popup cards linking to full incident telemetry
- **Full Route Suite**:
  - `/`: **Command Center / Dashboard** — Key telemetry metrics, density map, and live detection feed
  - `/events`: **Road Anomalies** — Search, filter by severity, anomaly type (Pothole, Damaged Road, Waterlogging, Accident), and transit bus
  - `/events/:id`: **Anomaly Inspection** — Model inference confidence gauge, GPS coordinates, vehicle attribution, and high-res evidence viewer with fullscreen lightbox
  - `/buses`: **Transit Fleet** — Fleet inventory, active operational status, and vehicle telemetry
  - `/buses/:id`: **Bus Detail** — Mounted camera units, registration profile, and incidents detected by this bus
  - `/cameras`: **Edge Sensors** — Optical camera inventory, mount position filters (Front, Rear, Side), and coverage ratio
  - `*`: **404 Page** — Graceful fallback
- **Zero Heavy UI Libraries**: 100% custom CSS tokens and responsive layout.
