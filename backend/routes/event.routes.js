const express = require("express");

const {
    createEvent,
    getAllEvents,
    getEventById,
    updateEventStatus
} = require("../controllers/event.controller");

const router = express.Router();

router.post("/", createEvent);
router.get("/", getAllEvents);
router.patch("/:id/status", updateEventStatus);
router.get("/:id", getEventById);

module.exports = router;
