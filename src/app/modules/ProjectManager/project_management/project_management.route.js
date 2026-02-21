import express from "express";
import validateRequest from "../../../middleware/validateRequest.js";
import { PMProjectManagementController } from "./project_management.controller.js";
import { ProjectManagerProjectValidation } from "./project_management.validation.js";

import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";
import { projectUpload } from "../../../config/projectUploads.config.js";

const router = express.Router();

router.post(
    "/create",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    projectUpload,
    validateRequest(ProjectManagerProjectValidation.createProjectSchema),
    PMProjectManagementController.createProject,
);

router.get(
    "/my-projects",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    PMProjectManagementController.getMyProjects,
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    PMProjectManagementController.getSingleProject,
);

router.patch(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(ProjectManagerProjectValidation.updateProjectSchema),
    PMProjectManagementController.updateProject,
);
router.delete(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    PMProjectManagementController.deleteSingleProject,
);

export const PMProjectManagementRoutes = router;
