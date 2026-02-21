import { z } from "zod";

const createProjectSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Project name is required"),
        description: z.string().optional(),
        vendorName: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(["DRAFT", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
    }),
});

const updateProjectSchema = z.object({
    body: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        vendorName: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(["DRAFT", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
    }),
});

export const ProjectManagerProjectValidation = {
    createProjectSchema,
    updateProjectSchema,
};
