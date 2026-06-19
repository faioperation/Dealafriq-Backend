import express from "express";
import { OutlookCalendarController } from "./outlookCalender.controller.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { OutlookCalendarValidation } from "./outlookCalender.validation.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";

const router = express.Router();

router.post(
    "/sync",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(OutlookCalendarValidation.syncCalendarSchema),
    OutlookCalendarController.syncEvents
);

router.get(
    "/events",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    OutlookCalendarController.getEvents
);

router.delete(
    "/events/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    OutlookCalendarController.deleteEvent
);

export const OutlookCalendarRoutes = router;
