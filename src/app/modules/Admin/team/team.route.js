import express from "express";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { Role } from "../../../utils/role.js";
import { TeamController } from "./team.controller.js";
import { TeamValidation } from "./team.validation.js";


const router = express.Router();

router.post(
  "/create",
   checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER),
  validateRequest(TeamValidation.createTeamSchema),
  TeamController.createTeam
);

router.get("/all",  checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER), TeamController.getAllTeams);

router.get("/:id",  checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER), TeamController.getSingleTeam);

router.patch(
  "/:id",
   checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER),
  validateRequest(TeamValidation.updateTeamSchema),
  TeamController.updateTeam
);

router.delete("/:id",  checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER), TeamController.deleteTeam);

export const TeamRoutes = router;