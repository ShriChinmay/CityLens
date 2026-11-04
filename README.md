# CityLens

> **AI-powered urban sensing using public transport buses**

CityLens transforms public transport buses into **mobile urban sensing units**. Cameras mounted on buses process road-scene video at the edge, detect infrastructure problems such as potholes, associate detections with GPS coordinates, capture evidence, and transmit event metadata to a central backend.

The backend validates and stores these events, merges repeated detections into existing incidents, and exposes them through REST APIs. Authorities can review incidents, track their lifecycle, inspect detection history, and initiate work orders.

The project follows an **edge-first architecture**, reducing the need to continuously transmit raw camera footage while retaining useful information about detected urban events.

---

## Overview

Instead of uploading continuous camera footage to a central server, CityLens processes video locally and transmits only relevant event information and evidence.

```text
                    CITYLENS
                       |
          +------------+------------+
          |                         |
      EDGE / BUS               CENTRAL SERVER
          |                         |
     +----+----+              +-----+------+
     |         |              |            |
   Camera     GPS           MQTT         REST API
     |         |              |            |
     +----+----+              v            v
          |                Backend     PostgreSQL
          v                   |            |
      AI Detection             +-----+------+
          |                          |
      Tracking                       v
          |                      Dashboard
          v
    Event Generation
          |
     +----+----+
     |         |
    MQTT      HTTP
  Metadata   Evidence
```

### Core workflow

```text
Camera Feed
    |
    v
Edge AI Detection
    |
    v
Object Tracking
    |
    v
GPS Association
    |
    v
Event Generation
    |
    +--------------------+
    |                    |
    v                    v
 MQTT Metadata       HTTP Evidence
    |                    |
    +---------+----------+
              |
              v
         Backend
              |
       Event Validation
              |
       Spatial Deduplication
              |
              v
          PostgreSQL
              |
              v
        REST API
              |
              v
          Dashboard
              |
              v
      Incident Management
              |
              v
         Work Orders
```

---

## Current Prototype

The current implementation includes:

### Edge processing

- Pothole detection using a YOLO-based model.
- OpenCV-based video processing.
- Object tracking.
- Simulated GPS coordinates.
- Event generation and severity classification.
- Local SQLite event storage.
- Evidence snapshot generation.
- HTTP-based evidence upload.
- MQTT-based event communication.

### Backend

- Node.js and Express REST API.
- PostgreSQL persistence.
- MQTT event consumer using Mosquitto.
- Incoming event validation using Zod.
- Evidence upload and retrieval.
- Spatial deduplication of repeated detections.
- Incident lifecycle management.
- Detection observation history.
- Work-order creation and retrieval APIs.

### Frontend

- React and TypeScript dashboard.
- Interactive map visualization.
- Road issue listing and filtering.
- Incident detail pages.
- Evidence image viewer.
- Incident lifecycle status display.
- Detection history with timestamps, GPS coordinates, confidence scores, and bus/camera information.
- Incident status transition controls.
- Mock-data fallback for standalone UI development.

A trained Indian-road vehicle detection model also exists in `ml/Traffic_Model/`, but it is not yet integrated into the edge pipeline.

---

## Incident Management

CityLens distinguishes between an individual detection and an incident.

A single road issue may be detected multiple times by the same or different buses. Rather than creating a separate incident for every detection, the backend can associate repeated detections with an existing incident.

### Spatial deduplication

The backend checks incoming events against existing incidents using:

- Geographic proximity.
- Event type.
- A configurable time window.

The current implementation uses a 5-metre spatial radius and a 14-day time window.

When a matching incident is found, the new detection is recorded as an observation of that incident instead of creating a duplicate incident.

This allows the system to maintain:

- A single incident record.
- Multiple detection observations.
- First-seen and last-seen timestamps.
- Detection count.
- Historical GPS and confidence information.

### Incident lifecycle

Incidents follow the following lifecycle:

```text
DETECTED
    |
    v
VERIFIED
    |
    v
WORK_ORDER_ISSUED
    |
    v
RESOLVED
    |
    v
AUDITED
```

| Status | Meaning |
|---|---|
| `DETECTED` | An issue has been detected by the edge system. |
| `VERIFIED` | An authority has reviewed and verified the incident. |
| `WORK_ORDER_ISSUED` | A work order has been created for the incident. |
| `RESOLVED` | The authority has confirmed that the incident has been addressed. |
| `AUDITED` | The resolution has completed the audit stage. |

