const express = require("express");

const {
    createWorkOrder,
    getAllWorkOrders,
    getWorkOrderById,
    getWorkOrdersByEventId
} = require("../controllers/workOrder.controller");

const router = express.Router();

// Get all work orders (with optional filters).
router.get("/", getAllWorkOrders);

// Get work orders associated with an incident.
router.get("/event/:eventId", getWorkOrdersByEventId);

// Get a specific work order.
router.get("/:id", getWorkOrderById);

// Create a work order.
router.post("/", createWorkOrder);

module.exports = router;