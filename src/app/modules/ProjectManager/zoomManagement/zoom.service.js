import axios from "axios";
import prisma from "../../../prisma/client.js";
import { envVars } from "../../../config/env.js";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { TranscriptService } from "../transcriptManagement/transcript.service.js";

// Zoom API Base URL
const ZOOM_API_BASE_URL = "https://api.zoom.us/v2";
const ZOOM_OAUTH_URL = "https://zoom.us/oauth/token";

/**
 * Generate Zoom Authorization URL
 * @param {string} userId - The ID of the user requesting authorization
 */
const generateZoomAuthUrl = async (userId) => {
    try {
        const { ZOOM_CLIENT_ID, ZOOM_REDIRECT_URI } = envVars;

        if (!userId) {
            throw new Error("User ID is required for Zoom authorization.");
        }

        // ✅ Create secure state
        const state = uuidv4();

        // 👉 Save mapping (used to verify callback and associate with user)
        await prisma.zoomAuthState.create({
            data: {
                state,
                userId,
            },
        });

        // ✅ Scopes required for meetings and recordings
        const scopes = [
            "cloud_recording:read:list_user_recordings",
            "cloud_recording:read:content",
            "cloud_recording:read:meeting_transcript",
            "user:read:user",
            "meeting:read",
            "meeting:write",
            "meeting:read:meeting",
            "meeting:write:meeting",
            "meeting:read:list_meetings",
            "meeting:write:create_meeting"
        ].join(" ");

        const url = `https://zoom.us/oauth/authorize?response_type=code&client_id=${ZOOM_CLIENT_ID}&redirect_uri=${encodeURIComponent(ZOOM_REDIRECT_URI)}&state=${state}&scope=${encodeURIComponent(scopes)}`;

        return url;

    } catch (error) {
        console.error("Error generating Zoom auth URL:", error);
        throw new Error("Failed to generate Zoom authorization URL.");
    }
};

/**
 * Handle Zoom OAuth Callback
 * @param {string} code - The authorization code from Zoom
 * @param {string} state - The state parameter to verify and link to user
 */
