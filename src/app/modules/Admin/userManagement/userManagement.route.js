import express from 'express';
// import { checkAuthMiddleware } from '../../../../middleware/checkAuthMiddleware.js';
// import { Role } from '../../../../utils/role.js';
import { UserManagementController } from './userManagement.controller.js';
import { checkInternalService } from '../../../middleware/checkInternalService.js';

const router = express.Router();

// Only Super Admin and Admin can access these routes
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

// Public User 
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

export const UserManagementRoutes = router;
