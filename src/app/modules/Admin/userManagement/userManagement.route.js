import express from 'express';

import { UserManagementController } from './userManagement.controller.js';
import { checkInternalService } from '../../../middleware/checkInternalService.js';

const router = express.Router();

// public email for ai
router.get(
    '/all',
    checkInternalService(),
    UserManagementController.getAllEmails
);


router.get(
    '/user/:userId',
    checkInternalService(),
    UserManagementController.getEmailsByUserId
);

// Public User for user
router.get(
    '/users',
    checkInternalService(),
    UserManagementController.getAllUsers
);

router.get(
    '/users/:userId',
    checkInternalService(),
    UserManagementController.getUserById
);

// Public AI detection for AI
router.get(
    '/ai-detections',
    checkInternalService(),
    UserManagementController.getAllAiDetections
);

export const UserManagementRoutes = router;
