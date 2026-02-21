import { z } from "zod";

const uploadAgreementSchema = z.object({
    body: z.object({
        projectId: z.string().uuid("Invalid project ID"),
        fileType: z.string().optional(),
    }),
});

export const ProjectAgreementValidation = {
    uploadAgreementSchema,
};
