# CityLens Architecture

## 1. Overview

CityLens is an urban road-condition monitoring system built around an edge-based computer vision pipeline, a Node.js/PostgreSQL backend, and a React dashboard.

The current prototype processes road video at the edge, detects road issues such as potholes, generates structured events, uploads visual evidence to the backend, and publishes the event through MQTT. The backend consumes the MQTT event and stores it in PostgreSQL, while exposing REST APIs for accessing buses, cameras, and detected events — and for creating/updating them directly. A React dashboard consumes those same REST APIs to visualize events on a map and browse the fleet.

The current architecture is intentionally modular so that individual components can later be replaced or scaled independently.

---

## 2. High-Level Architecture

```text
                         CITYLENS
                            │
                            ▼
                    ┌───────────────┐
                    │ Video Source  │
                    │  (test video) │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Edge Pipeline │
                    │               │
                    │ Detection     │
                    │ Tracking      │
                    │ Event Builder │
                    └───────┬───────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
                 ▼                     ▼
        ┌─────────────────┐    ┌─────────────────┐
        │ Evidence Upload │    │   MQTT Broker   │
        │      HTTP       │    │ citylens/events │
        └────────┬────────┘    └────────┬────────┘
                 │                      │
                 ▼                      ▼
        ┌─────────────────┐    ┌─────────────────┐
        │ Backend Evidence│    │ MQTT Consumer   │
        │    Endpoint     │    │                 │
        └────────┬────────┘    └────────┬────────┘
                 │                      │
                 ▼                      ▼
        ┌─────────────────┐    ┌─────────────────┐
        │ evidence/       │    │ Event Service   │
        │ local storage   │    │                 │
        └─────────────────┘    └────────┬────────┘
                                        │
                                        ▼
                                ┌─────────────────┐
                                │   PostgreSQL    │
                                │                 │
                                │ buses           │
                                │ cameras         │
                                │ events          │
                                └─────────────────┘
                                        ▲
                                        │
                                ┌───────┴────────┐
                                │   REST API     │
                                │ /api/v1/...    │
                                └───────┬────────┘
                                        │
                                        ▼
                                ┌─────────────────┐
                                │  React Dashboard│
                                │  (frontend/)    │
                                └─────────────────┘
```

---

## 3. Edge Pipeline

The `edge/` component represents the processing performed close to the camera/video source.

### Main stages

```text
Video
  │
  ▼
VideoSource
  │
  ▼
Object Detection
  │
  ▼
Tracking
  │
  ▼
Event Generation
  │
  ├──► Evidence Upload
  │
  └──► MQTT Event
```

### Video source

The video source provides frames to the edge pipeline. The current prototype uses test video rather than a physical bus-mounted camera.

### Detection

The perception layer (`edge/perception/detector.py`) uses the computer-vision model to identify road-condition objects in each frame.

The detector loads the pothole model's PyTorch (`.pt`) weights via `ultralytics.YOLO` and runs inference directly — this is Ultralytics/PyTorch-based inference, not ONNX Runtime. `onnxruntime` is listed in `edge/requirements.txt` and an ONNX export of the pothole model exists (`ml/Potholes_Yolo26n/models/yolo26n_pothole_80e.onnx`), but the current edge pipeline does not call it; it's available for a future lightweight/edge-optimized inference path.

### Tracking

Tracking associates detections across frames using track IDs. This allows the pipeline to reason about the same detected object across multiple frames instead of treating every frame-level detection as an entirely new object.

### Event generation

When the pipeline decides that a detection should become an event, it creates an event payload containing information such as:

- `bus_id`
- `camera_id`
- `event_type`
- `confidence`
- `severity`
- `detected_at`
- `latitude`
- `longitude`
- `metadata`
- `evidence_url`

Example:

```json
{
  "bus_id": 1,
  "camera_id": 1,
  "event_type": "POTHOLE",
  "confidence": 0.833,
  "severity": "MEDIUM",
  "detected_at": "2026-09-13T16:25:25.475039+00:00",
  "latitude": 28.6139122,
  "longitude": 77.209012,
  "metadata": {
    "bbox": [336, 356, 490, 416]
  },
  "evidence_url": "/evidence/example.jpg"
}
```

---

## 4. Evidence Flow

Evidence is handled separately from the MQTT event message.

When an event is generated, the edge pipeline uploads the associated image to the backend using HTTP.

