require("dotenv").config();

require("dotenv").config();

console.log({
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    passwordLoaded: !!process.env.DB_PASSWORD,
    passwordLength: process.env.DB_PASSWORD?.length
});
const app = require("./app");

const PORT = process.env.PORT || 3000;
const pool = require("./db/pool");
pool.query("SELECT NOW()", (err, result) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Database connected:", result.rows[0]);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});