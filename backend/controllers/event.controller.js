const {
    eventSchema,
    eventQuerySchema
} = require("../schemas/event.schema");

const eventService = require("../services/event.service");

async function createEvent(req, res, next) {
    try {
        const event = eventSchema.parse(req.body);

        const result = await eventService.create(event);

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}

async function getAllEvents(req, res, next) {
    try {
        const result = eventQuerySchema.safeParse(req.query);

        if (!result.success) {
            return res.status(400).json({
                message: "Invalid query parameters",
                errors: result.error.issues
            });
        }

        const events = await eventService.getAllEvents(result.data);

        res.status(200).json({
            count: events.length,
            events
        });
    } catch (error) {
        next(error);
    }
}

async function getEventById(req, res, next) {
    try {
        const id = Number(req.params.id);

        const event = await eventService.getEventById(id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        res.status(200).json(event);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createEvent,
    getAllEvents,
    getEventById
};