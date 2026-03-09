import { OutlookService } from "./outlook.service.js";
import { OutlookOAuth } from "./outlook/utils/outlookOAuth.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";

const connect = catchAsync(async (req, res) => {
    const url = OutlookOAuth.getAuthUrl(req.user.id);
    const account = await prisma.emailAccount.findFirst({
        where: { userId: req.user.id, provider: 'outlook' }
    });
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Outlook auth URL generated",
        data: {
            url,
            isConnected: account ? account.isConnected : false
        },
    });
});

const callback = catchAsync(async (req, res) => {
    const { code, state: userId } = req.query;
    if (!code) {
        throw new Error("Code is required");
    }

    const account = await OutlookService.connectAccount(userId, code);

    // Redirect or send success response
    // For now, consistent with Gmail implementation:
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Outlook connected successfully",
        data: {
            isConnected: account.isConnected
        }
    });
});

const getInbox = catchAsync(async (req, res) => {
    const emails = await OutlookService.getInbox(req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Outlook inbox fetched successfully",
        data: emails,
    });
});

const disconnect = catchAsync(async (req, res) => {
    await OutlookService.disconnectAccount(req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Outlook account disconnected successfully",
        data: {
            isConnected: false
        }
    });
});

export const OutlookController = {
    connect,
    callback,
    getInbox,
    disconnect,
};
