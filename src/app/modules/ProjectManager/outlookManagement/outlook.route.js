import express from "express";
import { OutlookController } from "./outlook.controller.js";
import { OutlookSyncController } from "./outlook/outlookSync.controller.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";
import { OutlookSyncRoutes } from "./outlook/outlookSync.route.js";

const router = express.Router();

router.use("/", OutlookSyncRoutes);

router.get(
    "/connect",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    OutlookController.connect
);

router.get(
    "/callback",
    OutlookController.callback
);

router.get(
    "/inbox",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    OutlookController.getInbox
);

router.delete(
    "/disconnect",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    OutlookController.disconnect
);

export const OutlookRoutes = router;
