import express from "express";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";
import { VendorController } from "./vendorManagement.controller.js";
import { VendorValidation } from "./vendorManagement.validation.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { fileUpload } from "../../../config/fileUpload.js";

const router = express.Router();

const vendorUploadFields = fileUpload.fields([
    { name: "photo", maxCount: 1 },
    { name: "sla", maxCount: 1 },
    { name: "document", maxCount: 1 },
]);

router.post(
    "/create",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    vendorUploadFields,
    VendorController.createVendor
);

router.get(
    "/all",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    VendorController.getAllVendors
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    VendorController.getVendorById
);

router.patch(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    vendorUploadFields,
    VendorController.updateVendor
);

router.delete(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    VendorController.deleteVendor
);

export const VendorRoutes = router;
