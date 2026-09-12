const pool = require("../db/pool");

async function create(camera) {
    const query = `
        INSERT INTO cameras (
            bus_id,
            camera_type,
            position,
            status
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;

    const values = [
        camera.bus_id,
        camera.camera_type,
        camera.position,
        camera.status || "ACTIVE"
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
}

async function getAll() {
    const result = await pool.query(`
        SELECT *
        FROM cameras
        ORDER BY id;
    `);

    return result.rows;
}

async function getById(id) {
    const result = await pool.query(
        `
        SELECT *
        FROM cameras
        WHERE id = $1;
        `,
        [id]
    );

    return result.rows[0];
}

async function update(id, camera) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(camera)) {
        values.push(value);
        fields.push(`${key} = $${values.length}`);
    }

    values.push(id);

    const result = await pool.query(
        `
        UPDATE cameras
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