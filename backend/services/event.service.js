const pool = require("../db/pool");

const MATCH_RADIUS_METERS = 5;
const MATCH_WINDOW_DAYS = 14;
const EARTH_RADIUS_METERS = 6371000;

const SEVERITY_RANK = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4
};

const ALLOWED_STATUS_TRANSITIONS = {
    DETECTED: ["VERIFIED"],
    VERIFIED: ["WORK_ORDER_ISSUED"],
    WORK_ORDER_ISSUED: ["RESOLVED"],
    RESOLVED: ["AUDITED"],
    AUDITED: []
};

/**
 * Calculate the highest severity reported for an incident.
 *
 * Severity is compared directly; it is not inferred from confidence.
 */
function getHigherSeverity(existingSeverity, incomingSeverity) {
    if (
        (SEVERITY_RANK[incomingSeverity] || 0) >
        (SEVERITY_RANK[existingSeverity] || 0)
    ) {
        return incomingSeverity;
    }

    return existingSeverity;
}

/**
 * Insert an individual observation associated with an incident.
 */
async function createObservation(client, eventId, event) {
    const query = `
        INSERT INTO event_observations (
            event_id,
            bus_id,
            camera_id,
            observed_at,
            latitude,
            longitude,
            confidence,
            metadata,
            evidence_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
    `;

    const values = [
        eventId,
        event.bus_id,
        event.camera_id,
        event.detected_at,
        event.latitude,
        event.longitude,
        event.confidence,
        event.metadata || {},
        event.evidence_url || null
    ];

    const result = await client.query(query, values);

    return result.rows[0];
}

/**
 * Find the nearest incident of the same type within the matching window
 * and radius.
 *
 * The caller must acquire the event-type advisory lock before calling
 * this function.
 */
async function findMatchingIncident(client, event) {
    const query = `
        SELECT
            e.*,
            distance.distance_m
        FROM events AS e

        CROSS JOIN LATERAL (
            SELECT
                2 * $7::double precision * ASIN(
                    SQRT(
                        LEAST(
                            1.0,
                            GREATEST(
                                0.0,
                                POWER(
                                    SIN(
                                        RADIANS(
                                            e.latitude::double precision
                                            - $2::double precision
                                        ) / 2
                                    ),
                                    2
                                )
                                +
                                COS(
                                    RADIANS($2::double precision)
                                )
                                * COS(
                                    RADIANS(
                                        e.latitude::double precision
                                    )
                                )
                                * POWER(
                                    SIN(
                                        RADIANS(
                                            e.longitude::double precision
                                            - $3::double precision
                                        ) / 2
                                    ),
                                    2
                                )
                            )
                        )
                    )
                ) AS distance_m
        ) AS distance

        WHERE e.event_type = $1

          AND e.last_seen_at >=
              $4::timestamptz - ($5::integer * INTERVAL '1 day')

          AND e.first_seen_at <=
              $4::timestamptz + ($5::integer * INTERVAL '1 day')

          AND distance.distance_m <= $6::double precision

        ORDER BY distance.distance_m ASC

        LIMIT 1

        FOR UPDATE OF e;
    `;

    const values = [
        event.event_type,
        event.latitude,
        event.longitude,
        event.detected_at,
        MATCH_WINDOW_DAYS,
        MATCH_RADIUS_METERS,
        EARTH_RADIUS_METERS
    ];

    const result = await client.query(query, values);

    return result.rows[0] || null;
}

/**
 * Create a new incident and record its first observation.
 */
async function createIncident(client, event) {
    const query = `
        INSERT INTO events (
            bus_id,
            camera_id,
            event_type,
            confidence,
            severity,
            detected_at,
            latitude,
            longitude,
            metadata,
            evidence_url,
            detection_count,
            first_seen_at,
            last_seen_at,
            status
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            1, $6, $6, 'DETECTED'
        )
        RETURNING *;
    `;

    const values = [
        event.bus_id,
        event.camera_id,
        event.event_type,
        event.confidence,
        event.severity,
        event.detected_at,
        event.latitude,
        event.longitude,
        event.metadata || {},
        event.evidence_url || null
    ];

    const result = await client.query(query, values);
    const incident = result.rows[0];

    await createObservation(client, incident.id, event);

    return incident;
}

