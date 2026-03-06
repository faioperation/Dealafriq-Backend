import express from "express";
import { AiDetectionController } from "./aiDetection.controller.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { AiDetectionValidation } from "./aiDetection.validation.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";

const router = express.Router();

router.post(
    "/create",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(AiDetectionValidation.createAiDetectionSchema),
    AiDetectionController.createAiDetection,
);

router.get(
    "/all",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    AiDetectionController.getAllAiDetections,
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    AiDetectionController.getAiDetectionById,
);

router.patch(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(AiDetectionValidation.updateAiDetectionSchema),
    AiDetectionController.updateAiDetection,
);

router.delete(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    AiDetectionController.deleteAiDetection,
);

export const AiDetectionRoutes = router;
