import express from 'express';

import { checkAuthMiddleware } from '../../../../middleware/checkAuthMiddleware.js';
import { Role } from '../../../../utils/role.js';
import { EmailController } from './email.controller.js';


const router = express.Router();

// Gmail OAuth routes
router.get('/connect', checkAuthMiddleware(...Object.values(Role)), EmailController.connect);
router.get('/callback', EmailController.callback);

// Inbox routes
router.get('/inbox', checkAuthMiddleware(...Object.values(Role)), EmailController.getInbox);

router.delete('/disconnect', checkAuthMiddleware(...Object.values(Role)), EmailController.disconnect);

export const EmailAccountRoutes = router;

