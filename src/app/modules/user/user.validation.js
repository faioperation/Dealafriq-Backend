import { z } from "zod";

const registerUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, { message: "Name is required" }),
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    username: z.string().optional(),
    email: z.string().email({ message: "Invalid email address" }).optional(),
    country: z.string().optional(),
    gender: z.string().optional(),
    language: z.string().optional(),
    timezone: z.string().optional(), // keep string (NOT DateTime)
  }),
});

export const UserValidation = {
  registerUserSchema,
  updateProfileSchema,
};
