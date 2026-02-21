import express from "express";

import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";

import validateRequest from "../../../middleware/validateRequest.js";

import { Role } from "../../../utils/role.js";
import { ProjectManagerController } from "./project_manager.controller.js";
import { ProjectManagerValidation } from "./project_manager.validation.js";

const router = express.Router();

router.post(
    "/create",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER),
    validateRequest(ProjectManagerValidation.createProjectManagerSchema),
    ProjectManagerController.createProjectManager
);

router.get(
    "/all",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER),
    ProjectManagerController.getAllProjectManagers
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER),
    ProjectManagerController.getSingleProjectManager
);

router.patch(
    "/:id",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER),
    validateRequest(ProjectManagerValidation.updateProjectManagerSchema),
    ProjectManagerController.updateProjectManager
);

router.delete(
    "/:id",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER),
    ProjectManagerController.deleteProjectManager
);

router.post(
    "/approve/:id",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER),
    ProjectManagerController.approveProjectManager
);

export const ProjectManagerRoutes = router;
