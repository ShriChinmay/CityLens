const express = require("express");

const eventRoutes = require("./routes/event.routes");
const errorHandler = require("./middlewares/error.middleware");
const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
    res.json({
        status: "ok"
    });
});

app.use("/api/v1/events", eventRoutes);
app.use(errorHandler);

module.exports = app;