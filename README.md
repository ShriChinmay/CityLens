# CityLens

> **AI-powered urban sensing using public transport buses**

CityLens turns public transport buses into **mobile urban sensing
units**. Cameras mounted on buses process road-scene video at the
edge, detect infrastructure problems such as potholes, associate
detections with GPS coordinates, capture evidence, and send lightweight
event metadata to a central backend, where a live dashboard makes the
data explorable.

The current prototype demonstrates an end-to-end **pothole detection →
evidence upload → MQTT → PostgreSQL → dashboard** pipeline.

------------------------------------------------------------------------

## Overview

Instead of continuously uploading raw camera footage to a central
server, CityLens follows an edge-first architecture:

``` text
                CITYLENS
                   │
        ┌──────────┴──────────┐
        │                     │
    EDGE / BUS           CENTRAL SERVER
        │                     │
   ┌────┴────┐          ┌─────┴─────┐
 Camera     GPS        MQTT       REST API
   │         │          │             │
   └────┬────┘          ▼             ▼
        │            Backend      PostgreSQL
        ▼               │             │
    AI Detection        └──────┬──────┘
        │                      │
     Tracking                  ▼
        │                  Dashboard
        ▼
   Event Generation
        │
   ┌────┴─────┐
   │          │
 MQTT       HTTP
 metadata   evidence
```

### Core idea

``` text
Camera
  ↓
Edge AI
  ↓
Detection + Tracking
  ↓
GPS association
  ↓
Event
  ├── MQTT → Backend
  └── HTTP → Evidence upload
              ↓
          PostgreSQL
              ↓
          Dashboard
```

This reduces the amount of data that needs to be transmitted while
preserving useful information about detected urban events.

------------------------------------------------------------------------

## Current Prototype

The current implementation includes:

-   Pothole detection using a YOLO-based model
-   OpenCV video processing
-   Object tracking
-   Simulated GPS
-   Event generation and severity classification
-   Local SQLite event storage on the edge
-   Evidence snapshot upload over HTTP
-   MQTT event communication
-   Mosquitto MQTT broker
-   Node.js + Express backend
-   PostgreSQL persistence
-   REST APIs for buses, cameras, events, and evidence (including create/update)
-   Event validation using Zod
-   Evidence files served by the backend
-   A React + TypeScript dashboard with a live map, event/vehicle/camera
    views, and an offline-friendly mock-data fallback

