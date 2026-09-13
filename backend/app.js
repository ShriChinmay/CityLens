const express = require("express");

const eventRoutes = require("./routes/event.routes");
const busRoutes = require("./routes/bus.routes");
const cameraRoutes = require("./routes/camera.routes");

const evidenceRoutes = require("./routes/evidence.routes");
const errorHandler = require("./middlewares/error.middleware");
const app = express();
const path = require("path");
app.use(express.json());

app.get("/health", (req, res) => {
    res.json({
        status: "ok"
    });
});

app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/buses", busRoutes);
app.use("/api/v1/cameras", cameraRoutes);
app.use("/api/v1/evidence", evidenceRoutes);
app.use(
    "/evidence",
    express.static(path.join(__dirname, "uploads/evidence"))
);
app.use(errorHandler);

module.exports = app;
