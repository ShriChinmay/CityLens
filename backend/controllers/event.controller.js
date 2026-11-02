const {
    eventSchema,
    eventQuerySchema,
    eventStatusSchema
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

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid event ID"
            });
        }

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

async function updateEventStatus(req, res, next) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid event ID"
            });
        }

        const validation = eventStatusSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                message: "Invalid status",
                errors: validation.error.issues
            });
        }

        const result = await eventService.updateEventStatus(
            id,
            validation.data.status
        );

        if (result.type === "NOT_FOUND") {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        if (result.type === "INVALID_TRANSITION") {
            return res.status(409).json({
                message: "Invalid status transition",
                current_status: result.currentStatus,
                requested_status: result.requestedStatus,
                allowed_transitions: result.allowedTransitions
            });
        }

        return res.status(200).json({
            message: "Event status updated successfully",
            event: result.event
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createEvent,
    getAllEvents,
    getEventById,
    updateEventStatus
};
