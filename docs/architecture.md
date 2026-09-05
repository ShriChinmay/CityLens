# CityLens — System Architecture

> **AI-Powered Mobile Urban Intelligence Platform Using Public Transport Fleet**

CityLens transforms public transport buses into **mobile AI-powered urban sensing units**. Instead of continuously transmitting camera feeds to a central server, AI inference is performed locally on the edge device installed on the bus. Only relevant event metadata and evidence snapshots are transmitted to the central platform.

---

## 1. System Overview

CityLens consists of two primary layers:

1. **Edge / Bus Layer** — Performs local video processing, AI inference, tracking, event generation, GPS association, and communication.
2. **Central / Server Layer** — Receives events from buses, stores and aggregates information, performs geospatial analysis, and provides a dashboard for authorities.

### High-Level Architecture

```text
                         CITYLENS
                            │
             ┌──────────────┴──────────────┐
             │                             │
        EDGE / BUS                    CENTRAL SERVER
             │                             │
      ┌──────┴──────┐              ┌───────┴────────┐
      │             │              │                │
   Cameras        GPS           MQTT Broker      Backend API
      │             │              │                │
      └──────┬──────┘              │                │
             ▼                     ▼                ▼
        Frame Pipeline         Event Ingestion   Business Logic
             │                                      │
             ▼                                      ▼
        AI Inference                            PostgreSQL
      ┌──────┼──────┐                            + PostGIS
      │      │      │                                │
  Vehicles Potholes Incidents                        ▼
      │      │      │                           Analytics
      └──────┴──────┘                                │
             │                                       ▼
         Tracking                              REST API
             │                                       │
             ▼                                       ▼
       Event Generator                         Web Dashboard
             │
       ┌─────┴─────┐
       │           │
    Metadata    Snapshot
       │           │
      MQTT        HTTP
       │           │
       └─────┬─────┘
             ▼
       Central Server
```

---

# 2. Design Principles

CityLens follows these principles:

### 2.1 Edge-first processing

Raw camera streams should be processed on the bus whenever possible.

```text
Camera → Edge AI → Event
```

rather than:

```text
Camera → Internet → Central Server → AI → Event
```

This reduces bandwidth requirements and improves response time.

---

### 2.2 Transmit only relevant information

The system should not continuously upload live video.

For detected events, the edge device sends:

* Event metadata
* Timestamp
* GPS location
* Detection confidence
* Event type
* Severity
* Relevant snapshot(s)

Video clips may be considered later for high-severity incidents.

---

### 2.3 Modular architecture

AI models, camera interfaces, GPS providers, communication mechanisms, and storage systems should be replaceable without rewriting the rest of the system.

For example:

```text
Simulated GPS
      ↓
GPS Interface
      ↓
Edge Application
```

can later become:

```text
Hardware GPS
      ↓
GPS Interface
      ↓
Edge Application
```

without changing the event-processing pipeline.

---

### 2.4 Offline-capable edge

The edge system should continue processing when network connectivity is temporarily unavailable.

Detected events should be stored locally and transmitted when connectivity is restored.

---

### 2.5 Centralized aggregation

The server combines observations from multiple buses to identify:

* Repeated road defects
* Traffic congestion
* Infrastructure deficiencies
* Recurring incidents
* Spatial patterns

---

# 3. Prototype Scope

The initial prototype focuses on the following capabilities:

### P0 — Must Have

* Pothole detection
* Vehicle detection
* Vehicle classification
* Vehicle counting
* Traffic/congestion estimation
* Hit-and-run incident demonstration
* GPS association
* Event metadata transmission
* Snapshot transmission
* Central GIS visualization
* Basic authority authentication

### P1 — Future Enhancement

* Automatic number plate recognition
* More sophisticated accident detection
* Road condition classification
* Waterlogging detection
* Traffic sign detection
* Zebra crossing detection
* Road divider detection
* Route delay estimation
* Origin-destination analysis
* Historical traffic prediction

---

# 4. Edge / Bus Layer

The edge layer represents the computing system installed on a public transport bus.

## 4.1 Edge Components

```text
edge/
│
├── camera/
├── perception/
├── tracking/
├── gps/
├── events/
├── communication/
├── storage/
└── main.py
```

