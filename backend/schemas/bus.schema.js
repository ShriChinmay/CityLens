const { z } = require("zod");

const busSchema = z.object({
    bus_number: z.string().trim().min(1).max(50),
    operator: z.string().trim().max(100).optional(),
    model: z.string().trim().max(100).optional(),
    status: z.enum([
        "ACTIVE",
        "INACTIVE",
        "MAINTENANCE"
    ]).optional()
});

const busUpdateSchema = z.object({
    bus_number: z.string().trim().min(1).max(50).optional(),
    operator: z.string().trim().max(100).optional(),
    model: z.string().trim().max(100).optional(),
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
    busSchema,
    busUpdateSchema
};