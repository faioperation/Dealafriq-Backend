import { z } from "zod";

const createProjectMeetingSchema = z.object({
    body: z.object({
        projectId: z.string().uuid("Invalid project ID"),
        title: z.string().min(1, "Meeting title is required"),
        summary: z.string().optional(),
        projectSummary: z.string().optional(),
        meetingUrl: z.string().url("Invalid meeting URL").optional().or(z.literal("")),
        meetingDate: z.string().min(1, "Meeting date is required"),

        keyPoints: z.array(
            z.object({
                content: z.string().min(1),
                status: z.string().optional(),   // ✅ plain string
            })
        ).optional(),

        actionPoints: z.array(
            z.object({
                content: z.string().min(1),
                status: z.string().optional(),   // ✅ plain string
            })
        ).optional(),
    }),
});

const updateProjectMeetingSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        summary: z.string().optional(),
        projectSummary: z.string().optional(),
        meetingUrl: z.string().url("Invalid meeting URL").optional().or(z.literal("")),
        meetingDate: z.string().optional(),

        keyPoints: z.array(
            z.object({
                id: z.string().uuid().optional(),
                content: z.string().min(1).optional(),
                status: z.string().optional(),   // ✅ plain string
            })
        ).optional(),

        actionPoints: z.array(
            z.object({
                id: z.string().uuid().optional(),
                content: z.string().min(1).optional(),
                status: z.string().optional(),   // ✅ plain string
            })
        ).optional(),
    }),
});

export const ProjectMeetingValidation = {
    createProjectMeetingSchema,
    updateProjectMeetingSchema,
};