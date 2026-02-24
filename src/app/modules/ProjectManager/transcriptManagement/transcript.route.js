import express from "express";
import uploadTranscript from "../../../config/uploadTranscript.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";
import { TranscriptController } from "./transcript.controller.js";


const router = express.Router();

router.post(
  "/upload",
  uploadTranscript.single("file"),
  checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
  TranscriptController.uploadTranscriptController
);

router.get(
  "/project/:projectId",
  checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
  TranscriptController.getTranscriptsByProjectController
);

export const TranscriptRoutes = router;