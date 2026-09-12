const express = require("express");

const {
    createCamera,
    getAllCameras,
    getCameraById,
    updateCamera
} = require("../controllers/camera.controller");

const router = express.Router();

router.post("/", createCamera);
router.get("/", getAllCameras);
router.get("/:id", getCameraById);
router.patch("/:id", updateCamera);

module.exports = router;