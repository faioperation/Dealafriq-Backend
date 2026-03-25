import { z } from "zod";

const createMessageSchema = z.object({
    body: z.object({
        content: z.string().min(1, "Message content is required"),
        sender: z.enum(["USER", "AGENT"]),
        agentName: z.string().optional(),
        documentUrl: z.string().url("Invalid document URL").optional(),
        documentPath: z.string().optional(),
    }),
});

const updateMessageSchema = z.object({
    body: z.object({
        content: z.string().min(1, "Message content is required").optional(),
        agentName: z.string().optional(),
        documentUrl: z.string().url("Invalid document URL").optional(),
        documentPath: z.string().optional(),
    }),
});

export const ProjectChatbotValidation = {
    createMessageSchema,
    updateMessageSchema,
};
