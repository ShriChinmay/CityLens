# CityLens --- Development Priorities & Postponed Features

**Last updated:** 5 November 2026

## 1. Current development status

The edge-to-backend integration has been completed and tested locally.
The current focus is the authority-facing frontend and its
incident-management workflow. The prototype now includes incident
lifecycle visibility, detection history, and status-transition controls.
Full work-order management is deferred to the next development cycle.

### Priority A --- Edge-to-backend integration

**Status: Completed for the current prototype**

-   [x] Connect the edge MQTT publisher to the backend MQTT subscriber.
-   [x] Confirm the expected event message format and validate incoming
    payloads.
-   [x] Persist incoming detections using the existing event-ingestion
    and incident-deduplication logic.
-   [x] Attach GPS coordinates and timestamps to incoming detections.
-   [x] Transfer/store detection snapshots and make them retrievable by
    the backend.
-   [x] Verify that repeated detections of the same incident are merged
    as expected.
-   [ ] Further harden disconnected-broker handling, temporary network
    failures, malformed messages, and retry behaviour.
-   [x] Manually verify the local flow: video detection → event
    metadata/snapshot → MQTT → backend → PostgreSQL.

**Scope note:** This phase covers the existing pothole-detection
pipeline. It does not include adding new computer-vision capabilities.
Reliability hardening beyond the successful local integration test
remains future work.

### Priority B --- Frontend

**Status: Core incident-detail prototype implemented; work-order
experience remains pending.**

Completed:

-   [x] Authority-facing frontend with dashboard, incident list, map,
    and incident detail views.
-   [x] Incident lifecycle summary on the incident detail page,
    including current status, detection count, and first/last observed
    timestamps.
-   [x] Incident status-transition controls for
    `DETECTED → VERIFIED → WORK_ORDER_ISSUED → RESOLVED → AUDITED`.
-   [x] Frontend API integration for updating incident status.
-   [x] Incident observation/history API integration and chronological
    detection-history display.
-   [x] Loading and error handling for observation history and status
    updates.
-   [x] TypeScript production build verified after the incident-detail
    changes.

Remaining:

-   [ ] Verify the status-update request end to end against the local
    backend, including JSON request headers and valid transition
    responses.
-   [ ] Replace the direct **Issue work order** status transition with a
    work-order creation flow. Clicking it should open a form rather than
    merely PATCHing the incident status.
-   [ ] Work-order creation form with title, description, assignee,
    priority, and due date.
-   [ ] Integrate the form with the existing `POST /api/v1/work-orders`
    endpoint.
-   [ ] Display work orders associated with an incident using the
    existing work-order retrieval endpoint.
-   [ ] Add a dedicated Work Orders dashboard/page with a list, filters,
    and work-order details.
-   [ ] Add clear work-order status and due-date indicators to the
    dashboard and incident detail page.
-   [ ] Improve the lifecycle UI with a visual progress indicator and
    clear action states, if useful during testing.
-   [ ] Recheck loading, empty, validation, and API-error states across
    the complete workflow.
-   [ ] Responsive layout and basic usability checks.

**Important implementation note:** The backend already has work-order
creation and retrieval endpoints. Reuse these before adding new backend
functionality. Creating a work order must use
`POST /api/v1/work-orders`; do not simulate creation by only changing
the incident status.

### Priority C --- End-to-end validation

-   [x] Run the edge pipeline and backend together locally.
-   [x] Confirm that detections reach the database and that duplicate
    observations are merged into incidents.
-   [ ] Confirm that a live backend incident appears correctly in the
    frontend with its lifecycle fields.
-   [ ] Verify incident status transitions end to end.
-   [ ] Verify observation history against actual backend data.
-   [ ] Verify work-order creation from the frontend.
-   [ ] Verify that a created work order is visible both on its incident
    detail page and in the Work Orders dashboard.
-   [ ] Fix integration issues discovered during the demonstration.

------------------------------------------------------------------------

## 2. Features explicitly postponed

These are intentionally out of the current prototype scope. They should
not block the current incident-detail prototype or the next work-order
UI milestone unless specifically required.

### A. Work-order lifecycle and management enhancements

-   [ ] **Work Order Status Management API** --- implement backend
    support for valid transitions such as
    `PENDING → IN_PROGRESS → COMPLETED`, with cancellation support and
    transition validation.
-   [ ] **Work Order Status UI** --- add frontend controls to update
    work-order status and display the resulting state.
