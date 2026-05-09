import { z } from "zod";

const createRaiddSchema = z.object({
    body: z.object({
        projectId: z.string().uuid("Invalid project ID"),
        title: z.string().optional(),
        description: z.any().optional(),
        type: z.preprocess((val) => {
            if (Array.isArray(val)) return val.map((v) => (typeof v === "string" ? v.toUpperCase() : v));
            if (typeof val === "string") return [val.toUpperCase()];
            return val;
        }, z.array(z.enum(["RISK", "ASSUMPTION", "ISSUE", "DECISION", "DEPENDENCY"]))),
        status: z.preprocess(
            (val) => (typeof val === "string" ? val.toUpperCase() : val),
            z.enum(["LOW", "MEDIUM", "HIGH"]).optional()
        ),
        assumptionValidationDueDate: z.string().datetime().optional(),
        decisionDueDate: z.string().datetime().optional(),
        decisionOwner: z.string().optional(),
        aiDetectionId: z.string().uuid("Invalid AI Detection ID").optional(),
    }),
});

const updateRaiddSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        description: z.any().optional(),
        type: z.preprocess((val) => {
            if (Array.isArray(val)) return val.map((v) => (typeof v === "string" ? v.toUpperCase() : v));
            if (typeof val === "string") return [val.toUpperCase()];
            return val;
        }, z.array(z.enum(["RISK", "ASSUMPTION", "ISSUE", "DECISION", "DEPENDENCY"])).optional()),
        status: z.preprocess(
            (val) => (typeof val === "string" ? val.toUpperCase() : val),
            z.enum(["LOW", "MEDIUM", "HIGH"]).optional()
        ),
        assumptionValidationDueDate: z.string().datetime().optional(),
        decisionDueDate: z.string().datetime().optional(),
        decisionOwner: z.string().optional(),
    }),
});

export const RaiddValidation = {
    createRaiddSchema,
    updateRaiddSchema,
};
