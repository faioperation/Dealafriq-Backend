import { catchAsync } from "../../../../utils/catchAsync.js";
import { sendResponse } from "../../../../utils/sendResponse.js";
import { ClientEmailService } from "./clientEmail.service.js";
import httpStatus from "http-status-codes";

const createEmail = catchAsync(async (req, res) => {
    const data = req.body;
    // Add audit field for creator
    if (req.user) {
        data.created_by = req.user.id;
    }

    const result = await ClientEmailService.createEmail(data);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Email record created successfully",
        data: result,
    });
});

const getAllEmails = catchAsync(async (req, res) => {
    const filters = req.query;
    const userId = req.user.id;
    const result = await ClientEmailService.getAllEmails(userId, filters);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Emails fetched successfully",
        data: result,
    });
});

const getSingleEmail = catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await ClientEmailService.getSingleEmail(id, userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Email fetched successfully",
        data: result,
    });
});

const updateEmail = catchAsync(async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const userId = req.user.id;

    if (req.user) {
        data.updated_by = userId;
    }

    const result = await ClientEmailService.updateEmail(id, userId, data);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Email updated successfully",
        data: result,
    });
});

const deleteEmail = catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const result = await ClientEmailService.deleteEmail(id, userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Email deleted successfully",
        data: result,
    });
});

const regenerateEmailAi = catchAsync(async (req, res) => {
    const payload = {
        emailId: req.body.emailId || req.params.id || req.query.emailId,
        type: req.body.type || req.query.type
    };
    const userId = req.user ? req.user.id : null;

    const result = await ClientEmailService.regenerateEmailAi(payload, userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Email AI insights regeneration triggered successfully",
        data: result,
    });
});

export const ClientEmailController = {
    createEmail,
    getAllEmails,
    getSingleEmail,
    updateEmail,
    deleteEmail,
    regenerateEmailAi
};
