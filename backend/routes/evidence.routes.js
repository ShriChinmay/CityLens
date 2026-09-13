const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const evidenceController = require("../controllers/evidence.controller");

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../uploads/evidence"));
    },

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const filename = `${crypto.randomUUID()}${extension}`;

        cb(null, filename);
    }
});

const upload = multer({
    storage,

    limits: {
        fileSize: 10 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
        }

        cb(null, true);
    }
});

router.post(
    "/",
    upload.single("image"),
    evidenceController.uploadEvidence
);

module.exports = router;