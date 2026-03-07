import { z } from "zod";

const uploadDocumentSchema = z.object({
    body: z.object({
        projectId: z.string().uuid("Invalid project ID"),
        title: z.string().optional(),
        aiDocumentSummary: z.string().optional(),
        projectsSummary: z.string().optional(), // Adding this as the user seemed to use it
        keyPoints: z.any().optional(), // Will be parsed in controller
        actionPoints: z.any().optional(), // Will be parsed in controller
    }).passthrough(),
});

const uploadAgreementSchema = z.object({
    body: z.object({
        projectId: z.string().uuid("Invalid project ID"),
        fileType: z.string().optional(),
    }),
});

const updateDocumentSchema = z.object({
    body: z.object({
        aiDocumentSummary: z.string().optional(),
        title: z.string().optional(),
        keyPoints: z.array(z.object({
            id: z.string().uuid().optional(),
            content: z.string().optional(),
            status: z.string().optional(),
        })).optional(),
        actionPoints: z.array(z.object({
            id: z.string().uuid().optional(),
            content: z.string().optional(),
            status: z.string().optional(),
        })).optional(),
    }),
});

export const ProjectDocumentValidation = {
    uploadDocumentSchema,
    uploadAgreementSchema,
    updateDocumentSchema,
};