---

## 4.2 Camera Pipeline

The camera module is responsible for:

* Receiving camera input
* Reading frames
* Frame sampling
* Resizing/preprocessing
* Providing frames to the AI pipeline

### Prototype

The camera input may be a prerecorded video.

```text
Video File
    ↓
OpenCV
    ↓
Frame Stream
    ↓
AI Pipeline
```

### Future

The same interface can support real camera streams:

```text
Camera
   ↓
RTSP
   ↓
OpenCV/GStreamer
   ↓
AI Pipeline
```

---

# 5. AI Perception Layer

The perception layer performs AI-based detection.

## 5.1 Vehicle Detection

The vehicle detector identifies objects such as:

* Car
* Bus
* Truck
* Motorcycle
* Auto-rickshaw
* Person

The exact classes depend on the selected model and training dataset.

```text
Frame
  ↓
Object Detector
  ↓
Bounding Boxes
  ↓
Class + Confidence
```

---

## 5.2 Pothole Detection

The pothole model identifies potholes in road scenes.

Output:

```text
Pothole
├── Bounding box
├── Confidence
└── Frame timestamp
```

The detection is then associated with GPS coordinates.

---

## 5.3 Model Strategy

The initial implementation should prioritize pretrained/fine-tuned object detection models rather than training large models entirely from scratch.

The model should be evaluated using appropriate metrics such as:

* Precision
* Recall
* mAP
* False-positive rate
* Inference speed

The final model architecture will be documented in:

```text
docs/ml/models.md
```

---

# 6. Tracking Layer

Vehicle detection alone treats every frame independently.

Tracking associates detections across frames.

```text
Frame 1 → Vehicle #17
Frame 2 → Vehicle #17
Frame 3 → Vehicle #17
Frame 4 → Vehicle #17
```

A tracking algorithm such as **ByteTrack** may be used.

Tracking is particularly important for:

* Vehicle counting
* Vehicle trajectories
* Incident analysis
* Hit-and-run scenarios

---

# 7. GPS Layer

The GPS layer associates detected events with geographical coordinates.

## Prototype

The prototype will use simulated GPS data.

The simulator should provide coordinates based on the video timeline.

Example:

```text
00:00 → (28.6139, 77.2090)
00:10 → (28.6145, 77.2101)
00:20 → (28.6152, 77.2110)
```

If an event occurs at `00:17`, the system associates it with the corresponding location.

## Future

The GPS provider can be replaced with a physical GPS module without changing the event-processing architecture.

---

# 8. Event Engine

The event engine converts raw AI detections into meaningful CityLens events.

Example:

```text
AI Detection
     ↓
Event Engine
     ↓
POTHOLE_EVENT
```

An event should contain:

```json
{
  "event_id": "EVT_001",
  "bus_id": "BUS_001",
  "event_type": "POTHOLE",
  "timestamp": "2026-09-05T10:42:17Z",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "confidence": 0.93,
  "severity": "HIGH"
}
```

---

# 9. Event Types

The initial event types are:

```text
POTHOLE
TRAFFIC
HIT_AND_RUN
```

Additional event types can be added later.

---

# 10. Traffic Processing

Traffic analytics will primarily use vehicle detection and tracking rather than requiring a separate complex ML model.

```text
Vehicle Detection
       ↓
Vehicle Classification
       ↓
Vehicle Tracking
       ↓
Vehicle Count
       ↓
Traffic Metrics
       ↓
Congestion Classification
```

Possible metrics include:

* Vehicle count
* Vehicle density
* Vehicle type distribution
* Approximate traffic flow
* Average vehicle speed, if reliable tracking permits

The prototype may classify traffic into:

```text
LOW
MEDIUM
HIGH
```

The exact formula will be documented separately.

---

# 11. Hit-and-Run Detection

The prototype will demonstrate a simplified hit-and-run workflow.

```text
Vehicle Detection
       ↓
Vehicle Tracking
       ↓
Incident Trigger
       ↓
Track Suspected Vehicle
       ↓
Capture Evidence Snapshot
       ↓
Create Incident Event
       ↓
Transmit to Server
```

The initial prototype does not require a highly sophisticated accident-understanding model.

