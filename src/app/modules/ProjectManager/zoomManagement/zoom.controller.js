import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { ZoomService } from "./zoom.service.js";
import httpStatus from "http-status-codes";
import { envVars } from "../../../config/env.js";
import crypto from "crypto";

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
    const { code, state } = req.query;

    if (!code || !state) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Missing authorization code or state." });
    }

    const result = await ZoomService.handleZoomCallback(code, state);

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

const handleWebhook = catchAsync(async (req, res) => {
    console.log("Incoming Webhook Request received at /api/zoom/webhook");
    const { event, payload } = req.body;
    const signature = req.headers["x-zm-signature"];
    const timestamp = req.headers["x-zm-request-timestamp"];
    const secret = envVars.ZOOM_WEBHOOK_SECRET;

    if (!secret) {
        console.error("ZOOM_WEBHOOK_SECRET is not defined in .env");
        return res.status(500).json({ error: "ZOOM_WEBHOOK_SECRET not configured" });
    }

    // 1. URL Validation (CRC Check) - Always handle this first
    if (event === "endpoint.url_validation") {
        const hashForValidate = crypto
            .createHmac("sha256", secret)
            .update(payload.plainToken)
            .digest("hex");

        console.log("Zoom Webhook URL validated successfully.");
        return res.status(200).json({
            plainToken: payload.plainToken,
            encryptedToken: hashForValidate
        });
    }

    // 2. Signature Verification
    // Note: If this fails, ensure you are using raw body parsing for Zoom webhooks
    const message = `v0:${timestamp}:${JSON.stringify(req.body)}`;
    const hash = crypto.createHmac("sha256", secret).update(message).digest("hex");
    const expectedSignature = `v0=${hash}`;

    if (signature !== expectedSignature) {
        console.warn("Invalid Zoom webhook signature. If this persists, verify your ZOOM_WEBHOOK_SECRET.");
        // return res.status(401).json({ success: false, message: "Invalid signature" });
    }

    // 3. Delegate logic to Service
    console.log(`Received Zoom Webhook: ${event}`);

    try {
        if (event === "recording.completed") {
            console.log(`[Zoom Webhook] Processing recording.completed for meeting: ${payload.object.id}`);
            await ZoomService.handleRecordingCompletedWebhook(payload);
            console.log(`[Zoom Webhook] Finished processing recording.completed for meeting: ${payload.object.id}`);
        } else if (event === "meeting.ended") {
            console.log(`[Zoom Webhook] Meeting ${payload.object.id} ended.`);
        } else {
            console.log(`[Zoom Webhook] Received unhandled event: ${event}`);
        }
    } catch (error) {
        console.error(`[Zoom Webhook Error] ${event}:`, error.message);
        if (error.stack) console.error(error.stack);
        // We still return 200 to Zoom to stop retries, but we logged the error
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