The backend validates status transitions and rejects invalid transitions.

**Important:** Completing a work order and resolving an incident are separate operations. A work order being completed does not automatically mean that the incident has been resolved. Resolution and auditing are separate stages of the incident lifecycle.

### Detection history

Each incident can have multiple associated observations.

The detection history records information such as:

- Observation ID.
- Bus ID.
- Camera ID.
- Observation timestamp.
- Latitude and longitude.
- Detection confidence.
- Associated metadata.
- Evidence URL, when available.

This helps authorities understand how frequently an issue has been detected and how it has been observed over time.

---

## Work Orders

CityLens supports creating and retrieving work orders associated with incidents.

A work order can contain:

- Associated incident ID.
- Title.
- Description.
- Assigned personnel.
- Priority.
- Due date.
- Work-order status.

Supported priorities:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

New work orders have the default status:

```text
PENDING
```

Work-order creation is restricted to incidents that have reached the appropriate lifecycle stage (`VERIFIED` or `WORK_ORDER_ISSUED`).

When the first work order is created for a verified incident, the backend transitions the incident to `WORK_ORDER_ISSUED` within the same database transaction.

Work-order status management and the complete work-order management interface remain planned enhancements.

---

## End-to-End Flow

The current prototype supports the following pipeline:

```text
Test Video
    |
    v
YOLO Pothole Detection
    |
    v
Object Tracking
    |
    v
Event Confirmation
    |
    v
Simulated GPS Association
    |
    v
Evidence Snapshot
    |
    +-------------------------+
    |                         |
    v                         v
HTTP Evidence Upload     MQTT Event Publish
    |                         |
    v                         v
Backend Evidence        MQTT Consumer
Storage                      |
    |                         v
    |                    Zod Validation
    |                         |
    +------------+------------+
                 |
                 v
          PostgreSQL
                 |
                 v
          REST API
                 |
                 v
            Dashboard
                 |
                 v
        Incident Management
```

Example event payload:

```json
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

---

## Repository Structure

```text
CityLens/
|
+-- backend/                     # Node.js / Express backend
|   +-- controllers/
|   +-- db/
|   |   +-- migrations/
|   +-- middlewares/
|   +-- mqtt/
|   +-- routes/
|   +-- schemas/
|   +-- services/
|   +-- uploads/
|   |   +-- evidence/
|   +-- app.js
|   +-- server.js
|
+-- data/                         # Prototype videos / test data
|
+-- docs/
|   +-- architecture.md           # System architecture
|
+-- edge/                         # Bus-side processing pipeline
|   +-- camera/
|   +-- communication/
|   +-- config/
|   +-- events/
|   +-- gps/
|   +-- perception/
|   +-- storage/
|   +-- tracking/
|   +-- main.py
|   +-- requirements.txt
|
+-- frontend/                     # React + TypeScript dashboard
|   +-- src/
|       +-- api/
|       +-- components/
|       +-- pages/
|       +-- styles/
|
+-- ml/
|   +-- Potholes_Yolo26n/          # Pothole detection model
|   +-- Traffic_Model/             # Vehicle detection model
|
+-- .gitignore
+-- README.md
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Edge processing | Python |
| Computer vision | OpenCV |
| Object detection | Ultralytics YOLO |
| Object tracking | Custom tracking module |
| Edge storage | SQLite |
| Edge-to-backend communication | MQTT |
| Evidence upload | HTTP |
| MQTT broker | Mosquitto |
| Backend | Node.js, Express |
| Validation | Zod |
| Database | PostgreSQL |
| Frontend | React 18, TypeScript |
| Frontend tooling | Vite |
| Styling | Tailwind CSS |
| Maps | Leaflet, React Leaflet |

---

# Getting Started

## Prerequisites

Install the following:

- Git
- Node.js 18 or later
- Python 3
- PostgreSQL
- Mosquitto MQTT broker

The Python dependencies are listed in:

```text
edge/requirements.txt
```

---

## 1. Clone the repository

```bash
git clone https://github.com/ShriChinmay/CityLens.git
cd CityLens
```

---

# Backend Setup

## 2. Create the PostgreSQL database

Create a database named:

```text
citylens
```

For example:

```sql
CREATE DATABASE citylens;
```

Make sure PostgreSQL is running.

## 3. Configure environment variables