Advanced incident detection and automatic number plate recognition are future enhancements.

---

# 12. Evidence Capture

When an event is generated, the edge device captures relevant snapshot(s).

```text
Camera Frame
     ↓
Event Detected
     ↓
Snapshot
     ↓
Local Temporary Storage
     ↓
HTTP Upload
```

Snapshots are stored centrally after successful upload.

---

# 13. Communication Layer

CityLens uses two communication mechanisms.

## 13.1 MQTT — Event Metadata

MQTT is used to transmit lightweight event information.

Example:

```text
bus/001/events
bus/001/status
bus/001/location
```

An event message contains metadata such as:

```json
{
  "event_id": "EVT_001",
  "bus_id": "BUS_001",
  "event_type": "POTHOLE",
  "timestamp": "2026-09-05T10:42:17Z",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "confidence": 0.93,
  "snapshot_id": "IMG_001"
}
```

---

## 13.2 HTTP — Evidence Upload

Snapshots are uploaded separately using HTTP.

```text
Edge
 │
 ├── MQTT → Event Metadata
 │
 └── HTTP → Snapshot
```

Snapshots should not normally be transmitted through MQTT.

---

# 14. Offline Handling

The edge device must be able to operate when the network is unavailable.

```text
             Network Available
                    │
                    ▼
              Upload Event
                    │
                    ▼
                 Server


             Network Unavailable
                    │
                    ▼
              Local SQLite
                    │
                    ▼
             Wait for Network
                    │
                    ▼
              Upload Pending
                    │
                    ▼
                 Server
```

SQLite will initially be used for local event buffering.

---

# 15. Central Server

The central server receives and manages information from the fleet.

## Backend Stack

* Python
* FastAPI
* PostgreSQL
* PostGIS
* MQTT/Mosquitto

---

# 16. Backend Architecture

```text
backend/
│
├── api/
│   ├── auth.py
│   ├── events.py
│   ├── buses.py
│   ├── incidents.py
│   ├── traffic.py
│   └── analytics.py
│
├── services/
│   ├── event_service.py
│   ├── incident_service.py
│   ├── traffic_service.py
│   └── aggregation_service.py
│
├── models/
├── schemas/
├── database/
├── mqtt/
├── storage/
└── main.py
```

---

# 17. MQTT Event Ingestion

The backend subscribes to event topics.

```text
Bus
 ↓
MQTT
 ↓
Mosquitto Broker
 ↓
Backend MQTT Subscriber
 ↓
Event Service
 ↓
PostgreSQL/PostGIS
```

The MQTT subscriber should validate incoming messages before passing them to the application layer.

---

# 18. Database

PostgreSQL will be used as the primary database.

PostGIS will provide geospatial functionality.

Initial entities include:

```text
users
buses
routes
events
incidents
vehicle_observations
road_defects
```

---

# 19. Geospatial Processing

PostGIS allows CityLens to perform spatial queries.

For example, repeated pothole observations from different buses can be grouped:

```text
Bus 001 → Pothole A
Bus 002 → Pothole A
Bus 003 → Pothole A
```

The system can aggregate these observations into:

```text
Pothole A
├── Location
├── Number of observations
├── Average confidence
├── First detected
└── Last detected
```

This helps distinguish persistent road defects from isolated false detections.

---

# 20. Snapshot Storage

For the prototype, snapshots will be stored on the central server filesystem.

Example:

```text
storage/
└── events/
    ├── EVT_001/
    │   └── snapshot.jpg
    ├── EVT_002/
    │   └── snapshot.jpg
    └── EVT_003/
        └── snapshot.jpg
```

The database stores a reference to the snapshot.

For future production deployment, object storage can replace local filesystem storage.

---

# 21. Frontend

The dashboard will provide a GIS-based interface for authorities.

### Proposed stack

* React
* TypeScript
* MapLibre GL JS

---

# 22. Dashboard Features

The initial dashboard should contain:

### Overview

```text
Active Buses
Potholes
Traffic Events
Incidents
```

### GIS Map

Display:

* Bus locations
* Potholes
* Traffic/congestion
* Incidents

### Event List

Each event should display:

