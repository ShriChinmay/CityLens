const { z } = require("zod");

const cameraSchema = z.object({
    bus_id: z.number().int().positive(),

    camera_type: z.string()
        .trim()
        .min(1)
        .max(50),

    position: z.string()
        .trim()
        .max(50)
        .optional(),

    status: z.enum([
        "ACTIVE",
        "INACTIVE",
        "MAINTENANCE"
    ]).optional()
});

const cameraUpdateSchema = z.object({
    bus_id: z.number().int().positive().optional(),

    camera_type: z.string()
        .trim()
        .min(1)
        .max(50)
        .optional(),

    position: z.string()
        .trim()
        .max(50)
        .optional(),

    status: z.enum([
        "ACTIVE",
        "INACTIVE",
        "MAINTENANCE"
    ]).optional()
}).refine(
    data => Object.keys(data).length > 0,
    {
        message: "At least one field is required"
    }
);

module.exports = {
    cameraSchema,
    cameraUpdateSchema
};