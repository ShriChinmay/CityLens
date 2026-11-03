# CityLens — Development Priorities & Postponed Features

**Last updated:** 3 November 2026

## 1. Current development focus

The next phase will focus on getting the existing CityLens components working together and delivering a usable frontend. Advanced capabilities will be added after this core workflow is demonstrated.

### Priority A — Edge-to-backend integration

Connect the existing edge pipeline to the backend and verify the complete data flow.

- [ ] Connect the edge MQTT publisher to the backend MQTT subscriber.
- [ ] Confirm the expected event message format and validate incoming payloads.
- [ ] Persist incoming detections using the existing event-ingestion and incident-deduplication logic.
- [ ] Attach GPS coordinates and timestamps to incoming detections.
- [ ] Transfer/store detection snapshots and make them retrievable by the backend.
- [ ] Verify that repeated detections of the same incident are merged as expected.
- [ ] Handle disconnected brokers, temporary network failures, malformed messages, and retry behaviour.
- [ ] Manually verify the complete flow: video detection → event metadata/snapshot → MQTT → backend → PostgreSQL.

**Scope note:** This phase covers the existing pothole-detection pipeline. It does not include adding new computer-vision capabilities.

### Priority B — Frontend

Build the authority-facing interface and connect it to the existing backend APIs.

- [ ] Dashboard with incident counts and status summaries.
- [ ] Incident list with useful filters and sorting.
- [ ] Incident map showing reported locations.
- [ ] Incident details view, including severity, location, timestamps, and available snapshots.
- [ ] Incident verification and status-management actions.
- [ ] Incident observation/history view.
- [ ] Work-order list and work-order details.
- [ ] Work-order creation form, including assignee, priority, description, and due date.
- [ ] Loading, empty, validation, and API-error states.
- [ ] Responsive layout and basic usability checks.

The frontend should initially use the APIs that already exist. Any missing API needed by the UI can be added when that requirement becomes concrete.

### Priority C — End-to-end validation

- [ ] Run the edge pipeline and backend together locally.
- [ ] Confirm that a detected pothole appears in the database and frontend.
- [ ] Confirm that duplicate observations update the same incident rather than creating duplicate incidents.
- [ ] Verify incident history and work-order creation from the frontend.
- [ ] Fix integration issues discovered during the demonstration.

---

## 2. Features explicitly postponed

These are intentionally out of the current scope. They should not block edge-backend integration or the first usable frontend.

### A. Work-order lifecycle enhancements

- [ ] **Work Order Status Management API** — allow valid transitions such as `PENDING → IN_PROGRESS → COMPLETED`, with cancellation support.
- [ ] **Automatic Incident Resolution** — automatically move an incident to `RESOLVED` when its work orders reach the agreed terminal-state conditions.
- [ ] **Work Order Details Update API** — edit title, description, assignee, priority, and due date after creation.
- [ ] **Stricter incident/work-order consistency** — prevent an incident from being marked `WORK_ORDER_ISSUED` unless a work order has actually been created.

The existing work-order creation and retrieval APIs remain in scope for the first frontend.

### B. Additional evidence-management functionality

- [ ] A general-purpose evidence upload and management workflow for authorities or contractors.
- [ ] Support for evidence beyond the detection snapshot required by the initial edge-to-backend pipeline.

**Important distinction:** Transferring and displaying the edge-generated detection snapshot is part of the current integration scope. The broader evidence-management feature is postponed.

### C. Advanced computer-vision capabilities

- [ ] Vehicle detection, classification, tracking, and counting.
- [ ] Traffic analytics.
- [ ] Hit-and-run detection.
- [ ] Other advanced traffic-incident detection capabilities.

The existing pothole-detection capability is the only CV capability in the current integration scope.

### D. Multi-device scale simulation

- [ ] Full multi-bus / multi-device simulation.
- [ ] Load and scalability testing across many concurrent edge devices.

Basic integration checks with the available setup are still required; only the broader simulation and scale testing are postponed.

---

## 3. Later-stage work

These activities are deferred until the core integration and frontend are working:

- [ ] Production deployment and infrastructure hardening.
- [ ] Production MQTT broker configuration.
- [ ] Comprehensive performance, load, and reliability testing.
- [ ] Final documentation and demonstration preparation.

Local setup and the documentation needed to develop and run the current system are not postponed.

---

## 4. Suggested execution order

1. Complete edge-to-backend MQTT and event-ingestion integration.
2. Verify GPS, snapshot handling, and incident deduplication end to end.
3. Build the frontend around the existing incident and work-order APIs.
4. Connect the frontend to the backend and validate the complete user workflow.
5. Revisit the postponed features after the core product is demonstrable.

## 5. Definition of the first demonstrable version

The first demonstrable version should support this workflow:

1. A bus camera processes a video and detects a pothole.
2. The edge application attaches location and timestamp information and publishes the event.
3. The backend receives the event, stores it, and merges duplicate observations where appropriate.
4. An authority views the incident and its available snapshot on the frontend.
5. The authority verifies the incident.
6. The authority creates and views a work order for the incident.

**Completion target:** A working local end-to-end demonstration of this workflow. Advanced CV, automated work-order completion/resolution, large-scale multi-bus simulation, and production deployment are not prerequisites for this milestone.
