# CityLens Architecture

## 1. Overview

CityLens is an urban road-condition monitoring system built around an edge-based computer vision pipeline.

The current prototype processes road video at the edge, detects road issues such as potholes, generates structured events, uploads visual evidence to the backend, and publishes the event through MQTT. The backend consumes the MQTT event and stores it in PostgreSQL, while exposing REST APIs for accessing buses, cameras, and detected events.

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
                                └────────────────┘
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

The perception layer uses the computer-vision model to identify road-condition objects in each frame.

The detector currently uses Ultralytics/PyTorch-based inference.

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

The backend currently stores uploaded evidence in local filesystem storage under its evidence directory.

The database does **not** store the image binary itself. Instead, the `events` table stores the `evidence_url` pointing to the stored image.

This keeps the event record lightweight and separates event metadata from binary evidence.

### Current example

```text
Image
  │
  ▼
backend/evidence/<uuid>.jpg
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

The backend MQTT consumer validates/processes the received event and passes it to the event service.

MQTT is therefore acting as the messaging layer rather than as an HTTP API endpoint.

This gives the edge pipeline a decoupled way to send events to the backend.

---

## 6. Backend

The backend is implemented using Node.js and Express.

Its main responsibilities are:

1. Receive and serve evidence images.
2. Consume MQTT events.
3. Validate incoming event data.
4. Store events in PostgreSQL.
5. Expose REST APIs for querying stored data.

The backend is organized into components such as:

```text
backend/
├── controllers/
├── db/
├── mqtt/
├── routes/
├── schemas/
├── services/
└── app.js / server.js
```

### Validation

Event payloads are validated using Zod schemas.

The event schema validates fields including:

- event type
- confidence
- severity
- timestamps
- latitude/longitude
- bus ID
- camera ID

This prevents malformed events from being inserted into the database.

---

## 7. REST API

The backend exposes REST endpoints under:

```text
/api/v1
```

Current API areas include:

```text
GET  /api/v1/events
GET  /api/v1/events/:id

GET  /api/v1/buses
GET  /api/v1/buses/:id

GET  /api/v1/cameras
GET  /api/v1/cameras/:id

POST /api/v1/evidence
```

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

Example fields include:

- `id`
- `bus_number`
- `operator`
- `model`
- `status`
- `created_at`

### Cameras

A camera belongs to a bus.

Example fields include:

- `id`
- `bus_id`
- `camera_type`
- `position`
- `status`
- `created_at`

### Events

An event represents a detected road condition.

Example fields include:

- `id`
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
- `created_at`

Foreign-key constraints ensure that an event references an existing bus and camera.

---

## 9. End-to-End Event Lifecycle

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
```

---

## 10. Current Prototype Boundaries

The current architecture is a working prototype rather than a production deployment.

### Currently implemented

- Edge video processing
- Computer-vision detection
- Object tracking
- Event generation
- MQTT communication
- Backend MQTT consumer
- PostgreSQL persistence
- Bus/camera/event APIs
- Event filtering
- HTTP evidence upload
- Local evidence storage
- Evidence URLs stored with events

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
- Production frontend/dashboard

These are future engineering steps rather than requirements for the current prototype.

---

## 11. Planned Evolution

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
- Real-time dashboard
- Fleet monitoring
- Alerting for high/critical events
- Containerized deployment
- Horizontal backend scaling

---

## 12. Design Principles

CityLens currently follows several important architectural principles:

### Edge-first processing

Computer vision is performed near the data source so that raw video does not have to be continuously transmitted to the backend.

### Event-driven communication

MQTT separates event generation from backend processing.

### Separate metadata and evidence

The event database stores metadata and an evidence URL rather than embedding image binaries directly in the event row.

### Modular components

Detection, tracking, communication, backend services, and persistence are separated so they can evolve independently.

### API-based access

Stored data is exposed through REST APIs, allowing a future frontend or other clients to consume the same backend.

---

## 13. Development Environment

The current prototype is designed to run locally with:

- Python for the edge pipeline
- Node.js for the backend
- PostgreSQL for persistence
- MQTT broker for messaging

A typical local setup therefore consists of:

```text
Terminal 1 → PostgreSQL
Terminal 2 → MQTT broker
Terminal 3 → Node.js backend
Terminal 4 → Python edge pipeline
```

The exact commands and environment configuration are documented in the project README.
