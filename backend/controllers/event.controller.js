const eventSchema = require("../schemas/event.schema");
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

module.exports = {
    createEvent
};