```text
Event Type
Time
Location
Bus
Confidence
Severity
Snapshot
Status
```

### Incident View

For hit-and-run incidents:

```text
Incident
├── Timestamp
├── Location
├── Bus
├── Vehicle track
├── Confidence
└── Evidence snapshot
```

---

# 23. Authentication

The dashboard will require user authentication.

Initial authentication flow:

```text
User
 ↓
Login
 ↓
FastAPI
 ↓
Authentication
 ↓
JWT
 ↓
Dashboard
```

The initial prototype may use two roles:

```text
ADMIN
AUTHORITY
```

More detailed role-based access control can be introduced later.

---

# 24. REST API

The frontend communicates with the backend through REST APIs.

Example endpoints:

```text
POST   /auth/login

GET    /buses
GET    /buses/{bus_id}

GET    /events
GET    /events/{event_id}

GET    /incidents
GET    /incidents/{incident_id}

GET    /traffic

GET    /analytics/potholes
GET    /analytics/congestion

POST   /events
POST   /snapshots
```

The exact API contract will be documented separately.

---

# 25. No WebSockets in Initial Prototype

The initial prototype does not require WebSockets.

Events do not need to appear on the authority dashboard instantaneously.

The dashboard can retrieve information using REST APIs whenever the user:

* Opens the dashboard
* Refreshes the page
* Changes the map/filter
* Opens an event

Real-time streaming can be added later if required.

---

# 26. Prototype Simulation Architecture

Because the initial prototype runs on a single laptop, actual buses and hardware will be simulated.

```text
                   LAPTOP
                     │
       ┌─────────────┴─────────────┐
       │                           │
   BUS SIMULATOR               CENTRAL SERVER
       │                           │
       ├── Video                  ├── MQTT
       ├── GPS                    ├── FastAPI
       └── Bus ID                 ├── PostgreSQL
             │                    ├── PostGIS
             ▼                    └── Storage
        EDGE SOFTWARE
             │
             ▼
            MQTT
             │
             ▼
       CENTRAL SERVER
```

Multiple virtual buses can be simulated:

```text
BUS_001
BUS_002
BUS_003
```

even though they are running on the same physical machine.

---

# 27. Simulator

The simulator should behave like an actual bus-side device.

```text
simulator/
│
├── bus_simulator.py
├── gps_simulator.py
└── scenarios/
    ├── normal_traffic.json
    ├── pothole.json
    └── hit_and_run.json
```

The goal is to ensure that the rest of the system does not depend on whether the data originates from a real bus or a simulated bus.

---

# 28. End-to-End Data Flow

## Pothole

```text
Camera
  ↓
Frame
  ↓
Pothole Model
  ↓
Detection
  ↓
GPS Association
  ↓
Snapshot Capture
  ↓
Event Generation
  ↓
MQTT + HTTP
  ↓
Central Server
  ↓
PostGIS
  ↓
REST API
  ↓
Dashboard
  ↓
Pothole displayed on GIS map
```

---

## Vehicle / Traffic

```text
Camera
  ↓
Vehicle Detection
  ↓
Classification
  ↓
Tracking
  ↓
Counting
  ↓
Traffic Metrics
  ↓
Traffic Event
  ↓
MQTT
  ↓
Backend
  ↓
PostgreSQL/PostGIS
  ↓
Dashboard
```

---

## Hit-and-Run

```text
Camera
  ↓
Vehicle Detection
  ↓
Tracking
  ↓
Incident Trigger
  ↓
Suspected Vehicle Track
  ↓
Snapshot
  ↓
GPS
  ↓
Incident Event
  ↓
MQTT + HTTP
  ↓
Central Server
  ↓
Incident Database
  ↓
Authority Dashboard
```

---

# 29. Technology Stack

| Layer                  | Technology              |
| ---------------------- | ----------------------- |
| Edge Language          | Python                  |
| Video Processing       | OpenCV                  |
| AI/ML                  | PyTorch                 |
| Object Detection       | YOLO-family model       |
| Object Tracking        | ByteTrack               |
| GPS                    | Simulated GPS initially |
| Edge Local DB          | SQLite                  |
| Edge → Server Metadata | MQTT                    |
| Snapshot Upload        | HTTP                    |
| MQTT Broker            | Mosquitto               |
| Backend                | FastAPI                 |
| Database               | PostgreSQL              |
| Geospatial Database    | PostGIS                 |
| Frontend               | React + TypeScript      |
| Maps                   | MapLibre GL JS          |
| Authentication         | JWT                     |
| Containerization       | Docker / Docker Compose |
| Version Control        | Git + GitHub            |

