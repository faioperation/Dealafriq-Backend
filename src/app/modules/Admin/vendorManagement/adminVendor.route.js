import express from "express";
import { AdminVendorController } from "./adminVendor.controller.js";

const router = express.Router();

// Public route to get vendors by Project Manager ID
router.get(
    "/by-pm/:projectManagerId",
    AdminVendorController.getVendorsByProjectManagerIdController
);

export const AdminVendorRoutes = router;
