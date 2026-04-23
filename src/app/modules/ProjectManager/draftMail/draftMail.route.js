import express from 'express';
import { checkAuthMiddleware } from '../../../middleware/checkAuthMiddleware.js';
import { Role } from '../../../utils/role.js';
import { DraftMailController } from './draftMail.controller.js';

const router = express.Router();

router.post(
    '/generate-reply',
    checkAuthMiddleware(Role.PROJECT_MANAGER, Role.ADMIN),
    DraftMailController.generateAiReply
);

export const DraftMailRoutes = router;
