function errorHandler(err, req, res, next) {
    if (err.name === "ZodError") {
        return res.status(400).json({
            message: "Invalid request data",
            errors: err.issues
        });
    }
    if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
    }

    if (err.code === "23503") {
        return res.status(400).json({
            message: "Invalid bus_id or camera_id"
        });
    }
    if (err.code === "23505") {
        return res.status(409).json({
            message: "A record with that unique value already exists"
        });
    }

    console.error(err);

    res.status(500).json({
        message: "Internal server error"
    });
}


module.exports = errorHandler;
