import express from "express";
import { NotificationController } from "./notification.controller.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";

const router = express.Router();

// Get all notifications for the current user
router.get(
  "/",
  checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
  NotificationController.getNotifications,
);

// Mark all notifications as read
router.patch(
  "/read-all",
  checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
  NotificationController.markAllAsRead,
);

// Mark a specific notification as read
router.patch(
  "/read/:id",
  checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
  NotificationController.markAsRead,
);

// Subscribe device for push notifications
router.post(
  "/subscribe",
  checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
  NotificationController.subscribeDevice,
);

export const NotificationRoutes = router;

