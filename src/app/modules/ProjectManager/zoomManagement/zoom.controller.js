import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { ZoomService } from "./zoom.service.js";
import httpStatus from "http-status-codes";
import { envVars } from "../../../config/env.js";

const authorizeZoom = catchAsync(async (req, res) => {
    const userId = req.user.id;
    if (!userId) {
        return res.status(httpStatus.UNAUTHORIZED).json({ success: false, message: "User not authenticated." });
    }
    const authUrl = await ZoomService.generateZoomAuthUrl(userId);
    
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Zoom authorization URL generated successfully.",
        data: { url: authUrl }
    });
});

const zoomCallback = catchAsync(async (req, res) => {
    const { code, state: userId } = req.query;
    
    if (!code || !userId) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Missing authorization code or state (userId)." });
    }

    const result = await ZoomService.handleZoomCallback(code, userId);

    const frontendRedirectUrl = `${envVars.FRONT_END_URL}/data-source`;
    res.redirect(frontendRedirectUrl);
});

/**
 * Get meetings for authenticated user
 */
const getUserMeetings = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const result = await ZoomService.getUserMeetings(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Meetings fetched successfully",
        data: result,
    });
});

/**
 * Create a new meeting
 */
const createMeeting = catchAsync(async (req, res) => {
    const data = req.body;
    data.userId = req.user.id; // Enforce user ID from token
    const result = await ZoomService.createMeeting(data);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Meeting created successfully",
        data: result,
    });
});

/**
 * Get recordings for authenticated user
 */
const getUserRecordings = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const result = await ZoomService.getUserRecordings(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Recordings fetched successfully",
        data: result,
    });
});

/**
 * Handle Zoom Webhooks
 */
const handleWebhook = catchAsync(async (req, res) => {
    const { event, payload } = req.body;

    if (event === "endpoint.url_validation") {
        return res.status(200).json({
            plainToken: payload.plainToken,
            encryptedToken: "ENCRYPTED_TOKEN_LOGIC_HERE"
        });
    }

    if (event === "meeting.ended") {
        await ZoomService.handleMeetingEndedWebhook(payload);
    }

    res.status(200).send("OK");
});

/**
 * Disconnect Zoom Account
 */
const disconnectZoom = catchAsync(async (req, res) => {
    const userId = req.user.id;
    await ZoomService.disconnectZoomAccount(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Zoom account disconnected successfully",
        isConnected: false
    });
});

export const ZoomController = {
    authorizeZoom,
    zoomCallback,
    getUserMeetings,
    createMeeting,
    getUserRecordings,
    handleWebhook,
    disconnectZoom,
};
