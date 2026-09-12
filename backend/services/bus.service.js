const pool = require("../db/pool");

async function create(bus) {
    const query = `
        INSERT INTO buses (
            bus_number,
            operator,
            model,
            status
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;

    const values = [
        bus.bus_number,
        bus.operator,
        bus.model,
        bus.status || "ACTIVE"
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
}

async function getAll() {
    const result = await pool.query(`
        SELECT *
        FROM buses
        ORDER BY id;
    `);

    return result.rows;
}

async function getById(id) {
    const result = await pool.query(
        `
        SELECT *
        FROM buses
        WHERE id = $1;
        `,
        [id]
    );

    return result.rows[0];
}

async function update(id, bus) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(bus)) {
        values.push(value);
        fields.push(`${key} = $${values.length}`);
    }

    values.push(id);

    const result = await pool.query(
        `
        UPDATE buses
        SET ${fields.join(", ")}
        WHERE id = $${values.length}
        RETURNING *;
        `,
        values
    );

    return result.rows[0];
}

module.exports = {
    create,
    getAll,
    getById,
    update
};