```text
Edge
 │
 │ POST /api/v1/evidence
 │ multipart/form-data
 │ image=<file>
 ▼
Backend
 │
 ├── stores image
 │
 └── returns evidence URL
        │
        ▼
Edge adds evidence_url
to event payload
```

The backend currently stores uploaded evidence in local filesystem storage under `backend/uploads/evidence/`. Uploaded filenames are randomly generated (`crypto.randomUUID()` plus the original extension); accepted types are JPEG, PNG, and WebP, capped at 10 MB.

The database does **not** store the image binary itself. Instead, the `events` table stores the `evidence_url` pointing to the stored image.

This keeps the event record lightweight and separates event metadata from binary evidence.

### Current example

```text
Image
  │
  ▼
backend/uploads/evidence/<uuid>.jpg
  │
  ▼
/evidence/<uuid>.jpg
  │
  ▼
events.evidence_url
```

The backend also serves the evidence through its HTTP server.

For example:

```text
GET /evidence/<uuid>.jpg
```

---

## 5. MQTT Communication

MQTT is used as the event transport between the edge system and backend.

The current topic is:

```text
citylens/events
```

The edge publishes an event to this topic.

```text
Edge
 │
 │ publish(event)
 ▼
MQTT Broker
 │
 │ citylens/events
 ▼
Backend MQTT Consumer
```

The backend MQTT consumer (`backend/mqtt/mqtt.consumer.js`) validates the received event against the same Zod schema used by the REST API, then passes it to the event service to persist in PostgreSQL.

MQTT is therefore acting as the messaging layer rather than as an HTTP API endpoint.

This gives the edge pipeline a decoupled way to send events to the backend. Note that this is not the only path into the event table — the REST API also exposes a direct `POST /api/v1/events` endpoint (see §7) that goes through the same validation and service layer, for manual/testing use.

---

## 6. Backend

The backend is implemented using Node.js and Express.

Its main responsibilities are:

1. Receive and serve evidence images.
2. Consume MQTT events.
3. Validate incoming event, bus, and camera data.
4. Store/update entities in PostgreSQL.
5. Expose REST APIs for querying and mutating stored data.

The backend is organized into components such as:

```text
backend/
├── controllers/     # bus, camera, event, evidence request handlers
├── db/
│   ├── migrations/  # SQL migrations, run via `npm run migrate`
│   └── pool.js       # PostgreSQL connection pool
├── middlewares/
│   └── error.middleware.js  # centralized error → HTTP status mapping
├── mqtt/
│   └── mqtt.consumer.js     # MQTT subscriber → validation → persistence
├── routes/
├── schemas/          # Zod validation schemas
├── services/         # DB access per entity (bus, camera, event)
└── app.js / server.js
```

### Validation

Event, bus, and camera payloads are all validated using Zod schemas (`backend/schemas/`), used both by the REST controllers and the MQTT consumer.

The event schema validates fields including:

- event type
- confidence
- severity
- timestamps
- latitude/longitude
- bus ID
- camera ID

The bus and camera schemas additionally validate a `status` field, one of `ACTIVE`, `INACTIVE`, or `MAINTENANCE`.

This prevents malformed events, buses, and cameras from being inserted into the database.

### Error handling

`backend/middlewares/error.middleware.js` centralizes error responses:

- Zod validation errors → `400` with the validation issues
- Postgres foreign-key violations (`23503`) → `400` ("Invalid bus_id or camera_id")
- Postgres unique-constraint violations (`23505`) → `409` (duplicate record)
- Anything else → `500`

---

## 7. REST API

The backend exposes REST endpoints under:

```text
/api/v1
```

Current API areas include:

```text
GET   /api/v1/events
GET   /api/v1/events/:id
POST  /api/v1/events

GET   /api/v1/buses
GET   /api/v1/buses/:id
POST  /api/v1/buses
PATCH /api/v1/buses/:id

GET   /api/v1/cameras
GET   /api/v1/cameras/:id
POST  /api/v1/cameras
PATCH /api/v1/cameras/:id

POST  /api/v1/evidence
```

`POST /api/v1/events` is validated with the same event schema as the MQTT consumer. In the current prototype, the edge pipeline publishes events over MQTT rather than calling this endpoint directly — it exists as a direct write path for testing, seeding, or future non-MQTT clients.