A fine-tuned Indian-road vehicle detection model (14 vehicle classes)
also exists in `ml/Traffic_Model/` but is not yet wired into the edge
pipeline or backend — see [ML Models](#ml-models) below.

### End-to-end flow currently working

``` text
Test Video
    ↓
YOLO Pothole Detection
    ↓
Tracking / Event Confirmation
    ↓
Simulated GPS
    ↓
Evidence Snapshot
    ↓
HTTP POST /api/v1/evidence
    ↓
Evidence URL
    ↓
MQTT citylens/events
    ↓
MQTT Consumer
    ↓
Zod Validation
    ↓
PostgreSQL
    ↓
REST API
    ↓
Dashboard
```

For example, an event can look like:

``` json
{
  "bus_id": 1,
  "camera_id": 1,
  "event_type": "POTHOLE",
  "confidence": 0.83,
  "severity": "MEDIUM",
  "detected_at": "2026-09-13T16:25:25Z",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "metadata": {
    "bbox": [336, 356, 490, 416]
  },
  "evidence_url": "/evidence/example.jpg"
}
```

------------------------------------------------------------------------

## Repository Structure

``` text
CityLens/
│
├── backend/                 # Node.js / Express backend
│   ├── controllers/
│   ├── db/
│   │   └── migrations/
│   ├── middlewares/
│   ├── mqtt/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   ├── uploads/
│   │   └── evidence/        # Local runtime evidence (ignored by Git)
│   ├── app.js
│   └── server.js
│
├── data/                    # Prototype videos / test data
│
├── docs/
│   └── architecture.md      # Detailed system architecture
│
├── edge/                    # Bus-side processing pipeline
│   ├── camera/
│   ├── communication/
│   ├── config/
│   ├── events/
│   ├── gps/
│   ├── perception/
│   ├── storage/
│   ├── tracking/
│   ├── main.py
│   └── requirements.txt
│
├── frontend/                # React + TypeScript dashboard
│   └── src/
│       ├── api/             # Backend client + mock-data fallback
│       ├── components/      # Map, badges, tables, filters, etc.
│       ├── pages/           # Overview, Road Issues, Vehicles, Cameras
│       └── styles/
│
├── ml/                      # ML models and related assets
│   ├── Potholes_Yolo26n/    # Pothole detection model (in use)
│   └── Traffic_Model/       # Indian vehicle detection model (not yet integrated)
│
├── .gitignore
└── README.md
```

------------------------------------------------------------------------

## Technology Stack

  Layer                   Technology
  ----------------------- ---------------------------------------
  Edge                    Python
  Computer Vision         OpenCV
  Object Detection        Ultralytics YOLO
  Tracking                Tracking module used by edge pipeline
  Edge Storage            SQLite
  Edge → Backend Events   MQTT
  Evidence Upload         HTTP
  MQTT Broker             Mosquitto
  Backend                 Node.js + Express
  Validation              Zod
  Database                PostgreSQL
  Frontend                React 18 + TypeScript + Vite + Tailwind + Leaflet

------------------------------------------------------------------------

# Getting Started

## Prerequisites

Install:

-   Git
-   Node.js 18+ (for both backend and frontend)
-   Python 3
-   PostgreSQL
-   Mosquitto MQTT broker

You also need the Python dependencies listed in:

``` text
edge/requirements.txt
```

------------------------------------------------------------------------

## 1. Clone the repository

``` bash
git clone https://github.com/ShriChinmay/CityLens.git
cd CityLens
```

------------------------------------------------------------------------

# Backend Setup

## 2. Create the PostgreSQL database

Create a PostgreSQL database named:

``` text
citylens
```

For example:

``` sql
CREATE DATABASE citylens;
```

Make sure PostgreSQL is running.

------------------------------------------------------------------------

## 3. Configure environment variables

Create:

``` text
backend/.env
```

The backend uses PostgreSQL configuration variables such as:

``` env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=citylens
DB_USER=postgres
DB_PASSWORD=your_password

PORT=3000

MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_TOPIC=citylens/events
```


A real deployment should use secure secret management rather than
storing credentials in files.

------------------------------------------------------------------------

## 4. Install backend dependencies

``` powershell
cd backend
npm install
```

------------------------------------------------------------------------

## 5. Run database migrations

From the `backend` directory:

``` powershell
npm run migrate
```

The migration runner creates the required database tables.

Current migrations include:

``` text
001_create_buses.sql
002_create_cameras.sql
003_create_events.sql
```

------------------------------------------------------------------------

## 6. Start the backend

``` powershell
npm start
```

The API runs on:

``` text
http://localhost:3000
```

Health check:

``` powershell
Invoke-RestMethod http://localhost:3000/health
```

Expected:

``` text
status
------
ok
```

------------------------------------------------------------------------

# MQTT Setup

Start the Mosquitto broker on:

``` text
localhost:1883
```

The current prototype uses:

``` text
Topic: citylens/events
```

The backend MQTT consumer subscribes to this topic and stores validated
events in PostgreSQL.

------------------------------------------------------------------------

# Edge Setup

## 7. Install Python dependencies

From the repository root:

``` powershell
python -m pip install -r edge/requirements.txt
```

The edge requirements include:

``` text
ultralytics
opencv-python
onnxruntime
paho-mqtt
requests
```

> **Note:** the current edge pipeline (`edge/perception/detector.py`)
> loads the PyTorch (`.pt`) weights via Ultralytics. `onnxruntime` is
> installed but not yet used by the pipeline itself — the pothole
> model's `.onnx` export is available for future edge/lightweight
> deployment (see [ML Models](#ml-models)).

------------------------------------------------------------------------

## 8. Run the edge pipeline

From the repository root:

``` powershell
python -m edge.main
```

The edge pipeline:

1.  Reads the configured video source
2.  Runs pothole detection
3.  Tracks detections
4.  Confirms events
5.  Associates GPS coordinates
6.  Captures the relevant frame
7.  Uploads evidence to the backend
8.  Saves the event locally
9.  Publishes the event through MQTT

------------------------------------------------------------------------

# Frontend / Dashboard Setup

## 9. Install frontend dependencies

``` bash
cd frontend
npm install
```

## 10. Run the development server

``` bash
npm run dev
```

The dashboard runs on:

``` text
http://localhost:5173
```

The Vite dev server proxies `/api`, `/evidence`, and `/health` requests
to the backend at `http://localhost:3000`.

If the backend isn't running, the dashboard still loads — it falls back
to bundled mock data so the UI can be previewed standalone.

### Available routes

``` text
/            Command center — key metrics, density map, live feed
/events      Road anomalies — search/filter by type, severity, bus
/events/:id  Anomaly detail — confidence, GPS, evidence viewer
/buses       Transit fleet — bus inventory and status
/buses/:id   Bus detail — mounted cameras and its detected events
/cameras     Edge sensors — camera inventory and mount position
*            404 page
```

### Production build

``` bash
npm run build
```

See `frontend/readme.md` for more detail on the dashboard's design
system and features.

------------------------------------------------------------------------

# Evidence Handling

Evidence images are uploaded separately from MQTT event metadata.

``` text
Edge
 │
 ├── HTTP POST
 │      /api/v1/evidence
 │
 │      └── image
 │
 ▼
Backend
 │
 └── stores image
       │
       └── returns evidence URL
```

The event then contains the returned URL:

``` json
{
  "event_type": "POTHOLE",
  "evidence_url": "/evidence/<uuid>.jpg"
}
```

The backend serves uploaded evidence through:

``` text
GET /evidence/<filename>
```

For example:

``` text
http://localhost:3000/evidence/<filename>.jpg
```

Evidence uploaded during local development is runtime data and is
ignored by Git.

------------------------------------------------------------------------

# REST API

The current backend exposes endpoints for the main prototype entities.

## Health

``` http
GET /health
```

## Events

``` http
GET  /api/v1/events
GET  /api/v1/events/:id
POST /api/v1/events
```

`POST /api/v1/events` accepts the same event payload described in
[Event Schema](#event-schema) and is validated with the same Zod
schema used by the MQTT consumer. In the current prototype, events
normally arrive via MQTT from the edge pipeline — this endpoint exists
for direct/manual event creation (e.g. testing, seeding, or future
non-MQTT clients).

Filtering is supported on `GET /api/v1/events` for fields such as:

``` text
event_type
severity
bus_id
camera_id
```

Examples:

``` text
GET /api/v1/events?severity=HIGH
GET /api/v1/events?event_type=POTHOLE
```

## Buses

``` http
GET   /api/v1/buses
GET   /api/v1/buses/:id
POST  /api/v1/buses
PATCH /api/v1/buses/:id
```

`POST`/`PATCH` accept `bus_number`, `operator`, `model`, and `status`
(`ACTIVE`, `INACTIVE`, or `MAINTENANCE`).

## Cameras

``` http
GET   /api/v1/cameras
GET   /api/v1/cameras/:id
POST  /api/v1/cameras
PATCH /api/v1/cameras/:id
```

`POST`/`PATCH` accept `bus_id`, `camera_type`, `position`, and
`status` (`ACTIVE`, `INACTIVE`, or `MAINTENANCE`).

## Evidence

``` http
POST /api/v1/evidence
```

Accepts a multipart `image` field (JPEG, PNG, or WebP, up to 10 MB)
and returns the stored evidence URL.

------------------------------------------------------------------------

# Event Schema

Events currently support:

### Event types

``` text
POTHOLE
DAMAGED_ROAD
WATERLOGGING
ACCIDENT
```

### Severity

``` text
LOW
MEDIUM
HIGH
CRITICAL
```

### Event fields

``` text
bus_id
camera_id
event_type
confidence
severity
detected_at
latitude
longitude
metadata
evidence_url
```

The backend validates incoming events — whether from MQTT or the REST
`POST /api/v1/events` endpoint — before inserting them into
PostgreSQL.

------------------------------------------------------------------------

# Architecture

A more detailed architectural description is available in:

``` text
docs/architecture.md
```

The intended architecture is based on an edge-first model:

``` text
Bus Camera
    ↓
Edge Processing
    ↓
AI Detection
    ↓
Event Generation
    ↓
┌───────────────┬────────────────┐
│               │                │
MQTT            HTTP             │
│               │                │
Event           Evidence         │
Metadata        Snapshot         │
│               │                │
└───────┬───────┴────────────────┘
        ↓
     Backend
        ↓
   PostgreSQL
        ↓
    REST API
        ↓
    Dashboard
```

------------------------------------------------------------------------

# Why MQTT + HTTP?

CityLens intentionally separates event metadata from evidence images.

### MQTT

Used for lightweight event communication:

``` text
confidence
severity
GPS
event type
bus ID
camera ID
timestamp
evidence URL
```

### HTTP

Used for comparatively large binary evidence:

``` text
JPEG / PNG / WebP
```

This avoids pushing image data through MQTT and keeps event messages
lightweight.

------------------------------------------------------------------------

# Offline-First Design

## Edge

The edge pipeline also maintains local event storage.

If the network is temporarily unavailable:

``` text
Detection
   ↓
Local SQLite
   ↓
Wait for connectivity
   ↓
MQTT upload
```

This allows the edge system to continue processing instead of
immediately losing detected events.

## Dashboard

The frontend applies the same philosophy for demos and development: if
the backend is unreachable, the dashboard's API client transparently
falls back to bundled mock data instead of showing a broken UI.

------------------------------------------------------------------------

# ML Models

`ml/` contains the trained model assets used (or intended for future
use) by the project.

### `ml/Potholes_Yolo26n/` — in use

The pothole detector currently driving the edge pipeline.

-   YOLO26n (nano), fine-tuned on pothole data for 80 epochs
-   mAP@50 0.788, precision 0.79, recall 0.73
-   Single class: `pothole`
-   Ships as both `.pt` (PyTorch/Ultralytics, used by the edge
    pipeline today) and `.onnx` (ONNX Runtime, for future lightweight
    edge deployment)
-   Includes a standalone `predict.py` module with its own image/video
    inference API — see `ml/Potholes_Yolo26n/README.md`

### `ml/Traffic_Model/` — trained, not yet integrated

A fine-tuned YOLO26n model for Indian road vehicle detection, trained
on the IRUVD dataset (4,000 frames). Detects 14 vehicle classes
relevant to Indian traffic (auto-rickshaws, e-rickshaws, tempos, totos,
cycle-rickshaws, buses, trucks, pedestrians, and more).

This model is **not currently called from the edge pipeline or
backend**. It corresponds to the "Traffic / vehicle analytics" item in
the [Development Roadmap](#development-roadmap) below — the weights
already exist, but downstream integration (tracking, counting, speed
estimation, congestion metrics) is future work. See
`ml/Traffic_Model/README.md` for usage and class details.

------------------------------------------------------------------------

# Development Roadmap

## Completed

-   [x] Edge video pipeline
-   [x] Pothole detection
-   [x] Object tracking
-   [x] Simulated GPS
-   [x] Event generation
-   [x] Local edge event storage
-   [x] MQTT communication
-   [x] Mosquitto integration
-   [x] Node.js / Express backend
-   [x] PostgreSQL event storage
-   [x] Bus and camera APIs (including create/update)
-   [x] Event filtering
-   [x] Evidence upload API
-   [x] Edge evidence upload
-   [x] Evidence URL propagation through MQTT
-   [x] Evidence URL persistence in PostgreSQL
-   [x] React dashboard (map, events, vehicles, cameras)
-   [x] Interactive map visualization
-   [x] Event detail view
-   [x] Evidence image viewer
-   [x] Event filtering in the dashboard

## Next

-   [ ] Wire up the trained Indian vehicle detection model
        (`ml/Traffic_Model/`) into the edge pipeline
-   [ ] Traffic / vehicle analytics (counting, speed, congestion)
-   [ ] Multi-bus simulation
-   [ ] Hit-and-run demonstration
-   [ ] Improved deployment and containerization
-   [ ] Production-grade object storage
-   [ ] Authentication and authorization

------------------------------------------------------------------------

# Prototype Goal

The next major milestone is deeper analytics on top of the working
visual workflow:

``` text
Video
  ↓
Pothole detected
  ↓
GPS location assigned
  ↓
Evidence captured
  ↓
MQTT event sent
  ↓
PostgreSQL stores event
  ↓
Dashboard retrieves event
  ↓
Pothole appears on map
  ↓
User opens event
  ↓
Evidence image displayed
```

This end-to-end workflow is now functional. The next milestone is
extending it with vehicle/traffic analytics and multi-bus scenarios.

------------------------------------------------------------------------

## License

This project is currently under active development.
