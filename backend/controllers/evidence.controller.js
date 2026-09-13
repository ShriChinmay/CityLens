const path = require("path");
const fs = require("fs");

const uploadEvidence = (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            message: "Evidence image is required"
        });
    }

    const relativePath = `/evidence/${req.file.filename}`;

    return res.status(201).json({
        evidence_url: relativePath
    });
};

module.exports = {
    uploadEvidence
};