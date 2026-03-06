import { z } from "zod";

const createAiDetectionSchema = z.object({
    body: z.object({
        title: z.string().min(1, "Title is required"),
        summary: z.string().optional(),
        sourceType: z.string().min(1, "Source type is required"),
        managerId: z.string().optional(),
    }),
});

const updateAiDetectionSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        summary: z.string().optional(),
        sourceType: z.string().optional(),
        managerId: z.string().optional(),
    }),
});

export const AiDetectionValidation = {
    createAiDetectionSchema,
    updateAiDetectionSchema,
};