Create a file at:

```text
backend/.env
```

Add the following configuration:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=citylens
DB_USER=postgres
DB_PASSWORD=your_password

PORT=3000

MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_TOPIC=citylens/events
```

Replace `your_password` with your PostgreSQL password.

Do not commit `.env` files or expose credentials in the repository. A production deployment should use secure secret management.

## 4. Install backend dependencies

```powershell
cd backend
npm install
```

## 5. Run database migrations

From the `backend` directory:

```powershell
npm run migrate
```

The migration runner applies the database migrations required by the backend.

The current migration set includes:

- Bus and camera tables.
- Events table.
- Incident observation history.
- Incident lifecycle support.
- Evidence-related database changes.
- Work-order storage.

The migration files are located in:

```text
backend/db/migrations/
```

## 6. Start the backend

```powershell
npm start
```

The backend runs at:

```text
http://localhost:3000
```

Check whether the server is running:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Expected response:

```text
status
------
ok
```

---

# MQTT Setup

Start the Mosquitto MQTT broker on:

```text
localhost:1883
```

The current prototype uses:

```text
Topic: citylens/events
```

The backend MQTT consumer subscribes to this topic, validates incoming event payloads, and stores the events in PostgreSQL.

---

# Edge Setup

## 7. Install Python dependencies

Run this command from the repository root:

```powershell
python -m pip install -r edge/requirements.txt
```

The edge requirements include:

```text
ultralytics
opencv-python
onnxruntime
paho-mqtt
requests
```

**Note:** The current edge detector loads PyTorch (`.pt`) weights using Ultralytics. ONNX Runtime is installed for potential lightweight inference but is not currently used by the main edge pipeline.

## 8. Run the edge pipeline

Run this command from the repository root:

```powershell
python -m edge.main
```

The edge pipeline:

1. Reads the configured video source.
2. Runs pothole detection.
3. Tracks detections.
4. Confirms events.
5. Associates GPS coordinates.
6. Captures evidence snapshots.
7. Uploads evidence to the backend.
8. Stores events locally.
9. Publishes event metadata through MQTT.

---

# Frontend Setup

## 9. Install frontend dependencies

```powershell
cd frontend
npm install
```

## 10. Start the development server

```powershell
npm run dev
```

The dashboard runs at:

```text
http://localhost:5173
```

The Vite development server proxies API requests to the backend at:

```text
http://localhost:3000
```

If the backend is unavailable, the frontend can use bundled mock data for standalone UI development.

## 11. Build the frontend

```powershell
npm run build
```

This runs TypeScript type checking and creates the production frontend build.

---

# Frontend Routes

| Route | Description |
|---|---|
| `/` | Command center with key metrics and map |
| `/events` | Road issues with search and filtering |
| `/events/:id` | Incident details, evidence, lifecycle, and detection history |
| `/buses` | Transit fleet inventory |
| `/buses/:id` | Bus details and associated cameras/events |
| `/cameras` | Camera inventory and status |
| `*` | 404 page |

---

# REST API

The backend exposes REST APIs under:

```text
/api/v1
```

The following endpoints describe the current backend API surface.

## Health

```http
GET /health
```

## Events

```http
GET   /api/v1/events
GET   /api/v1/events/:id
POST  /api/v1/events
PATCH /api/v1/events/:id/status
```

`POST /api/v1/events` accepts a validated event payload. Events normally arrive through MQTT from the edge pipeline, but this endpoint is also available for direct/manual event creation.

### Event filtering

The events endpoint supports filtering by fields such as:

```text
event_type
severity
bus_id
camera_id
```

Examples:

```http
GET /api/v1/events?severity=HIGH
GET /api/v1/events?event_type=POTHOLE
```

### Update incident status

```http
PATCH /api/v1/events/:id/status
```

Example request body:

```json
{
  "status": "VERIFIED"
}
```

Supported statuses:

```text
DETECTED
VERIFIED
WORK_ORDER_ISSUED
RESOLVED
AUDITED
```

The backend validates the requested transition and rejects invalid transitions.

## Detection Observations

```http
GET /api/v1/events/:id/observations
```

Returns the observation history associated with an incident.

The response includes:

- Incident ID.
- Observation count.
- Observation records.

Each observation can contain its bus and camera IDs, timestamp, coordinates, confidence, metadata, and evidence URL.

## Work Orders

```http
POST /api/v1/work-orders
GET  /api/v1/work-orders
GET  /api/v1/work-orders/:id
GET  /api/v1/work-orders/event/:eventId
```

### Create a work order

```http
POST /api/v1/work-orders
```

Example request body:

```json
{
  "event_id": 72,
  "title": "Repair pothole on road",
  "description": "Repair the reported road damage.",
  "assigned_to": "Maintenance Team A",
  "priority": "HIGH",
  "due_date": "2026-11-15"
}
```

Required field:

```text
event_id
title
```

Optional fields:

```text
description
assigned_to
priority
due_date
```

Priority defaults to `MEDIUM`.

Work-order creation is allowed for incidents in the `VERIFIED` or `WORK_ORDER_ISSUED` stages.

### Retrieve work orders

```http
GET /api/v1/work-orders
```

Retrieve a particular work order:

```http
GET /api/v1/work-orders/:id
```

Retrieve work orders associated with an incident:

```http
GET /api/v1/work-orders/event/:eventId
```

## Buses

```http
GET   /api/v1/buses
GET   /api/v1/buses/:id
POST  /api/v1/buses
PATCH /api/v1/buses/:id
```

Create and update operations support fields such as:

```text
bus_number
operator
model
status
```

Supported bus statuses:

```text
ACTIVE
INACTIVE
MAINTENANCE
```

## Cameras

```http
GET   /api/v1/cameras
GET   /api/v1/cameras/:id
POST  /api/v1/cameras
PATCH /api/v1/cameras/:id
```

Create and update operations support:

```text
bus_id
camera_type
position
status
```

Supported camera statuses:

```text
ACTIVE
INACTIVE
MAINTENANCE
```

## Evidence

```http
POST /api/v1/evidence
```

Accepts a multipart form-data upload with an `image` field.

Supported image formats:

- JPEG
- PNG
- WebP

Maximum upload size: 10 MB.

The endpoint returns the stored evidence URL.

---

# Evidence Handling

Evidence images are uploaded separately from MQTT event metadata.

```text
EDGE
 |
 | HTTP POST /api/v1/evidence
 |
 v
