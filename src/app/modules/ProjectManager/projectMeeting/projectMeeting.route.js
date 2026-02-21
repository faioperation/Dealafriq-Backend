import express from "express";
import { ProjectMeetingController } from "./projectMeeting.controller.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { ProjectMeetingValidation } from "./projectMeeting.validation.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";

const router = express.Router();

router.post(
    "/create-meeting",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(ProjectMeetingValidation.createProjectMeetingSchema),
    ProjectMeetingController.createMeeting,
);

router.get(
    "/project/:projectId",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectMeetingController.getAllMeetings,
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectMeetingController.getSingleMeeting,
);

router.patch(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(ProjectMeetingValidation.updateProjectMeetingSchema),
    ProjectMeetingController.updateMeeting,
);

router.delete(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectMeetingController.deleteMeeting,
);

export const ProjectMeetingRoutes = router;
