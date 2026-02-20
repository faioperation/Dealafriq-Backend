import { z } from "zod";

const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Team name is required"),
  }),
});

const updateTeamSchema = z.object({
  body: z.object({
    name: z.string().optional(),
  }),
});

export const TeamValidation = {
  createTeamSchema,
  updateTeamSchema,
};