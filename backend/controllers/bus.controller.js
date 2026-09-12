const {
    busSchema,
    busUpdateSchema
} = require("../schemas/bus.schema");

const busService = require("../services/bus.service");

async function createBus(req, res, next) {
    try {
        const bus = busSchema.parse(req.body);
        
        const result = await busService.create(bus);

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}

async function getAllBuses(req, res, next) {
    try {
        const buses = await busService.getAll();

        res.status(200).json({
            count: buses.length,
            buses
        });
    } catch (error) {
        next(error);
    }
}

async function getBusById(req, res, next) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid bus id"
            });
        }

        const bus = await busService.getById(id);

        if (!bus) {
            return res.status(404).json({
                message: "Bus not found"
            });
        }

        res.status(200).json(bus);
    } catch (error) {
        next(error);
    }
}

async function updateBus(req, res, next) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid bus id"
            });
        }

        const bus = busUpdateSchema.parse(req.body);

        const result = await busService.update(id, bus);

        if (!result) {
            return res.status(404).json({
                message: "Bus not found"
            });
        }

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createBus,
    getAllBuses,
    getBusById,
    updateBus
};