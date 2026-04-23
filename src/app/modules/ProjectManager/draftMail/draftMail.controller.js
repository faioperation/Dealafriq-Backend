import httpStatus from 'http-status-codes';
import { catchAsync } from '../../../utils/catchAsync.js';
import { sendResponse } from '../../../utils/sendResponse.js';
import { DraftMailService } from './draftMail.service.js';

const generateAiReply = catchAsync(async (req, res) => {
    const { id, emailId, type } = req.body;
    const userId = req.user.id;
    const targetId = emailId || id;

    if (!targetId || !type) {
        return sendResponse(res, {
            statusCode: httpStatus.BAD_REQUEST,
            success: false,
            message: 'Both emailId (or id) and type are required'
        });
    }

    if (type !== 'email' && type !== 'outlook') {
        return sendResponse(res, {
            statusCode: httpStatus.BAD_REQUEST,
            success: false,
            message: 'Invalid type. Must be either "email" or "outlook"'
        });
    }

    const result = await DraftMailService.generateAiReply(targetId, userId, type);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `AI reply generated successfully for ${type}`,
        data: result
    });
});

export const DraftMailController = {
    generateAiReply
};