`POST`/`PATCH` on buses and cameras allow the fleet inventory (bus and camera records) to be managed through the API rather than only via direct database access.

The events endpoint supports filtering by fields such as:

```text
event_type
severity
bus_id
camera_id
```

Example:

```text
GET /api/v1/events?severity=HIGH
```

---

## 8. Database

PostgreSQL is the persistent storage layer.

The current data model includes the following core entities:

```text
Bus
 │
 └── Camera
       │
       └── Event
```

### Buses

A bus represents a vehicle participating in the CityLens sensing system.

Fields:

- `id`
- `bus_number` (unique)
- `operator`
- `model`
- `status` (`ACTIVE`, `INACTIVE`, or `MAINTENANCE`; defaults to `ACTIVE`)
- `created_at`

### Cameras

A camera belongs to a bus.

Fields:

- `id`
- `bus_id` (foreign key → `buses.id`)
- `camera_type`
- `position`
- `status` (`ACTIVE`, `INACTIVE`, or `MAINTENANCE`; defaults to `ACTIVE`)
- `created_at`

### Events

An event represents a detected road condition.

Fields:

- `id`
- `bus_id` (foreign key → `buses.id`)
- `camera_id` (foreign key → `cameras.id`)
- `event_type`
- `confidence` (constrained to 0–1)
- `severity`
- `detected_at`
- `latitude` (constrained to -90–90)
- `longitude` (constrained to -180–180)
- `metadata` (JSONB, defaults to `{}`)
- `evidence_url`
- `created_at`

Foreign-key constraints ensure that an event references an existing bus and camera.

---

## 9. Dashboard

`frontend/` is a React 18 + TypeScript single-page app, built with Vite and styled with Tailwind CSS, that consumes the REST API to visualize the fleet and detected events.

### Structure

```text
frontend/src/
├── api/          # fetch client for the backend + bundled mock data fallback
├── components/   # map, badges, tables, filters, evidence viewer, etc.
├── context/      # theme context
├── lib/          # formatting and utility helpers
├── pages/        # one component per route
└── styles/       # global CSS / design tokens
```

### Routes

```text
/            Overview — key metrics, density map, live detection feed
/events      Road anomaly list — filter by type, severity, bus
/events/:id  Anomaly detail — confidence gauge, GPS, evidence viewer
/buses       Fleet inventory — bus list and status
/buses/:id   Bus detail — mounted cameras, events from that bus
/cameras     Camera inventory — mount position, status
*            404 fallback
```

### Data flow

The dashboard's API client (`frontend/src/api/client.ts`) calls the backend's `/api/v1/*` and `/health` endpoints. If a request fails (e.g. the backend is not running), the client transparently falls back to bundled mock data (`frontend/src/api/mockData.ts`) rather than showing a broken UI. This makes the dashboard usable for UI preview/demo purposes even without the rest of the stack running, and mirrors the edge pipeline's own offline-first philosophy (§13).

The Leaflet map renders events as severity-colored markers (critical/high/medium/low) and links each marker to its detail view.

---

## 10. ML Models

`ml/` contains the trained model weights used by (or intended for) the CityLens pipeline.

### Pothole detection — `ml/Potholes_Yolo26n/`

This is the model actually used by the edge pipeline today.

- YOLO26n (nano), fine-tuned on pothole imagery for 80 epochs
- mAP@50 0.788, precision 0.79, recall 0.73
- Single class: `pothole`
- Available as `.pt` (used by `edge/perception/detector.py` via Ultralytics) and `.onnx` (ONNX Runtime export, not currently called by the edge pipeline)
- Also ships a standalone `predict.py` module with its own image/video inference API, independent of the edge pipeline's own `Detector` class — see `ml/Potholes_Yolo26n/README.md`

### Vehicle detection — `ml/Traffic_Model/`

A separate, fine-tuned YOLO26n model for Indian road vehicle detection, trained on the IRUVD dataset (4,000 annotated frames). It detects 14 classes relevant to Indian traffic — auto-rickshaws, e-rickshaws, cycle-rickshaws, totos, tempos, cars, buses, trucks, pedestrians, and more.

**This model is not currently integrated into the edge pipeline or backend.** No code in `edge/` or `backend/` loads or calls it. It exists as trained weights (`best.pt`, `best.onnx`) plus documentation, ready to support the "Traffic / vehicle analytics" roadmap item — vehicle counting, tracking, speed estimation, and congestion metrics would be built on top of it. See `ml/Traffic_Model/README.md` for class list and usage.

