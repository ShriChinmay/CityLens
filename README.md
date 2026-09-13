# CityLens

> **AI-powered urban sensing using public transport buses**

CityLens turns public transport buses into **mobile urban sensing
units**. Cameras mounted on buses can process road-scene video at the
edge, detect infrastructure problems such as potholes, associate
detections with GPS coordinates, capture evidence, and send lightweight
event metadata to a central backend.

The current prototype demonstrates an end-to-end **pothole detection →
evidence upload → MQTT → PostgreSQL** pipeline.

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
-   REST APIs for buses, cameras, events, and evidence
-   Event validation using Zod
-   Evidence files served by the backend

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
│   ├── events/
│   ├── gps/
│   ├── perception/
│   ├── storage/
│   ├── tracking/
│   ├── main.py
│   └── requirements.txt
│
├── frontend/                # Dashboard (planned / under development)
│
├── ml/                      # ML models and related assets
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
  Frontend                Planned React-based dashboard

------------------------------------------------------------------------

# Getting Started

## Prerequisites

Install:

-   Git
-   Node.js
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

**Do not commit `.env`.**

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
GET /api/v1/events
GET /api/v1/events/:id
```

Filtering is supported for fields such as:

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
GET /api/v1/buses
GET /api/v1/buses/:id
```

## Cameras

``` http
GET /api/v1/cameras
GET /api/v1/cameras/:id
```

## Evidence

``` http
POST /api/v1/evidence
```

The endpoint accepts an uploaded image and returns its evidence URL.

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

The backend validates incoming MQTT events before inserting them into
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

# Offline-First Edge Design

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
-   [x] Bus and camera APIs
-   [x] Event filtering
-   [x] Evidence upload API
-   [x] Edge evidence upload
-   [x] Evidence URL propagation through MQTT
-   [x] Evidence URL persistence in PostgreSQL

## Next

-   [ ] React dashboard
-   [ ] Interactive map visualization
-   [ ] Event detail view
-   [ ] Evidence image viewer
-   [ ] Event filtering in the dashboard
-   [ ] Traffic / vehicle analytics
-   [ ] Multi-bus simulation
-   [ ] Hit-and-run demonstration
-   [ ] Improved deployment and containerization
-   [ ] Production-grade object storage
-   [ ] Authentication and authorization

------------------------------------------------------------------------

# Prototype Goal

The next major milestone is a complete visual workflow:

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

Once this workflow is complete, CityLens will have a demonstrable
end-to-end urban sensing prototype.

------------------------------------------------------------------------

## License

This project is currently under active development.
