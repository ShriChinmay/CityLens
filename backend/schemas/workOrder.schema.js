const { z } = require("zod");

const workOrderSchema = z.object({
    event_id: z.number().int().positive(),

    title: z.string().trim().min(3).max(255),

    description: z.string().optional(),

    assigned_to: z.string().trim().min(1).max(255).optional(),

    priority: z.enum([
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
    ]).default("MEDIUM"),

    due_date: z.coerce.date().optional()
});

module.exports = {
    workOrderSchema
};