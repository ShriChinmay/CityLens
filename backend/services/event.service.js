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
async function getAllEvents() {
    const query = `
        SELECT *
        FROM events
        ORDER BY detected_at DESC;
    `;

    const result = await pool.query(query);

    return result.rows;
}


module.exports = {
    create,
    getAllEvents
};