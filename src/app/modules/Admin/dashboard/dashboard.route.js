import express from "express";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";
import { DashboardController } from "./dashboard.controller.js";

const router = express.Router();

router.get(
    "/",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER),
    DashboardController.getDashboardData
);

export const DashboardRoutes = router;
