function errorHandler(err, req, res, next) {
    if (err.name === "ZodError") {
        return res.status(400).json({
            message: "Invalid event data",
            errors: err.issues
        });
    }
    console.error(err);

    res.status(500).json({
        message: "Internal server error"
    });
}


module.exports = errorHandler;