import { z } from "zod";

const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Team name is required"),
    employeeIds: z.array(z.string()).optional(),
  }),
});

const updateTeamSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    employeeIds: z.array(z.string()).optional(),
  }),
});

export const TeamValidation = {
  createTeamSchema,
  updateTeamSchema,
};