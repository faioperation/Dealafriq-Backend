import express from "express";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";
import { PMDashboardController } from "./pm_dashboard.controller.js";

const router = express.Router();

router.get(
    "/",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    PMDashboardController.getDashboardData
);

export const PMDashboardRoutes = router;
