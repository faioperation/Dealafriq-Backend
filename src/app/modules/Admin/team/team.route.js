import express from "express";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { Role } from "../../../utils/role.js";
import { TeamController } from "./team.controller.js";
import { TeamValidation } from "./team.validation.js";


const router = express.Router();

router.post(
  "/create",
   checkAuthMiddleware(...Object.values(Role)),
  validateRequest(TeamValidation.createTeamSchema),
  TeamController.createTeam
);

router.get("/all",  checkAuthMiddleware(...Object.values(Role)), TeamController.getAllTeams);

router.get("/:id",  checkAuthMiddleware(...Object.values(Role)), TeamController.getSingleTeam);

router.patch(
  "/:id",
   checkAuthMiddleware(...Object.values(Role)),
  validateRequest(TeamValidation.updateTeamSchema),
  TeamController.updateTeam
);

router.delete("/:id",  checkAuthMiddleware(...Object.values(Role)), TeamController.deleteTeam);

export const TeamRoutes = router;