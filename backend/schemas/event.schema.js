const { z } = require("zod");

const eventSchema = z.object({
    bus_id: z.number().int().positive(),
    camera_id: z.number().int().positive(),
    event_type: z.enum([
        "POTHOLE",
        "DAMAGED_ROAD",
        "WATERLOGGING",
        "ACCIDENT",
    ]),
    confidence: z.number().min(0).max(1),
    severity: z.enum([
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
    ]),
    
    detected_at: z.coerce.date(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),

    metadata: z.record(z.string(), z.any()).optional()
});

const eventQuerySchema = z.object({
    event_type: z.enum([
        "POTHOLE",
        "DAMAGED_ROAD",
        "WATERLOGGING",
        "ACCIDENT",
    ]).optional(),

    severity: z.enum([
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
    ]).optional(),

    bus_id: z.coerce.number().int().positive().optional(),

    camera_id: z.coerce.number().int().positive().optional()
});


module.exports = {
    eventSchema,
    eventQuerySchema
};
