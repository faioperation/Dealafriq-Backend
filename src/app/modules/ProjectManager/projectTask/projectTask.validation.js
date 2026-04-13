import { z } from "zod";

const createProjectTaskSchema = z.object({
    body: z.object({
        projectId: z.string().uuid("Invalid project ID"),
        title: z.string().min(1, "Task title is required"),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        status: z.enum(["PENDING", "IN_PROGRESS", "REVIEW", "COMPLETED", "BLOCKED"]).optional(),
    }).refine((data) => {
        if (data.startDate && data.endDate) {
            return new Date(data.endDate) >= new Date(data.startDate);
        }
        return true;
    }, {
        message: "End date can not be before start date",
        path: ["endDate"],
    }),
});

const updateProjectTaskSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        status: z.enum(["PENDING", "IN_PROGRESS", "REVIEW", "COMPLETED", "BLOCKED"]).optional(),
    }).refine((data) => {
        if (data.startDate && data.endDate) {
            return new Date(data.endDate) >= new Date(data.startDate);
        }
        return true;
    }, {
        message: "End date can not be before start date",
        path: ["endDate"],
    }),
});

export const ProjectTaskValidation = {
    createProjectTaskSchema,
    updateProjectTaskSchema,
};
