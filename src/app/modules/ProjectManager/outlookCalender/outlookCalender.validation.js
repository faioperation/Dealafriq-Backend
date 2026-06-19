import { z } from "zod";

const syncCalendarSchema = z.object({
    body: z.object({
        projectId: z.string().uuid("Invalid project ID").optional(),
    }),
});

const getEventsSchema = z.object({
    params: z.object({
        projectId: z.string().uuid("Invalid project ID").optional(),
    }),
});

export const OutlookCalendarValidation = {
    syncCalendarSchema,
    getEventsSchema,
};