BACKEND
 |
 | Stores image
 |
 v
Evidence URL
 |
 v
MQTT Event Payload
 |
 v
POSTGRESQL
```

Example evidence URL:

```json
{
  "event_type": "POTHOLE",
  "evidence_url": "/evidence/example.jpg"
}
```

The backend serves uploaded evidence through:

```http
GET /evidence/:filename
```

For local development:

```text
http://localhost:3000/evidence/<filename>
```

Evidence uploaded during local development is runtime data and should not be committed to Git.

---

# Event Schema

Events currently support the following event types:

```text
POTHOLE
DAMAGED_ROAD
WATERLOGGING
ACCIDENT
```

### Severity levels

```text
LOW
MEDIUM
HIGH
CRITICAL
```

### Event fields

| Field | Description |
|---|---|
| `bus_id` | ID of the bus that generated the event |
| `camera_id` | ID of the camera that detected the issue |
| `event_type` | Type of detected road issue |
| `confidence` | Model detection confidence |
| `severity` | Classified severity |
| `detected_at` | Detection timestamp |
| `latitude` | GPS latitude |
| `longitude` | GPS longitude |
| `metadata` | Additional detection information |
| `evidence_url` | Associated evidence image URL |

Incoming events are validated before being persisted in PostgreSQL.

---

# Architecture

The detailed system architecture is documented in:

```text
docs/architecture.md
```

CityLens uses an edge-first architecture:

```text
Bus Camera
    |
    v
Edge Processing
    |
    v
AI Detection
    |
    v
Object Tracking
    |
    v
Event Generation
    |
    +--------------------+
    |                    |
    v                    v
   MQTT                 HTTP
    |                    |
    v                    v
Event Metadata       Evidence Image
    |                    |
    +---------+----------+
              |
              v
           Backend
              |
       Validation and
       Deduplication
              |
              v
          PostgreSQL
              |
              v
           REST API
              |
              v
          Dashboard
```

---

# Why MQTT + HTTP?

CityLens separates event metadata from evidence images.

### MQTT

MQTT is used for lightweight event communication, including:

- Event type.
- Confidence.
- Severity.
- GPS coordinates.
- Bus ID.
- Camera ID.
- Detection timestamp.
- Evidence URL.

### HTTP

HTTP is used for uploading comparatively large binary evidence files:

```text
JPEG / PNG / WebP
```

This avoids sending image data through MQTT and keeps event messages lightweight.

---

# Offline-First Design

## Edge

The edge pipeline maintains local event storage using SQLite.

This allows the edge system to retain event data locally instead of relying entirely on immediate network connectivity.

```text
Detection
    |
    v
