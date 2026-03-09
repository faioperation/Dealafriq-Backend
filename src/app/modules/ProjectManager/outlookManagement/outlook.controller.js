import { OutlookService } from "./outlook.service.js";
import { OutlookOAuth } from "./outlook/utils/outlookOAuth.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { envVars } from "../../../config/env.js";

const connect = catchAsync(async (req, res) => {
    const { redirectUrl } = req.query;

    // Encode both userId and redirectUrl into the state parameter
    const stateObj = {
        userId: req.user.id,
        redirectUrl: redirectUrl || `${envVars.FRONT_END_URL}/data-source`
    };
    const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

    const url = OutlookOAuth.getAuthUrl(state);
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
    const { code, state: encodedState } = req.query;
    if (!code) {
        throw new Error("Code is required");
    }

    // Decode the state parameter to get userId and redirectUrl
    const stateObj = JSON.parse(Buffer.from(encodedState, 'base64').toString('ascii'));
    const userId = stateObj.userId;
    const redirectUrl = stateObj.redirectUrl;

    const account = await OutlookService.connectAccount(userId, code);

    // Redirect to the frontend dynamically
    res.redirect(redirectUrl);
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
