import express from "express";
import { GoogleCalendarController } from "./googleCalender.controller.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { GoogleCalendarValidation } from "./googleCalender.validation.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";

const router = express.Router();

router.post(
    "/sync",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(GoogleCalendarValidation.syncCalendarSchema),
    GoogleCalendarController.syncEvents
);

router.get(
    "/events",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    GoogleCalendarController.getEvents
);

router.delete(
    "/events/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    GoogleCalendarController.deleteEvent
);

router.get(
    "/all-events",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    GoogleCalendarController.getAllDatabaseEvents
);

export const GoogleCalendarRoutes = router;