/**
 * Add an observation to an existing incident and update its aggregates.
 */
async function updateIncident(client, incident, event) {
    const severity = getHigherSeverity(
        incident.severity,
        event.severity
    );

    const query = `
        UPDATE events
        SET
            detection_count = detection_count + 1,

            first_seen_at = LEAST(
                first_seen_at,
                $2::timestamptz
            ),

            last_seen_at = GREATEST(
                last_seen_at,
                $2::timestamptz
            ),

            detected_at = LEAST(
                detected_at,
                $2::timestamptz
            ),

            confidence = GREATEST(
                confidence,
                $3::numeric
            ),

            severity = $4,

            evidence_url = COALESCE(
                $5,
                evidence_url
            ),

            metadata = metadata || $6::jsonb

        WHERE id = $1

        RETURNING *;
    `;

    const values = [
        incident.id,
        event.detected_at,
        event.confidence,
        severity,
        event.evidence_url || null,
        JSON.stringify(event.metadata || {})
    ];

    const result = await client.query(query, values);

    await createObservation(client, incident.id, event);

    return result.rows[0];
}

/**
 * Create or update an incident using spatial deduplication.
 *
 * Existing callers can continue using eventService.create(event).
 */
async function create(event) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        /*
         * Serialize incident matching for the same event type.
         *
         * This prevents two concurrent transactions from both failing
         * to find an incident and creating duplicate incidents.
         */
        await client.query(
            `SELECT pg_advisory_xact_lock(hashtext($1))`,
            [event.event_type]
        );

        const incident = await findMatchingIncident(client, event);

        let result;

        if (incident) {
            result = await updateIncident(client, incident, event);

            console.log(
                `Observation added to incident ${incident.id}`
            );
        } else {
            result = await createIncident(client, event);

            console.log(
                `New incident created: ${result.id}`
            );
        }

        await client.query("COMMIT");

        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function getAllEvents(filters = {}) {
    let query = `
        SELECT *
        FROM events
    `;

    const conditions = [];
    const values = [];

    if (filters.event_type) {
        values.push(filters.event_type);
        conditions.push(`event_type = $${values.length}`);
    }

    if (filters.severity) {
        values.push(filters.severity);
        conditions.push(`severity = $${values.length}`);
    }

    if (filters.bus_id) {
        values.push(filters.bus_id);
        conditions.push(`bus_id = $${values.length}`);
    }

    if (filters.camera_id) {
        values.push(filters.camera_id);
        conditions.push(`camera_id = $${values.length}`);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY detected_at DESC;`;

    const result = await pool.query(query, values);

    return result.rows;
}

async function getEventById(id) {
    const query = `
        SELECT *
        FROM events
        WHERE id = $1;
    `;

    const result = await pool.query(query, [id]);

    return result.rows[0];
}

async function getEventObservations(eventId) {
    const query = `
        SELECT *
        FROM event_observations
        WHERE event_id = $1
        ORDER BY observed_at DESC, id DESC;
    `;

    const result = await pool.query(query, [eventId]);

    return result.rows;
}

async function updateEventStatus(id, newStatus) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `SELECT id, status
             FROM events
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");

            return {
                type: "NOT_FOUND"
            };
        }

        const currentStatus = result.rows[0].status;
        const allowedTransitions =
            ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];

        if (!allowedTransitions.includes(newStatus)) {
            await client.query("ROLLBACK");

            return {
                type: "INVALID_TRANSITION",
                currentStatus,
                requestedStatus: newStatus,
                allowedTransitions
            };
        }

        const updated = await client.query(
            `UPDATE events
             SET status = $1
             WHERE id = $2
             RETURNING *`,
            [newStatus, id]
        );

        await client.query("COMMIT");

        return {
            type: "SUCCESS",
            event: updated.rows[0]
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    create,
    getAllEvents,
    getEventById,
    updateEventStatus,
    getEventObservations
};
