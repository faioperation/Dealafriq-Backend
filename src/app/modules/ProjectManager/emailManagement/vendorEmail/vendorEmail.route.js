import express from "express";
import { checkAuthMiddleware } from "../../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../../utils/role.js";
import { VendorEmailController } from "./vendorEmail.controller.js";

const router = express.Router();

router.post(
    "/create",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    VendorEmailController.createEmail
);

router.get(
    "/all",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    VendorEmailController.getAllEmails
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    VendorEmailController.getSingleEmail
);

router.patch(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    VendorEmailController.updateEmail
);

router.delete(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    VendorEmailController.deleteEmail
);

export const VendorEmailRoutes = router;
