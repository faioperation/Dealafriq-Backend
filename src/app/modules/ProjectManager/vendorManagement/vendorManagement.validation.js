import { z } from "zod";

const createVendorSchema = z.object({
    body: z.object({
        name: z.string({
            required_error: "Name is required",
        }),
        designation: z.string().optional().nullable(),
        email: z.string().email("Invalid email address").optional().nullable(),
        phoneNumber: z.string().optional().nullable(),
        photoPath: z.string().optional().nullable(),
        photoUrl: z.string().optional().nullable(),
        numberOfProjects: z.number().int().optional().nullable(),
        contactPerson: z.string().optional().nullable(),
        contactRole: z.string().optional().nullable(),
        contactEmail: z.string().email("Invalid email address").optional().nullable(),
        contactPhone: z.string().optional().nullable(),
        contactDesignation: z.string().optional().nullable(),
        slaPath: z.string().optional().nullable(),
        slaUrl: z.string().optional().nullable(),
        documentPath: z.string().optional().nullable(),
        documentUrl: z.string().optional().nullable(),
        meetingLink: z.string().optional().nullable(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    }),
});

const updateVendorSchema = z.object({
    body: z.object({
        name: z.string().optional(),
        designation: z.string().optional().nullable(),
        email: z.string().email("Invalid email address").optional().nullable(),
        phoneNumber: z.string().optional().nullable(),
        photoPath: z.string().optional().nullable(),
        photoUrl: z.string().optional().nullable(),
        numberOfProjects: z.number().int().optional().nullable(),
        contactPerson: z.string().optional().nullable(),
        contactRole: z.string().optional().nullable(),
        contactEmail: z.string().email("Invalid email address").optional().nullable(),
        contactPhone: z.string().optional().nullable(),
        contactDesignation: z.string().optional().nullable(),
        slaPath: z.string().optional().nullable(),
        slaUrl: z.string().optional().nullable(),
        documentPath: z.string().optional().nullable(),
        documentUrl: z.string().optional().nullable(),
        meetingLink: z.string().optional().nullable(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    }),
});

export const VendorValidation = {
    createVendorSchema,
    updateVendorSchema,
};
