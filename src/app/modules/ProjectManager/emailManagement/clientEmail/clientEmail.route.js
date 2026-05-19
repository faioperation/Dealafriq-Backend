import express from "express";
import { checkAuthMiddleware } from "../../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../../utils/role.js";
import { ClientEmailController } from "./clientEmail.controller.js";

const router = express.Router();

router.post(
    "/create",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    ClientEmailController.createEmail
);

router.get(
    "/all",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    ClientEmailController.getAllEmails
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    ClientEmailController.getSingleEmail
);

router.patch(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    ClientEmailController.updateEmail
);

router.delete(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    ClientEmailController.deleteEmail
);

router.post(
    "/regenerate-ai",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    ClientEmailController.regenerateEmailAi
);

router.post(
    "/regenerate-ai/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    ClientEmailController.regenerateEmailAi
);

export const ClientEmailRoutes = router;
