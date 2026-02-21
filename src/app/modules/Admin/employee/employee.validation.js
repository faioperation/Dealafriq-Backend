import { z } from "zod";

const createEmployeeSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().optional(),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    projectId: z.string().optional(),
    teamId: z.string().optional(),
  }),
});

const updateEmployeeSchema = z.object({
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email("Invalid email address").optional(),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    projectId: z.string().optional(),
    teamId: z.string().optional(),
  }),
});

export const EmployeeValidation = {
  createEmployeeSchema,
  updateEmployeeSchema,
};