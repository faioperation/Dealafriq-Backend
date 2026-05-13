

import express from "express";
import { AiPushController } from "./aiPush.controller.js";
import { checkInternalService } from "../../../middleware/checkInternalService.js";

const router = express.Router();

router.use(checkInternalService());

// Secure endpoints for AI developers to push data
router.post("/project-sync/:projectId", AiPushController.syncProjectData);
router.post("/raidd-sync/:projectId", AiPushController.syncRaiddData);
router.post("/email-sync/:emailId", AiPushController.syncEmailData);
router.post("/outlook-sync/:outlookId", AiPushController.syncOutlookData);
router.post("/meeting-sync/:meetingId", AiPushController.syncMeetingAiData);
router.post("/document-sync/:documentId", AiPushController.syncDocumentAiData);
router.post("/weekly-summary/:projectId", AiPushController.syncWeeklyAiSummary);

export const AiPushRoutes = router;
