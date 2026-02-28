import { Router } from "express";
import { ZoomController } from "./zoom.controller.js";

const router = Router();

// GET /api/project-manager/zoom/meetings/:email
router.get("/meetings/:email", ZoomController.getUserMeetings);

// POST /api/project-manager/zoom/meetings - create meeting
router.post("/meetings", ZoomController.createMeeting);

// {
//   "email": "user@example.com",
//   "topic": "Frontend Development Discussion",
//   "start_time": "2024-03-10T15:30:00Z"
// }
// Create Meeting ends......

// GET /api/project-manager/zoom/recordings/:email
router.get("/recordings/:email", ZoomController.getUserRecordings);

// POST /api/project-manager/zoom/webhook
router.post("/webhook", ZoomController.handleWebhook);

export const ZoomRoutes = router;
