import express from "express";
import { ProjectMilestoneController } from "./projectMilestone.controller.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { ProjectMilestoneValidation } from "./projectMilestone.validation.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";

const router = express.Router();

router.post(
    "/create-milestone",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(ProjectMilestoneValidation.createProjectMilestoneSchema),
    ProjectMilestoneController.createMilestone,
);

router.get(
    "/project/:projectId",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectMilestoneController.getAllMilestones,
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectMilestoneController.getSingleMilestone,
);

router.patch(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(ProjectMilestoneValidation.updateProjectMilestoneSchema),
    ProjectMilestoneController.updateMilestone,
);

router.delete(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectMilestoneController.deleteMilestone,
);

export const ProjectMilestoneRoutes = router;