Local SQLite Storage
    |
    v
Network Communication
    |
    v
MQTT Event Publishing
```

## Dashboard

The frontend supports a mock-data fallback for development and demonstrations. If the backend is unavailable, the dashboard can still be previewed without relying on live API responses.

---

# ML Models

The `ml/` directory contains the trained model assets used or intended for future use.

## Pothole Detection — `ml/Potholes_Yolo26n/`

The pothole detector currently used by the edge pipeline.

- YOLO26n (nano), fine-tuned on pothole data.
- Trained for 80 epochs.
- mAP@50: 0.788.
- Precision: 0.79.
- Recall: 0.73.
- Single detection class: `pothole`.
- Includes `.pt` weights used by the current edge pipeline.
- Also includes an `.onnx` export for potential lightweight deployment.

See `ml/Potholes_Yolo26n/README.md` for additional details.

## Vehicle Detection — `ml/Traffic_Model/`

A trained YOLO26n model for Indian-road vehicle detection.

- Trained on the IRUVD dataset.
- Uses 4,000 frames.
- Detects 14 vehicle classes relevant to Indian traffic.

The model is **not yet integrated into the edge pipeline or backend**. Integrating it with tracking, counting, speed estimation, and traffic analytics is planned future work.

See `ml/Traffic_Model/README.md` for model details.

---

# Development Roadmap

## Completed

- [x] Edge video processing pipeline.
- [x] YOLO-based pothole detection.
- [x] Object tracking.
- [x] Simulated GPS.
- [x] Event generation and severity classification.
- [x] Local edge event storage.
- [x] MQTT event communication.
- [x] Mosquitto integration.
- [x] Node.js / Express backend.
- [x] PostgreSQL event persistence.
- [x] Bus and camera APIs.
- [x] Event filtering.
- [x] Evidence upload and retrieval.
- [x] Edge evidence upload.
- [x] Evidence URL propagation through MQTT.
- [x] Evidence URL persistence.
- [x] React dashboard.
- [x] Interactive map visualization.
- [x] Incident detail page.
- [x] Evidence image viewer.
- [x] Spatial incident deduplication.
- [x] Incident lifecycle status management API.
- [x] Detection observation history API.
- [x] Incident lifecycle summary UI.
- [x] Detection history UI.
- [x] Frontend build and TypeScript validation.

## In Progress / Next

- [ ] Complete the work-order creation form and frontend integration.
- [ ] Display work orders associated with incidents.
- [ ] Build a dedicated work-order dashboard.
- [ ] Add clearer lifecycle progress and audit information.
- [ ] Complete end-to-end validation of incident and work-order workflows.
- [ ] Improve error handling and loading states.
- [ ] Harden edge-to-backend communication and retry handling.

## Planned / Postponed

- [ ] Work-order status management API and UI.
- [ ] Work-order details update API and UI.
- [ ] Incident resolution and audit workflow improvements.
- [ ] Automatic incident resolution.
- [ ] Stronger incident/work-order consistency checks.
- [ ] Expanded evidence management.
- [ ] Integrate the trained Indian vehicle detection model.
- [ ] Vehicle classification, counting, and tracking.
- [ ] Traffic analytics, congestion estimation, and speed estimation.
- [ ] Hit-and-run demonstration.
- [ ] Multi-bus and multi-device simulation.
- [ ] Production deployment and containerization.
- [ ] Production-grade object storage.
- [ ] Authentication and authorization.

---

# Current Prototype Goal

The current milestone focuses on demonstrating the complete incident reporting and initial management workflow:

```text
Video
  |
  v
Pothole Detection
  |
  v
GPS Association
  |
  v
Evidence Capture
  |
  v
MQTT Event Publishing
  |
  v
Backend Validation
  |
  v
Incident Deduplication
  |
  v
PostgreSQL Persistence
  |
  v
Dashboard Visualization
  |
  v
Incident Verification
  |
  v
Work Order Creation
```

The next milestone is completing the work-order management interface and validating the complete incident lifecycle.

---

## License

This project is currently under active development.
