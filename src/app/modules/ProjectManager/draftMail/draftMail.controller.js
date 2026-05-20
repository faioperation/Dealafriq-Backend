import httpStatus from 'http-status-codes';
import { catchAsync } from '../../../utils/catchAsync.js';
import { sendResponse } from '../../../utils/sendResponse.js';
import { DraftMailService } from './draftMail.service.js';

const generateAiReply = catchAsync(async (req, res) => {
    const { id, emailId, type } = req.body;
    const userId = req.user.id;
    const targetId = emailId || id;

    if (!targetId) {
        return sendResponse(res, {
            statusCode: httpStatus.BAD_REQUEST,
            success: false,
            message: 'emailId or id is required'
        });
    }

    if (type && type !== 'email' && type !== 'outlook') {
        return sendResponse(res, {
            statusCode: httpStatus.BAD_REQUEST,
            success: false,
            message: 'Invalid type. Must be either "email" or "outlook"'
        });
    }

    // Determine type automatically if not provided
    let detectedType = type;
    if (!detectedType) {
        const { default: prisma } = await import('../../../prisma/client.js');
        const email = await prisma.email.findUnique({ where: { id: targetId } });
        if (email) {
            detectedType = 'email';
        } else {
            const outlook = await prisma.outlook.findUnique({ where: { id: targetId } });
            if (outlook) {
                detectedType = 'outlook';
            } else {
                return sendResponse(res, {
                    statusCode: httpStatus.NOT_FOUND,
                    success: false,
                    message: 'Record not found in either Email or Outlook tables'
                });
            }
        }
    }

    const result = await DraftMailService.generateAiReply(targetId, userId, detectedType);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `AI reply generated successfully for ${detectedType}`,
        data: result
    });
});

export const DraftMailController = {
    generateAiReply
};
