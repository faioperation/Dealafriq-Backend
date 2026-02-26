import express from "express";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";
import { VendorController } from "./vendor.controller.js";
import { fileUpload } from "../../../config/fileUpload.js";

const router = express.Router();

const vendorUploadFields = fileUpload.fields([
    { name: "photo", maxCount: 1 },
    { name: "documents", maxCount: 20 },
    { name: "slas", maxCount: 20 },
]);

router.post(
    "/create",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    vendorUploadFields,
    VendorController.createVendorController
);

router.get(
    "/all",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    VendorController.getAllVendorsController
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    VendorController.getVendorByIdController
);

router.patch(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    vendorUploadFields,
    VendorController.updateVendorController
);

router.delete(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    VendorController.deleteVendorController
);

export const VendorRoutes = router;
