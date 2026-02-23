import { z } from "zod";

const createProjectSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Project name is required"),
        description: z.string().optional(),
        vendorName: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(["DRAFT", "IN_PROGRESS", "ONGOING", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
        weeklyMeetingSummary: z.string().optional(),
        health: z.array(z.object({
            field: z.enum(["OVERALL_STATUS", "BUDGET_STATUS", "TEAM_SENTIMENT"]),
            healthStatus: z.enum(["ON_TRACK", "PENDING", "AT_RISK", "OFF_TRACK", "GOOD", "EXCELLENT", "LOW"]),
            score: z.number().int().optional(),
            status: z.string().optional(),
        })).optional(),
    }),
});

const updateProjectSchema = z.object({
    body: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        vendorName: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(["DRAFT", "IN_PROGRESS", "ONGOING", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
        weeklyMeetingSummary: z.string().optional(),
    }),
});

export const ProjectManagerProjectValidation = {
    createProjectSchema,
    updateProjectSchema,
};
