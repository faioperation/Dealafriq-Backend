import express from "express";
import { ProjectTaskController } from "./projectTask.controller.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { ProjectTaskValidation } from "./projectTask.validation.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";

const router = express.Router();

router.post(
    "/create-task",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(ProjectTaskValidation.createProjectTaskSchema),
    ProjectTaskController.createTask,
);

router.get(
    "/project/:projectId",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectTaskController.getAllTasks,
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectTaskController.getSingleTask,
);

router.patch(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(ProjectTaskValidation.updateProjectTaskSchema),
    ProjectTaskController.updateTask,
);

router.delete(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectTaskController.deleteTask,
);

export const ProjectTaskRoutes = router;
