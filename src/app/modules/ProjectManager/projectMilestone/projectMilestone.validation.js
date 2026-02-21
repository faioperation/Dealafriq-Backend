import { z } from "zod";

const createProjectMilestoneSchema = z.object({
    body: z.object({
        projectId: z.string().uuid("Invalid project ID"),
        title: z.string().min(1, "Milestone title is required"),
        description: z.string().optional(),
        milestoneDate: z.string().min(1, "Milestone date is required"),
        status: z.enum(["UPCOMING", "IN_PROGRESS", "COMPLETED", "DELAYED"]),
    }),
});

const updateProjectMilestoneSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        milestoneDate: z.string().optional(),
        status: z.enum(["UPCOMING", "IN_PROGRESS", "COMPLETED", "DELAYED"]).optional(),
    }),
});

export const ProjectMilestoneValidation = {
    createProjectMilestoneSchema,
    updateProjectMilestoneSchema,
};