const handleZoomCallback = async (code, state) => {
    const { ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_REDIRECT_URI } = envVars;

    // 1. Verify state and get userId
    const authState = await prisma.zoomAuthState.findUnique({
        where: { state },
    });

    if (!authState) {
        throw new Error("Invalid or expired state parameter.");
    }

    const userId = authState.userId;

    // 2. Exchange code for tokens
    const authString = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64");

    let response;
    try {
        response = await axios.post(
            ZOOM_OAUTH_URL,
            null,
            {
                params: {
                    grant_type: "authorization_code",
                    code,
                    redirect_uri: ZOOM_REDIRECT_URI,
                },
                headers: {
                    Authorization: `Basic ${authString}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );
    } catch (err) {
        console.error("Zoom Token Exchange Error:", err.response?.data || err.message);
        throw new Error(`Zoom token exchange failed: ${JSON.stringify(err.response?.data || err.message)}`);
    }

    const { access_token, refresh_token, expires_in } = response.data;
    const tokenExpiry = new Date(Date.now() + expires_in * 1000);

    // 3. Get Zoom user details
    const userRes = await axios.get(`${ZOOM_API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${access_token}` },
    });

    const zoomUserId = userRes.data.id;
    const zoomEmail = userRes.data.email;

    // 4. Save or update in DB
    let zoomAccount = await prisma.zoomAccount.findFirst({
        where: { connectedUserId: userId },
    });

    if (zoomAccount) {
        zoomAccount = await prisma.zoomAccount.update({
            where: { id: zoomAccount.id },
            data: { zoomUserId, zoomEmail, accessToken: access_token, refreshToken: refresh_token, tokenExpiry },
        });
    } else {
        zoomAccount = await prisma.zoomAccount.create({
            data: { zoomUserId, zoomEmail, accessToken: access_token, refreshToken: refresh_token, tokenExpiry, connectedUserId: userId },
        });
    }

    // 5. Clean up auth state
    await prisma.zoomAuthState.delete({
        where: { id: authState.id },
    });

    return zoomAccount;
};

/**
 * Get a valid access token, refreshing it if necessary
 */
const getValidAccessToken = async (userId) => {
    const zoomAccount = await prisma.zoomAccount.findFirst({
        where: { connectedUserId: userId },
    });

    if (!zoomAccount) {
        throw new Error(`User ${userId} has not connected a Zoom account.`);
    }

    // Refresh if expiring in less than 5 minutes
    if (new Date(zoomAccount.tokenExpiry).getTime() < Date.now() + 5 * 60 * 1000) {
        const { ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = envVars;
        const authString = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64");

        const response = await axios.post(
            ZOOM_OAUTH_URL,
            null,
            {
                params: {
                    grant_type: "refresh_token",
                    refresh_token: zoomAccount.refreshToken,
                },
                headers: {
                    Authorization: `Basic ${authString}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        ).catch(err => {
            console.error("Error refreshing token:", err.response?.data || err.message);
            throw new Error("Failed to refresh Zoom token. Please reconnect.");
        });

        const { access_token, refresh_token, expires_in } = response.data;
        const tokenExpiry = new Date(Date.now() + expires_in * 1000);

        await prisma.zoomAccount.update({
            where: { id: zoomAccount.id },
            data: { accessToken: access_token, refreshToken: refresh_token, tokenExpiry },
        });

        return access_token;
    }

    return zoomAccount.accessToken;
};

/**
 * Fetch meetings for the authenticated user
 */
const getUserMeetings = async (userId) => {
    const token = await getValidAccessToken(userId);

    try {
        const response = await axios.get(`${ZOOM_API_BASE_URL}/users/me/meetings`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        return response.data.meetings;
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.response?.data || error.message;
        console.error(`Error fetching meetings for ${userId}:`, errorMessage);
        throw new Error(`Failed to fetch meetings: ${JSON.stringify(errorMessage)}`);
    }
};

/**
 * Create a new meeting
 */
const createMeeting = async (data) => {
    const userId = data.userId;
    const projectId = data.projectId; // Extract projectId if provided
    const token = await getValidAccessToken(userId);

    try {
        const response = await axios.post(
            `${ZOOM_API_BASE_URL}/users/me/meetings`,
            {
                topic: data.topic,
                type: 2, // Scheduled meeting
                start_time: data.start_time,
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: false,
                    mute_upon_entry: true,
                    watermark: false,
                    use_pmi: false,
                    approval_type: 2, // No registration required
                    audio: "both",
                    auto_recording: "cloud", // Automatically record to cloud to get transcripts
                },
            },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );

        const zoomMeeting = response.data;

        // ✅ If projectId is provided, create a record in ProjectMeeting for tracking
        if (projectId) {
            await prisma.projectMeeting.create({
                data: {
                    projectId,
                    title: zoomMeeting.topic,
                    meetingUrl: zoomMeeting.join_url,
                    meetingDate: new Date(zoomMeeting.start_time),
                    // We store the ID in the URL for later search, or we could add a field to the schema
                }
            });
        }

        return zoomMeeting;
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.response?.data || error.message;
        console.error(`Error creating meeting for ${userId}:`, errorMessage);
        throw new Error(`Failed to create meeting: ${JSON.stringify(errorMessage)}`);
    }
};

/**
 * Fetch cloud recordings for a specific user
 */
const getUserRecordings = async (userId) => {
    const token = await getValidAccessToken(userId);

    try {
        const response = await axios.get(`${ZOOM_API_BASE_URL}/users/me/recordings`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        return response.data.meetings;
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.response?.data || error.message;
        console.error(`Error fetching recordings for ${userId}:`, errorMessage);
        throw new Error(`Failed to fetch recordings: ${JSON.stringify(errorMessage)}`);
    }
};

/**
 * Handle Webhook recording.completed event to process transcripts
 */
const handleRecordingCompletedWebhook = async (payload) => {
    const { object } = payload;
    const meetingId = object.id;
    const hostId = object.host_id;

    console.log(`Processing recording.completed for Zoom Meeting ID: ${meetingId}`);

    // Map Zoom host to our internal user
    const zoomAccount = await prisma.zoomAccount.findFirst({
        where: { zoomUserId: String(hostId) }
    });

    if (!zoomAccount) {
        console.warn(`No linked Zoom account found for Zoom Host ID: ${hostId}. Make sure the user has connected their Zoom account.`);
        return;
    }

    // Find the project associated with this Zoom meeting
    let projectId = null;
    const projectMeeting = await prisma.projectMeeting.findFirst({
        where: {
            meetingUrl: {
                contains: String(meetingId)
            }
        }
    });

    if (projectMeeting) {
        projectId = projectMeeting.projectId;
        console.log(`Successfully matched meeting ID ${meetingId} to Project: ${projectId}`);
    } else {
        console.warn(`Could not find a ProjectMeeting record with a URL containing ID: ${meetingId}`);
    }

    const token = await getValidAccessToken(zoomAccount.connectedUserId);

    try {
        const recordingFiles = object.recording_files || [];

        // Find transcript file in the payload
        const transcriptFile = recordingFiles.find((file) =>
            file.file_type === "TRANSCRIPT" ||
            (file.file_extension === "VTT" && file.recording_type === "audio_transcript")
        );

        if (!transcriptFile) {
            console.log(`No transcript file found in the recording payload for meeting ${meetingId}`);
            return;
        }

        // Check if the file is still processing (sometimes happens even with recording.completed)
        if (transcriptFile.status === "processing") {
            console.log("Transcript is still processing. Skipping for now.");
            return;
        }

        // Step 2: Download transcript 
        const downloadUrl = `${transcriptFile.download_url}?access_token=${token}`;
        const fileName = `zoom_transcript_${meetingId}_${Date.now()}.vtt`;
        const uploadsDir = path.join(process.cwd(), "uploads", "transcripts");

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filePath = path.join(uploadsDir, fileName);

        console.log(`Downloading transcript from ${transcriptFile.download_url}`);

        const downloadResponse = await axios({
            method: 'get',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 30000 // 30 second timeout
        });

        const writer = fs.createWriteStream(filePath);
        downloadResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', async () => {
                try {
                    // Send to transcript service for parsing and database entry
                    const mockFile = {
                        path: filePath,
                        originalname: fileName
                    };

                    const transcript = await TranscriptService.uploadTranscriptService(mockFile, projectId);
                    console.log(`Transcript processed and saved: ${transcript.id}`);

                    // ✅ Update the ProjectMeeting record with all transcript info
                    if (projectMeeting) {
                        await prisma.projectMeeting.update({
                            where: { id: projectMeeting.id },
                            data: {
                                transcriptData: transcript.parsedData,
                                transcriptPath: transcript.filePath,
                                transcriptUrl: downloadUrl // Store the direct download URL for reference
                            }
                        });
                        console.log(`ProjectMeeting ${projectMeeting.id} successfully updated with transcript.`);
                    }

                    resolve(transcript);
                } catch (err) {
                    console.error("Error finalizing transcript processing:", err);
                    reject(err);
                }
            });
            writer.on('error', (err) => {
                console.error("File writer error:", err);
                reject(err);
            });
        });

    } catch (error) {
        console.error(`Error handling recording.completed for meeting ${meetingId}:`, error.response?.data || error.message);
        throw error;
    }
};

/**
 * Disconnect a user's Zoom account
 */
const disconnectZoomAccount = async (userId) => {
    const zoomAccount = await prisma.zoomAccount.findFirst({
        where: { connectedUserId: userId },
    });

    if (!zoomAccount) {
        throw new Error("No connected Zoom account found for this user.");
    }

    await prisma.zoomAccount.delete({
        where: { id: zoomAccount.id },
    });

    return true;
};

export const ZoomService = {
    generateZoomAuthUrl,
    handleZoomCallback,
    getUserMeetings,
    createMeeting,
    getUserRecordings,
    handleRecordingCompletedWebhook,
    disconnectZoomAccount,
};