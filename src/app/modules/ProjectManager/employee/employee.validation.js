import { z } from "zod";

const createEmployeeSchema = z.object({
    body: z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().optional(),
        email: z.string().email("Invalid email address"),
        phoneNumber: z.string().optional(),
        teamId: z.string().optional(),
    }),
});

const updateEmployeeSchema = z.object({
    body: z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email("Invalid email address").optional(),
        phoneNumber: z.string().optional(),
        teamId: z.string().optional(),
    }),
});

export const EmployeeValidation = {
    createEmployeeSchema,
    updateEmployeeSchema,
};
