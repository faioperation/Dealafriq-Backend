import { z } from "zod";

const updateProjectHealthSchema = z.object({
    body: z.object({
        projectId: z.string().uuid("Invalid project ID").optional(),
        overallStatus: z.string().optional(),
        budgetStatus: z.string().optional(),
        teamSentiment: z.string().optional(),
        score: z.number().int().min(0).max(100).optional(),
        status: z.string().optional(),
    }),
});

export const ProjectHealthValidation = {
    updateProjectHealthSchema,
};
