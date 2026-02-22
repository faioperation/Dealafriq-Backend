import { z } from "zod";

const uploadDocumentSchema = z.object({
    body: z.object({
        projectId: z.string().uuid("Invalid project ID"),
    }),
});

const uploadAgreementSchema = z.object({
    body: z.object({
        projectId: z.string().uuid("Invalid project ID"),
        fileType: z.string().optional(),
    }),
});

const updateDocumentSchema = z.object({
    body: z.object({
        projectSummary: z.string().optional(),
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
