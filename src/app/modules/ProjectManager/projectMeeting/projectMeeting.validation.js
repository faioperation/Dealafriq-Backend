import { z } from "zod";

const createProjectMeetingSchema = z.object({
    body: z.object({
        projectId: z.string().uuid("Invalid project ID"),
        title: z.string().optional(),
        lastMeetingSummary: z.string().optional(),
        aiMeetingSummary: z.string().optional(),
        projectSummary: z.string().optional(),
        meetingUrl: z.string().url("Invalid meeting URL").optional().or(z.literal("")),
        videoPlayUrl: z.string().url("Invalid video play URL").optional().or(z.literal("")),
        meetingDate: z.string().optional().refine((val) => {
            if (!val) return true;
            const meetingD = new Date(val);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return meetingD >= today;
        }, { message: "Meeting date cannot be in the past" }),

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
        lastMeetingSummary: z.string().optional(),
        aiMeetingSummary: z.string().optional(),
        projectSummary: z.string().optional(),
        meetingUrl: z.string().url("Invalid meeting URL").optional().or(z.literal("")),
        videoPlayUrl: z.string().url("Invalid video play URL").optional().or(z.literal("")),
        meetingDate: z.string().optional().refine((val) => {
            if (!val) return true;
            const meetingD = new Date(val);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return meetingD >= today;
        }, { message: "Meeting date cannot be in the past" }),

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