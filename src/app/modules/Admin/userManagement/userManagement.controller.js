
import { catchAsync } from '../../../utils/catchAsync.js';
import { UserManagementService } from './userManagement.service.js';

const getAllEmails = catchAsync(async (req, res) => {
    const filters = req.query;
    const result = await UserManagementService.getAllSystemEmails(filters);

    res.status(200).json({
        success: true,
        message: 'All system emails fetched successfully',
        data: result
    });
});

const getEmailsByUserId = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const filters = req.query;
    const result = await UserManagementService.getEmailsByUserId(userId, filters);

    res.status(200).json({
        success: true,
        message: `Emails for user ${userId} fetched successfully`,
        data: result
    });
});

const getAllUsers = catchAsync(async (req, res) => {
    const result = await UserManagementService.getAllUsers();

    res.status(200).json({
        success: true,
        message: 'All users fetched successfully',
        data: result
    });
});

const getUserById = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const result = await UserManagementService.getUserById(userId);

    res.status(200).json({
        success: true,
        message: 'User details fetched successfully',
        data: result
    });
});

export const UserManagementController = {
    getAllEmails,
    getEmailsByUserId,
    getAllUsers,
    getUserById
};
