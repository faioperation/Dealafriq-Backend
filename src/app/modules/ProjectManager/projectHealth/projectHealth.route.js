import express from "express";
import { ProjectHealthController } from "./projectHealth.controller.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { ProjectHealthValidation } from "./projectHealth.validation.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";

const router = express.Router();

router.post(
    "/update",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(ProjectHealthValidation.updateProjectHealthSchema),
    ProjectHealthController.updateHealth,
);

router.patch(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(ProjectHealthValidation.updateProjectHealthSchema),
    ProjectHealthController.updateHealthById,
);

router.get(
    "/project/:projectId",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectHealthController.getHealth,
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectHealthController.getSingleHealth,
);

router.delete(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectHealthController.deleteHealth,
);

export const ProjectHealthRoutes = router;
