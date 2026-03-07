import { z } from 'zod';

const updateOutlookSchema = z.object({
    body: z.object({
        subject: z.string().optional(),
        body: z.string().optional(),
        category: z.string().optional(),
    }),
});

export const OutlookValidation = {
    updateOutlookSchema,
};
