import httpStatus from 'http-status-codes';

import { catchAsync } from '../../../../utils/catchAsync.js';

import { sendResponse } from '../../../../utils/sendResponse.js';
import { OutlookService } from '../outlook.service.js';
import { OutlookSyncService } from './outlookSync.service.js';

const getUnifiedInbox = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const result = await OutlookService.getUnifiedInbox(userId, req.query);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Unified inbox retrieved successfully',
        data: result,
    });
});

const getAllOutlooks = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const result = await OutlookSyncService.getAllOutlooks(userId, req.query);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Outlook emails retrieved successfully',
        data: result,
    });
});

const deleteOutlook = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    await OutlookSyncService.deleteOutlook(id, userId);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Outlook email deleted successfully',
    });
});

const syncInbox = catchAsync(async (req, res) => {
    const userId = req.user.id;
    await OutlookService.syncAllConnectedAccounts(); // Triggering for all for simplicity or we can add a specific userId trigger
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Outlook sync triggered successfully',
    });
});

export const OutlookSyncController = {
    getUnifiedInbox,
    getAllOutlooks,
    deleteOutlook,
    syncInbox
};
