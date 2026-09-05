const express = require("express");

const { createEvent } = require("../controllers/event.controller");

const router = express.Router();

router.post("/", createEvent);

module.exports = router;