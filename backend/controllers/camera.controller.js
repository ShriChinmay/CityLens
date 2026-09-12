const {
    cameraSchema,
    cameraUpdateSchema
} = require("../schemas/camera.schema");

const cameraService = require("../services/camera.service");

async function createCamera(req, res, next) {
    try {
        const camera = cameraSchema.parse(req.body);

        const result = await cameraService.create(camera);

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}

async function getAllCameras(req, res, next) {
    try {
        const cameras = await cameraService.getAll();

        res.status(200).json({
            count: cameras.length,
            cameras
        });
    } catch (error) {
        next(error);
    }
}

async function getCameraById(req, res, next) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid camera id"
            });
        }

        const camera = await cameraService.getById(id);

        if (!camera) {
            return res.status(404).json({
                message: "Camera not found"
            });
        }

        res.status(200).json(camera);
    } catch (error) {
        next(error);
    }
}

async function updateCamera(req, res, next) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid camera id"
            });
        }

        const camera = cameraUpdateSchema.parse(req.body);

        const result = await cameraService.update(id, camera);

        if (!result) {
            return res.status(404).json({
                message: "Camera not found"
            });
        }

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createCamera,
    getAllCameras,
    getCameraById,
    updateCamera
};