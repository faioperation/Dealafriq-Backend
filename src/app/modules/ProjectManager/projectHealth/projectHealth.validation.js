import { z } from "zod";

const upsertProjectHealthSchema = z.object({
    body: z.object({
        projectId: z.string().uuid("Invalid project ID"),
        health: z.array(z.object({
            field: z.enum(["OVERALL_STATUS", "BUDGET_STATUS", "TEAM_SENTIMENT"]),
            healthStatus: z.enum(["ON_TRACK", "PENDING", "AT_RISK", "OFF_TRACK", "GOOD", "EXCELLENT", "LOW"]),
            score: z.number().int().optional(),
            status: z.string().optional(),
        })),
    }),
});

export const ProjectHealthValidation = {
    upsertProjectHealthSchema,
};
