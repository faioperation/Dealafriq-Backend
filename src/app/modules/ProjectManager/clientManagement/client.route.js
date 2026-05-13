import express from "express";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";
import { ClientController } from "./client.controller.js";
import { fileUpload } from "../../../config/fileUpload.js";

const router = express.Router();

const clientUploadFields = fileUpload.fields([
    { name: "photo", maxCount: 1 },
    { name: "documents", maxCount: 20 },
    { name: "slas", maxCount: 20 },
]);

router.post(
    "/create",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    clientUploadFields,
    ClientController.createClientController
);

router.get(
    "/all",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    ClientController.getAllClientsController
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    ClientController.getClientByIdController
);

router.patch(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    clientUploadFields,
    ClientController.updateClientController
);

router.delete(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    ClientController.deleteClientController
);

export const ClientRoutes = router;
