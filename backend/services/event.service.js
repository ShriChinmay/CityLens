const pool = require("../db/pool");

async function create(event) {
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
            metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
        event.metadata || {}
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
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

module.exports = {
    create,
    getAllEvents,
    getEventById
};