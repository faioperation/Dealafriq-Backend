import express from "express";
import validateRequest from "../../../middleware/validateRequest.js";
import { ProjectManagementController } from "./project_management.controller.js";
import { ProjectManagementValidation } from "./project_management.validation.js";

import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";

const router = express.Router();

router.post(
    "/create-project",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER, Role.BUSINESS_OWNER),
    validateRequest(ProjectManagementValidation.createProjectSchema),
    ProjectManagementController.createProject,
);

router.get(
    "/",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER, Role.BUSINESS_OWNER),
    ProjectManagementController.getAllProjects,
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER, Role.BUSINESS_OWNER),
    ProjectManagementController.getSingleProject,
);

router.patch(
    "/:id",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER, Role.BUSINESS_OWNER),
    validateRequest(ProjectManagementValidation.updateProjectSchema),
    ProjectManagementController.updateProject,
);

router.delete(
    "/:id",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER, Role.BUSINESS_OWNER),
    ProjectManagementController.deleteProject,
);

export const ProjectManagementRoutes = router;
