# CityLens Backend

Node.js + Express API and MQTT consumer for CityLens. Receives detected
road-condition events (via MQTT and REST), validates them, stores them
in PostgreSQL, and serves evidence images and REST endpoints for the
dashboard.

For the full system picture, see the root [`README.md`](../README.md)
and [`docs/architecture.md`](../docs/architecture.md).

---

## Stack

- **Runtime:** Node.js, Express 5
- **Database:** PostgreSQL (via `pg`)
- **Validation:** Zod
- **Messaging:** MQTT (via the `mqtt` package), subscribing to events published by the edge pipeline
- **File uploads:** Multer (evidence images)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in this directory:

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

### 3. Run database migrations

```bash
npm run migrate
```

Runs `db/migration.runner.js`, which applies the SQL files in
`db/migrations/` in order:

```text
001_create_buses.sql
002_create_cameras.sql
003_create_events.sql
```

### 4. Start the server

```bash
npm start        # node server.js
# or, for auto-reload during development:
npm run dev       # nodemon server.js
```

The API listens on `http://localhost:$PORT` (default `3000`).

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

---

## Structure

```text
backend/
├── app.js                    # Express app, route mounting, static evidence serving
├── server.js                 # Entry point — starts app.js and the MQTT consumer
├── controllers/               # Request handlers per entity
│   ├── bus.controller.js
│   ├── camera.controller.js
│   ├── event.controller.js
│   └── evidence.controller.js
├── db/
│   ├── pool.js                # PostgreSQL connection pool
│   ├── migration.runner.js    # Applies SQL migrations in order
│   └── migrations/            # 001_create_buses.sql, 002_create_cameras.sql, 003_create_events.sql
├── middlewares/
│   └── error.middleware.js    # Central error handler (Zod, Postgres FK/unique violations, 500s)
├── mqtt/
│   └── mqtt.consumer.js       # Subscribes to MQTT_TOPIC, validates, persists events
├── routes/                    # Express routers per entity
├── schemas/                   # Zod schemas (bus, camera, event)
├── services/                  # Data-access layer per entity
└── uploads/
    └── evidence/               # Uploaded evidence images (gitignored, created at startup)
```

---

## API

All endpoints are mounted under `/api/v1` unless noted.

### Health

```
GET /health
```

### Events

```
GET  /api/v1/events              # list, supports filtering
GET  /api/v1/events/:id
POST /api/v1/events              # create directly (validated with the same schema as MQTT)
```

Filter query params: `event_type`, `severity`, `bus_id`, `camera_id`.

In normal operation, events are created by the MQTT consumer as they
arrive from the edge pipeline — `POST /api/v1/events` is a secondary
write path (useful for testing/seeding) validated by the same Zod
schema.

Event payload shape:

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
  "metadata": { "bbox": [336, 356, 490, 416] },
  "evidence_url": "/evidence/example.jpg"
}
```

`event_type`: `POTHOLE` | `DAMAGED_ROAD` | `WATERLOGGING` | `ACCIDENT`
`severity`: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

### Buses

```
GET   /api/v1/buses
GET   /api/v1/buses/:id
POST  /api/v1/buses
PATCH /api/v1/buses/:id
```

Body fields: `bus_number` (required, unique), `operator`, `model`,
`status` (`ACTIVE` | `INACTIVE` | `MAINTENANCE`, defaults to `ACTIVE`).

### Cameras

```
GET   /api/v1/cameras
GET   /api/v1/cameras/:id
POST  /api/v1/cameras
PATCH /api/v1/cameras/:id
```

Body fields: `bus_id` (required, must reference an existing bus),
`camera_type` (required), `position`, `status` (`ACTIVE` | `INACTIVE`
| `MAINTENANCE`, defaults to `ACTIVE`).

### Evidence

```
POST /api/v1/evidence
```

Multipart form upload, field name `image`. Accepts JPEG, PNG, or
WebP, up to 10 MB. Stores the file under `uploads/evidence/` with a
random UUID filename and returns its URL. Files are served back at:

```
GET /evidence/<filename>
```

---

## Validation and error handling

Every write endpoint (and the MQTT consumer) validates its payload
with the corresponding Zod schema in `schemas/`. The central error
middleware (`middlewares/error.middleware.js`) maps failures to
consistent HTTP responses:

| Condition | Response |
|---|---|
| Zod validation failure | `400` with `{ message, errors }` |
| Postgres foreign-key violation (bad `bus_id`/`camera_id`) | `400` |
| Postgres unique-constraint violation (e.g. duplicate `bus_number`) | `409` |
| Anything else | `500` |

---

## MQTT consumer

`mqtt/mqtt.consumer.js` connects to `MQTT_BROKER_URL`, subscribes to
`MQTT_TOPIC` (default `citylens/events`), and for each message:

1. Parses the JSON payload
2. Validates it against the event Zod schema
3. Persists it via the event service
4. Logs success/failure to the console

It runs alongside the HTTP server as part of the same process
(started from `server.js`), so `npm start` brings up both the REST
API and the MQTT subscriber.

---

## Notes

- The database schema is defined by the migration SQL files, not an
  ORM — see `db/migrations/` for exact column types and constraints.
- Evidence storage is local disk only in the current prototype
  (`uploads/evidence/`); this is a known limitation for production
  (see the root README's roadmap for planned object storage).
- CORS is not currently configured. If you run the frontend dev
  server separately (`frontend/`), it proxies API calls through Vite
  rather than calling this server cross-origin — see
  `frontend/readme.md`.
