import express from "express";
import { ProjectHealthController } from "./projectHealth.controller.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { ProjectHealthValidation } from "./projectHealth.validation.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";

const router = express.Router();

router.post(
    "/upsert",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(ProjectHealthValidation.upsertProjectHealthSchema),
    ProjectHealthController.upsertHealth,
);

router.get(
    "/project/:projectId",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectHealthController.getHealthByProjectId,
);

router.delete(
    "/project/:projectId",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectHealthController.deleteHealthByProjectId,
);

export const ProjectHealthRoutes = router;
