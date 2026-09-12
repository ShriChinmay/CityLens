const express = require("express");

const { createEvent } = require("../controllers/event.controller");
const { getAllEvents } = require("../controllers/event.controller");
const router = express.Router();

router.post("/", createEvent);
router.get("/", getAllEvents);
module.exports = router;