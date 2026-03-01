import express from 'express';
// import { checkAuthMiddleware } from '../../../../middleware/checkAuthMiddleware.js';
// import { Role } from '../../../../utils/role.js';
import { UserManagementController } from './userManagement.controller.js';

const router = express.Router();

// Only Super Admin and Admin can access these routes
router.get(
    '/all',
    UserManagementController.getAllEmails
);

router.get(
    '/user/:userId',
    UserManagementController.getEmailsByUserId
);

// Public User routes
router.get(
    '/users',
    UserManagementController.getAllUsers
);

router.get(
    '/users/:userId',
    UserManagementController.getUserById
);

export const UserManagementRoutes = router;
