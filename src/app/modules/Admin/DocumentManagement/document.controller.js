import httpStatus from 'http-status-codes';
import { catchAsync } from '../../../utils/catchAsync.js';
import { sendResponse } from '../../../utils/sendResponse.js';
import { DocumentService } from './document.service.js';

/**
 * Get all documents controller for AI
 */
const getAllDocumentsForAi = catchAsync(async (req, res) => {
    const result = await DocumentService.getAllDocumentsForAi();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'All documents retrieved successfully for AI',
        data: result
    });
});


/**
 * Get single document controller
 */
const getSingleDocument = catchAsync(async (req, res) => {
    const result = await DocumentService.getSingleDocument(req.params.id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Document retrieved successfully',
        data: result
    });
});

export const DocumentController = {
    getAllDocumentsForAi,
    getSingleDocument
};
