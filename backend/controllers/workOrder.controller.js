const { workOrderSchema } = require("../schemas/workOrder.schema");
const workOrderService = require("../services/workOrder.service");

async function createWorkOrder(req, res, next) {
    try {
        const validation = workOrderSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                message: "Invalid work order data",
                errors: validation.error.issues
            });
        }

        const result = await workOrderService.createWorkOrder(
            validation.data
        );

        if (result.type === "EVENT_NOT_FOUND") {
            return res.status(404).json({
                message: "Associated incident not found"
            });
        }

        if (result.type === "INVALID_EVENT_STATUS") {
            return res.status(409).json({
                message: "Work orders can only be created for verified or work-order-issued incidents",
                current_status: result.currentStatus,
                allowed_statuses: ["VERIFIED", "WORK_ORDER_ISSUED"]
            });
        }

        return res.status(201).json({
            message: "Work order created successfully",
            work_order: result.workOrder,
            event: result.event
        });

    } catch (error) {
        next(error);
    }
}

async function getAllWorkOrders(req, res, next) {
    try {
        const { status, priority, event_id } = req.query;

        const allowedStatuses = [
            "PENDING",
            "IN_PROGRESS",
            "COMPLETED",
            "CANCELLED"
        ];

        const allowedPriorities = [
            "LOW",
            "MEDIUM",
            "HIGH",
            "CRITICAL"
        ];

        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid work order status",
                allowed_statuses: allowedStatuses
            });
        }

        if (priority && !allowedPriorities.includes(priority)) {
            return res.status(400).json({
                message: "Invalid work order priority",
                allowed_priorities: allowedPriorities
            });
        }

        let parsedEventId;

        if (event_id !== undefined) {
            parsedEventId = Number(event_id);

            if (!Number.isInteger(parsedEventId) || parsedEventId <= 0) {
                return res.status(400).json({
                    message: "event_id must be a positive integer"
                });
            }
        }

        const filters = {
            status,
            priority,
            event_id: parsedEventId
        };

        const workOrders = await workOrderService.getAllWorkOrders(filters);

        return res.status(200).json({
            count: workOrders.length,
            work_orders: workOrders
        });

    } catch (error) {
        next(error);
    }
}


async function getWorkOrderById(req, res, next) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid work order ID"
            });
        }

        const workOrder = await workOrderService.getWorkOrderById(id);

        if (!workOrder) {
            return res.status(404).json({
                message: "Work order not found"
            });
        }

        return res.status(200).json({
            work_order: workOrder
        });

    } catch (error) {
        next(error);
    }
}


async function getWorkOrdersByEventId(req, res, next) {
    try {
        const eventId = Number(req.params.eventId);

        if (!Number.isInteger(eventId) || eventId <= 0) {
            return res.status(400).json({
                message: "Invalid incident ID"
            });
        }

        const workOrders = await workOrderService.getWorkOrdersByEventId(eventId);

        return res.status(200).json({
            event_id: eventId,
            count: workOrders.length,
            work_orders: workOrders
        });

    } catch (error) {
        next(error);
    }
}

module.exports = {
    createWorkOrder,
    getAllWorkOrders,
    getWorkOrderById,
    getWorkOrdersByEventId
};