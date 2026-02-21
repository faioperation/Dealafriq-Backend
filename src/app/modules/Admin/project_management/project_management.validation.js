import { z } from "zod";

const createProjectSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Project name is required"),
        description: z.string().optional(),
        vendorName: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        managerId: z.string().uuid("Invalid manager ID"),
        status: z.enum(["DRAFT", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
        meetings: z.array(z.object({
            title: z.string().optional(),
            meetingUrl: z.string().url("Invalid meeting URL").optional(),
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
        managerId: z.string().uuid("Invalid manager ID").optional(),
        teamId: z.string().uuid("Invalid team ID").optional(),
        status: z.enum(["DRAFT", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
    }),
});

export const ProjectManagementValidation = {
    createProjectSchema,
    updateProjectSchema,
};
