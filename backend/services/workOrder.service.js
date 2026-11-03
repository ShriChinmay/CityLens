const pool = require("../db/pool");

async function createWorkOrder(data) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Lock the incident row to prevent concurrent modifications.
        const eventResult = await client.query(
            `SELECT id, status
             FROM events
             WHERE id = $1
             FOR UPDATE`,
            [data.event_id]
        );

        if (eventResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return {
                type: "EVENT_NOT_FOUND"
            };
        }

        const event = eventResult.rows[0];

        // Work orders can only be created for verified incidents.
        if (!["VERIFIED", "WORK_ORDER_ISSUED"].includes(event.status)) {
            await client.query("ROLLBACK");

            return {
                type: "INVALID_EVENT_STATUS",
                currentStatus: event.status
            };
        }

        // Create the work order.
        const workOrderResult = await client.query(
            `INSERT INTO work_orders (
                event_id,
                title,
                description,
                assigned_to,
                priority,
                due_date
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                data.event_id,
                data.title,
                data.description || null,
                data.assigned_to || null,
                data.priority || "MEDIUM",
                data.due_date || null
            ]
        );

        // Update the associated incident.
        let updatedEvent = event;

        if (event.status === "VERIFIED") {
            const result = await client.query(
                `UPDATE events
                SET status = 'WORK_ORDER_ISSUED'
                WHERE id = $1
                RETURNING *`,
                [data.event_id]
            );

            updatedEvent = result.rows[0];
        }

        await client.query("COMMIT");

        return {
            type: "SUCCESS",
            workOrder: workOrderResult.rows[0],
            event: updatedEvent
        };

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;

    } finally {
        client.release();
    }
}

async function getAllWorkOrders(filters = {}) {
    let query = `
        SELECT *
        FROM work_orders
    `;

    const conditions = [];
    const values = [];

    if (filters.status) {
        values.push(filters.status);
        conditions.push(`status = $${values.length}`);
    }

    if (filters.priority) {
        values.push(filters.priority);
        conditions.push(`priority = $${values.length}`);
    }

    if (filters.event_id) {
        values.push(filters.event_id);
        conditions.push(`event_id = $${values.length}`);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY created_at DESC, id DESC`;

    const result = await pool.query(query, values);

    return result.rows;
}


async function getWorkOrderById(id) {
    const result = await pool.query(
        `SELECT *
         FROM work_orders
         WHERE id = $1`,
        [id]
    );

    return result.rows[0] || null;
}


async function getWorkOrdersByEventId(eventId) {
    const result = await pool.query(
        `SELECT *
         FROM work_orders
         WHERE event_id = $1
         ORDER BY created_at DESC, id DESC`,
        [eventId]
    );

    return result.rows;
}

module.exports = {
    createWorkOrder,
    getAllWorkOrders,
    getWorkOrderById,
    getWorkOrdersByEventId
};