import express from "express";
import { LessonLearnPublicController } from "./lessonLearnPublic.controller.js";
import { checkInternalService } from "../../../middleware/checkInternalService.js";

const router = express.Router();

router.get(
    "/all",
    checkInternalService(),
    LessonLearnPublicController.getAllPublicLessonLearns
);

router.get(
    "/:id",
    checkInternalService(),
    LessonLearnPublicController.getSinglePublicLessonLearn
);

export const LessonLearnPublicRoutes = router;
