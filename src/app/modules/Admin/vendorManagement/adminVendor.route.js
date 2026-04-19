import express from "express";
import { AdminVendorController } from "./adminVendor.controller.js";
// import { checkInternalService } from "../../../middleware/checkInternalService.js";

const router = express.Router();

// Public route to get vendors by Project Manager ID
router.get(
    "/by-pm/:projectManagerId",
    // checkInternalService(),
    AdminVendorController.getVendorsByProjectManagerIdController
);

// Public route to get all vendors
router.get(
    "/all",
    // checkInternalService(),
    AdminVendorController.getAllVendorsController
);

export const AdminVendorRoutes = router;
