import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { ZoomService } from "./zoom.service.js";
import httpStatus from "http-status-codes";

/**
 * Get meetings for a specific user email
 */
const getUserMeetings = catchAsync(async (req, res) => {
    const { email } = req.params;
    const result = await ZoomService.getUserMeetings(email);

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
    const result = await ZoomService.createMeeting(data);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Meeting created successfully",
        data: result,
    });
});

/**
 * Get recordings for a specific user email
 */
const getUserRecordings = catchAsync(async (req, res) => {
    const { email } = req.params;
    const result = await ZoomService.getUserRecordings(email);

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

    // Zoom webhook validation (Challenge response)
    if (event === "endpoint.url_validation") {
        // Note: Zoom requires a specific hashing logic for validation if not using basic verification
        // For now, providing a simple response if that's what's needed for the initial setup
        // But usually it's a HMAC(secret, plainToken)
        // If user has ZOOM_WEBHOOK_SECRET_TOKEN, we should implement the HMAC logic

        // Simplest form for initial handshake:
        return res.status(200).json({
            plainToken: payload.plainToken,
            encryptedToken: "ENCRYPTED_TOKEN_LOGIC_HERE" // This needs actual HMAC logic
        });
    }

    if (event === "meeting.ended") {
        await ZoomService.handleMeetingEndedWebhook(payload);
    }

    // Always return 200 OK to Zoom
    res.status(200).send("OK");
});

export const ZoomController = {
    getUserMeetings,
    createMeeting,
    getUserRecordings,
    handleWebhook,
};