---

## 11. End-to-End Event Lifecycle

A typical pothole event currently follows this path:

```text
1. Video frame arrives
          │
          ▼
2. YOLO/vision model detects pothole
          │
          ▼
3. Tracker associates detection with a track
          │
          ▼
4. Edge creates event
          │
          ├───────────────┐
          │               │
          ▼               ▼
5. Image uploaded    6. Event published
   over HTTP            over MQTT
          │               │
          ▼               ▼
7. Backend returns   8. MQTT consumer
   evidence URL          receives event
          │               │
          └───────┬───────┘
                  ▼
9. Event contains evidence_url
                  │
                  ▼
10. Event service inserts record
                  │
                  ▼
11. PostgreSQL stores event metadata
                  │
                  ▼
12. REST API exposes the event
                  │
                  ▼
13. Dashboard fetches and renders the event
```

---

## 12. Current Prototype Boundaries

The current architecture is a working prototype rather than a production deployment.

### Currently implemented

- Edge video processing
- Computer-vision detection
- Object tracking
- Event generation
- MQTT communication
- Backend MQTT consumer
- PostgreSQL persistence
- Bus/camera/event APIs, including create and update
- Event filtering
- HTTP evidence upload
- Local evidence storage
- Evidence URLs stored with events
- React dashboard consuming the REST API, with offline mock-data fallback

### Not yet production-ready

- Cloud object storage
- Authentication and authorization
- HTTPS/TLS configuration
- MQTT authentication/TLS
- Production deployment
- Distributed MQTT infrastructure
- Robust retry/dead-letter handling
- Centralized logging and monitoring
- Database migrations/production deployment workflow
- High-performance GPU inference
- Large-scale event deduplication
- Vehicle/traffic model integration (`ml/Traffic_Model/` is trained but not wired in)
- Production frontend build/deployment pipeline

These are future engineering steps rather than requirements for the current prototype.

---

## 13. Planned Evolution

A possible future architecture is:

```text
                         ┌───────────────┐
                         │ Fleet of Buses│
                         └───────┬───────┘
                                 │
                                 ▼
                         Edge Processing
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
              MQTT / Events             Image Upload
                    │                         │
                    ▼                         ▼
             MQTT Infrastructure      Object Storage
                    │                         │
                    └────────────┬────────────┘
                                 ▼
                           Backend Services
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
                PostgreSQL    Analytics    REST API
                    │                         │
                    └────────────┬────────────┘
                                 ▼
                           Web Dashboard
```

Potential future improvements include:

- S3-compatible/object storage for evidence
- PostGIS for geospatial queries
- Authentication and role-based access
- Event aggregation and deduplication
- Route-level road-condition analytics
- Integrating `ml/Traffic_Model/` for vehicle counting, tracking, and congestion metrics
- Fleet monitoring
- Alerting for high/critical events
- Containerized deployment
- Horizontal backend scaling

---

## 14. Design Principles

CityLens currently follows several important architectural principles:

### Edge-first processing

Computer vision is performed near the data source so that raw video does not have to be continuously transmitted to the backend.

### Event-driven communication

MQTT separates event generation from backend processing.

### Separate metadata and evidence

The event database stores metadata and an evidence URL rather than embedding image binaries directly in the event row.

### Modular components

Detection, tracking, communication, backend services, persistence, and the dashboard are separated so they can evolve independently.

### API-based access

Stored data is exposed through REST APIs, which the dashboard consumes as just another client — the same APIs are available to other future clients (mobile apps, third-party integrations, etc.).

### Graceful degradation

Both the edge pipeline (local SQLite queue when offline) and the dashboard (mock-data fallback when the backend is unreachable) are designed to keep functioning, in a reduced form, when a dependency is unavailable.

---

## 15. Development Environment

The current prototype is designed to run locally with:

- Python for the edge pipeline
- Node.js for the backend
- Node.js for the frontend dashboard
- PostgreSQL for persistence
- MQTT broker for messaging

A typical local setup therefore consists of:

```text
Terminal 1 → PostgreSQL
Terminal 2 → MQTT broker
Terminal 3 → Node.js backend
Terminal 4 → Python edge pipeline
Terminal 5 → Frontend dev server (npm run dev)
```

The exact commands and environment configuration are documented in the project README.