---

# 30. Repository Structure

```text
CityLens/
│
├── README.md
├── .gitignore
├── .env.example
├── docker-compose.yml
│
├── docs/
│   ├── architecture/
│   │   ├── system.md
│   │   ├── edge.md
│   │   └── data-flow.md
│   │
│   ├── api/
│   │   └── event-schema.md
│   │
│   ├── ml/
│   │   ├── models.md
│   │   ├── datasets.md
│   │   └── evaluation.md
│   │
│   └── product/
│       ├── requirements.md
│       └── features.md
│
├── edge/
│   ├── camera/
│   ├── perception/
│   ├── tracking/
│   ├── gps/
│   ├── events/
│   ├── communication/
│   ├── storage/
│   └── main.py
│
├── ml/
│   ├── datasets/
│   ├── preprocessing/
│   ├── training/
│   └── evaluation/
│
├── backend/
│   ├── api/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── database/
│   ├── mqtt/
│   ├── storage/
│   └── main.py
│
├── frontend/
│   └── src/
│
├── simulator/
│   ├── bus_simulator.py
│   ├── gps_simulator.py
│   └── scenarios/
│
├── infrastructure/
│   ├── mqtt/
│   └── postgres/
│
└── scripts/
```

Large datasets, raw videos, and model weights should **not** normally be committed to Git.

---



# 31. Development Strategy

CityLens should be developed incrementally.

## Milestone 1 — End-to-End Pothole Pipeline

```text
Video
 ↓
Pothole Detection
 ↓
Simulated GPS
 ↓
Event JSON
 ↓
MQTT
 ↓
FastAPI
 ↓
PostgreSQL/PostGIS
 ↓
React
 ↓
Pothole on Map
```

This is the first major integration milestone.

---

## Milestone 2 — Vehicle Analytics

Add:

```text
Vehicle Detection
 ↓
Classification
 ↓
Tracking
 ↓
Counting
 ↓
Traffic Analytics
 ↓
Dashboard
```

---

## Milestone 3 — Hit-and-Run

Add:

```text
Vehicle Tracking
 ↓
Incident Scenario
 ↓
Vehicle Identification
 ↓
Evidence Snapshot
 ↓
Incident Event
 ↓
Dashboard
```

---

## Milestone 4 — Multi-Bus Simulation

Simulate:

```text
BUS_001
BUS_002
BUS_003
...
```

and demonstrate that the central platform aggregates observations from the entire fleet.

---

# 32. Future Production Architecture

The prototype is intentionally simplified.

A production deployment may introduce:

* Physical GPS modules
* Multiple camera streams
* Dedicated edge AI hardware
* Hardware acceleration
* ONNX/TensorRT optimization
* Cloud/object storage
* More robust authentication
* Device certificates
* Encryption
* Fleet/device management
* Message persistence
* Scalable backend infrastructure
* Advanced analytics
* Automatic number plate recognition
* Privacy-preserving face/plate processing
* Real-time alerts where required

The production architecture should preserve the same fundamental principle:

> **Process data at the edge and transmit only useful information to the central platform.**

---

# 33. Core Architectural Principle

CityLens is not fundamentally a centralized video surveillance system.

It is a **distributed urban sensing network** in which public transport vehicles act as mobile sensing nodes.

```text
             CITY
              │
      ┌───────┼────────┐
      │       │        │
    BUS 1   BUS 2    BUS 3
      │       │        │
     AI      AI       AI
      │       │        │
      └───────┼────────┘
              │
        Event Metadata
              │
              ▼
       Central Platform
              │
      ┌───────┼────────┐
      │       │        │
    Roads   Traffic  Incidents
      │       │        │
      └───────┼────────┘
              │
              ▼
          Authorities
```

This edge-first, fleet-based architecture is the core of CityLens.
