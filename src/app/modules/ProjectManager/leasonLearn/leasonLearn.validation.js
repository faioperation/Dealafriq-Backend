import { z } from "zod";

const createLessonLearnSchema = z.object({
    body: z.object({
        projectId: z.string().uuid("Invalid project ID"),
        projectName: z.string().min(1, "Project name is required"),
        clientName: z.string().optional(),
        title: z.string().min(1, "Title is required"),
        description: z.string().min(1, "Description is required"),
        source: z.string().min(1, "Source is required"),
        loggedDate: z.string().datetime({ message: "Invalid datetime string! Must be UTC." }),
    }),
});

const updateLessonLearnSchema = z.object({
    body: z.object({
        projectName: z.string().min(1, "Project name cannot be empty").optional(),
        clientName: z.string().optional(),
        title: z.string().min(1, "Title cannot be empty").optional(),
        description: z.string().min(1, "Description cannot be empty").optional(),
        source: z.string().min(1, "Source cannot be empty").optional(),
        loggedDate: z.string().datetime({ message: "Invalid datetime string! Must be UTC." }).optional(),
    }),
});

export const LessonLearnValidation = {
    createLessonLearnSchema,
    updateLessonLearnSchema,
};
