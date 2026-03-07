import express from "express";
import { RaiddController } from "./raidd.controller.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { RaiddValidation } from "./raidd.validation.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";

const router = express.Router();

router.post(
    "/create",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(RaiddValidation.createRaiddSchema),
    RaiddController.createRaidd
);

router.get(
    "/all",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    RaiddController.getAllMyRaidds
);

router.get(
    "/project/:projectId",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    RaiddController.getAllRaidds
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    RaiddController.getSingleRaidd
);

router.patch(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(RaiddValidation.updateRaiddSchema),
    RaiddController.updateRaidd
);

router.delete(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    RaiddController.deleteRaidd
);

export const RaiddRoutes = router;
