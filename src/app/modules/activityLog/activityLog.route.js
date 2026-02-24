import { Router } from "express";
import { ActivityLogController } from "./activityLog.controller.js";

import { checkAuthMiddleware } from "../../middleware/checkAuthMiddleware.js";
import { Role } from "../../utils/role.js";

const router = Router();

router.get(
    "/get-all-logs-for-ai",
    ActivityLogController.getAllLogs
);
router.get(
    "/all",
    checkAuthMiddleware(Role.ADMIN, Role.PROJECT_MANAGER),
    ActivityLogController.getAllLogs
);

router.get(
    "/all/:projectId",
    checkAuthMiddleware(Role.ADMIN, Role.PROJECT_MANAGER),
    ActivityLogController.getProjectLogs
);
router.get(
    "/get-all-logs-for-ai/:projectId",
    checkAuthMiddleware(Role.ADMIN, Role.PROJECT_MANAGER),
    ActivityLogController.getProjectLogs
);

export const ActivityLogRoutes = router;
