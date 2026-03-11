import { Router } from "express";
import { ZoomController } from "./zoom.controller.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";

const router = Router();

// GET /api/zoom/authorize
router.get("/authorize", checkAuthMiddleware(), ZoomController.authorizeZoom);

// GET /api/zoom/callback
router.get("/callback", ZoomController.zoomCallback);

// GET /api/.../zoom/meetings
router.get("/meetings", checkAuthMiddleware(), ZoomController.getUserMeetings);

// POST /api/.../zoom/meetings - create meeting
router.post("/meetings", checkAuthMiddleware(), ZoomController.createMeeting);

// GET /api/.../zoom/recordings
router.get("/recordings", checkAuthMiddleware(), ZoomController.getUserRecordings);

// POST /api/.../zoom/webhook
router.post("/webhook", ZoomController.handleWebhook);

export const ZoomRoutes = router;
