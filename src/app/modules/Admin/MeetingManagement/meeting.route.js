import express from 'express';
import { checkInternalService } from '../../../middleware/checkInternalService.js';
import { MeetingController } from './meeting.controller.js';

const router = express.Router();

// Protected by internal service key header (x-backend-service)
router.get(
    '/public/all',
    MeetingController.getAllMeetings
);

router.get(
    '/public/all/for-ai',
    checkInternalService(),
    MeetingController.getLatestMeeting
);

router.get(
    '/public/:id',
    checkInternalService(),
    MeetingController.getSingleMeeting
);

export const AdminMeetingRoutes = router;
