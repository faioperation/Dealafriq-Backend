import { Router } from "express";
import { ActivityLogController } from "./activityLog.controller.js";

import { checkAuthMiddleware } from "../../middleware/checkAuthMiddleware.js";
import { Role } from "../../utils/role.js";
// import { checkInternalService } from "../../middleware/checkInternalService.js";

const router = Router();

router.get(
    "/get-all-logs-for-ai",
    // checkInternalService(),
    ActivityLogController.getAllLogs
);
router.get(
    "/all",
    checkAuthMiddleware(Role.ADMIN, Role.PROJECT_MANAGER),
    ActivityLogController.getAllLogs
);

router.get(
    "/grouped",
    checkAuthMiddleware(Role.ADMIN, Role.PROJECT_MANAGER),
    ActivityLogController.getGroupedByProject
);
router.get(
    "/get-all-logs-for-ai/grouped",
    // checkInternalService(),
    ActivityLogController.getGroupedByProject
);

router.get(
    "/:projectId",
    checkAuthMiddleware(Role.ADMIN, Role.PROJECT_MANAGER),
    ActivityLogController.getProjectLogs
);

export const ActivityLogRoutes = router;
