import express from "express";
import { LessonLearnController } from "./leasonLearn.controller.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { LessonLearnValidation } from "./leasonLearn.validation.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";

const router = express.Router();

router.post(
    "/create",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(LessonLearnValidation.createLessonLearnSchema),
    LessonLearnController.createLessonLearn
);

router.get(
    "/project/:projectId",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    LessonLearnController.getAllLessonLearns
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    LessonLearnController.getSingleLessonLearn
);

router.patch(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(LessonLearnValidation.updateLessonLearnSchema),
    LessonLearnController.updateLessonLearn
);

router.delete(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    LessonLearnController.deleteLessonLearn
);

export const LessonLearnRoutes = router;
