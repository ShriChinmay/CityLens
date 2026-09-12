const express = require("express");

const {
    createBus,
    getAllBuses,
    getBusById,
    updateBus
} = require("../controllers/bus.controller");

const router = express.Router();

router.post("/", createBus);
router.get("/", getAllBuses);
router.get("/:id", getBusById);
router.patch("/:id", updateBus);

module.exports = router;