import { z } from "zod";

const createLessonLearnSchema = z.object({
    body: z.object({
        projectId: z.string().uuid("Invalid project ID"),
        projectName: z.string().optional(),
        clientName: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        source: z.string().optional(),
        loggedDate: z.string().datetime({ message: "Invalid datetime string! Must be UTC." }).optional(),
        current_situation_summary: z.string().optional(),
        historical_insights: z.any().optional(),
        actionable_warnings: z.any().optional(),
        status: z.string().optional(),
        aiResponse: z.any().optional(),
    }),
});

const updateLessonLearnSchema = z.object({
    body: z.object({
        projectName: z.string().min(1, "Project name cannot be empty").optional(),
        clientName: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        source: z.string().optional(),
        loggedDate: z.string().datetime({ message: "Invalid datetime string! Must be UTC." }).optional(),
        current_situation_summary: z.string().optional(),
        historical_insights: z.any().optional(),
        actionable_warnings: z.any().optional(),
        status: z.string().optional(),
        aiResponse: z.any().optional(),
    }),
});

export const LessonLearnValidation = {
    createLessonLearnSchema,
    updateLessonLearnSchema,
};
