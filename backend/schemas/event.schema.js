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

module.exports = eventSchema;
