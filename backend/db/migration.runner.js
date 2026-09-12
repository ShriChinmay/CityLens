const fs = require("fs");
const path = require("path");
require("dotenv").config();
const pool = require("./pool");

async function createMigrationTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
}

async function runMigrations() {
    try {
        await createMigrationTable();

        const migrationsPath = path.join(__dirname, "migrations");

        const files = fs
            .readdirSync(migrationsPath)
            .filter(file => file.endsWith(".sql"))
            .sort();

        const result = await pool.query(`
            SELECT name
            FROM schema_migrations
            ORDER BY id
        `);

        const executed = new Set(
            result.rows.map(row => row.name)
        );

        for (const file of files) {
            if (executed.has(file)) {
                console.log(`Skipping ${file}`);
                continue;
            }

            console.log(`Running ${file}`);

            const filePath = path.join(migrationsPath, file);

            const sql = fs.readFileSync(filePath, "utf8");

            await pool.query(sql);

            await pool.query(
                `INSERT INTO schema_migrations (name)
                 VALUES ($1)`,
                [file]
            );

            console.log(`Completed ${file}`);
        }

        console.log("Migrations complete.");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await pool.end();
    }
}

runMigrations();