-   [ ] **Work Order Details Update API/UI** --- edit title,
    description, assignee, priority, and due date after creation.
-   [ ] **Work-order completion and incident resolution workflow** ---
    keep work-order completion separate from incident resolution.
    Completing a work order must not automatically mark an incident
    resolved without the agreed verification step.
-   [ ] **Incident Resolution and Audit workflow** --- define and
    implement how an authority verifies the repair, moves the incident
    to `RESOLVED`, and subsequently completes the `AUDITED` stage.
-   [ ] **Automatic Incident Resolution** --- consider automation only
    after the manual work-order completion and authority-verification
    workflow is reliable.
-   [ ] **Stricter incident/work-order consistency** --- prevent an
    incident from being marked `WORK_ORDER_ISSUED` unless a work order
    has actually been created. Work-order creation should update the
    incident status transactionally, as the existing backend creation
    flow is designed to do.

**Important distinction:** The current frontend has a generic incident
status-transition control. The `VERIFIED → WORK_ORDER_ISSUED` action
must be replaced by actual work-order creation. The existing backend
creation endpoint creates the work-order record and updates the incident
status in the same transaction. Do not use the generic incident status
PATCH as a substitute for creating a work order.

### B. Additional evidence-management functionality

-   [ ] A general-purpose evidence upload and management workflow for
    authorities or contractors.
-   [ ] Support for evidence beyond the detection snapshot required by
    the initial edge-to-backend pipeline.

**Important distinction:** Transferring and displaying the
edge-generated detection snapshot is part of the current integration
scope. The broader evidence-management feature is postponed.

### C. Advanced computer-vision capabilities

-   [ ] Vehicle detection, classification, tracking, and counting.
-   [ ] Traffic analytics.
-   [ ] Hit-and-run detection.
-   [ ] Other advanced traffic-incident detection capabilities.

The existing pothole-detection capability is the only CV capability in
the current integration scope.

### D. Multi-device scale simulation

-   [ ] Full multi-bus / multi-device simulation.
-   [ ] Load and scalability testing across many concurrent edge
    devices.

Basic integration checks with the available setup are complete; only
broader simulation and scale testing are postponed.

------------------------------------------------------------------------

## 3. Later-stage work

These activities are deferred until the core integration and frontend
are working:

-   [ ] Production deployment and infrastructure hardening.
-   [ ] Production MQTT broker configuration.
-   [ ] Comprehensive performance, load, and reliability testing.
-   [ ] Final documentation and demonstration preparation.

Local setup and the documentation needed to develop and run the current
system are not postponed.

## 4. Suggested execution order

1.  Verify the current incident status-update API call against the local
    backend.
2.  Build the work-order creation form in the frontend.
3.  Connect the form to the existing `POST /api/v1/work-orders`
    endpoint.
4.  Display associated work orders on incident detail pages.
5.  Build the dedicated Work Orders dashboard.
6.  Implement work-order status management in the backend and frontend.
7.  Implement the authority-led incident resolution and audit workflow.
8.  Revisit broader reliability, evidence-management, CV, simulation,
    and deployment work.

## 5. Definition of the current prototype

The current prototype should demonstrate this workflow:

1.  A bus camera processes a video and detects a pothole.
2.  The edge application attaches location and timestamp information and
    publishes the event.
3.  The backend receives the event, stores it, and merges duplicate
    observations where appropriate.
4.  An authority views the incident, its available snapshot, lifecycle
    summary, and detection history on the frontend.
5.  The authority can initiate an incident status transition through the
    frontend, subject to backend validation.

**Current stopping point:** The incident lifecycle card, detection
history, and status-transition UI have been added and the frontend
production build passes. Full work-order creation and management,
work-order status updates, and the authority-led resolution/audit
workflow are postponed for the next development cycle.

## 6. Definition of the next demonstrable milestone

The next milestone should support the complete incident-to-work-order
workflow:

1.  An authority verifies an incident.
2.  The authority clicks **Issue work order** and completes a form.
3.  The frontend submits the form to the existing work-order creation
    API.
4.  The backend creates the work order and updates the incident to
    `WORK_ORDER_ISSUED` transactionally.
5.  The authority can view the associated work order on the incident
    page and in the Work Orders dashboard.
6.  The work order can subsequently be managed through its own status
    lifecycle.

Incident resolution and audit should remain separate
authority-controlled steps; work-order completion alone should not imply
that the incident has been verified as repaired.
