import { z } from "zod";

const createRaiddSchema = z.object({
    body: z.object({
        projectId: z.string().uuid("Invalid project ID"),
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        type: z.preprocess(
            (val) => (typeof val === "string" ? val.toUpperCase() : val),
            z.enum(["RISK", "ASSUMPTION", "ISSUE", "DECISION", "DEPENDENCY"])
        ),
        status: z.preprocess(
            (val) => (typeof val === "string" ? val.toUpperCase() : val),
            z.enum(["LOW", "MEDIUM", "HIGH"])
        ),
    }),
});

const updateRaiddSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        type: z.preprocess(
            (val) => (typeof val === "string" ? val.toUpperCase() : val),
            z.enum(["RISK", "ASSUMPTION", "ISSUE", "DECISION", "DEPENDENCY"]).optional()
        ),
        status: z.preprocess(
            (val) => (typeof val === "string" ? val.toUpperCase() : val),
            z.enum(["LOW", "MEDIUM", "HIGH"]).optional()
        ),
    }),
});

export const RaiddValidation = {
    createRaiddSchema,
    updateRaiddSchema,
};
