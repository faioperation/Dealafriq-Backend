import axios from "axios";
import { envVars } from "../../../config/env.js";
import fs from "fs";
import path from "path";
import { TranscriptService } from "../transcriptManagement/transcript.service.js";
import { fileURLToPath } from 'url';
import prisma from "../../../prisma/client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Zoom API Base URL
const ZOOM_API_BASE_URL = "https://api.zoom.us/v2";
const ZOOM_OAUTH_URL = "https://zoom.us/oauth/token";

const generateZoomAuthUrl = async (userId) => {
    const { ZOOM_CLIENT_ID, ZOOM_REDIRECT_URI } = envVars;
    return `https://zoom.us/oauth/authorize?response_type=code&client_id=${ZOOM_CLIENT_ID}&redirect_uri=${ZOOM_REDIRECT_URI}&state=${userId}`;
};

const handleZoomCallback = async (code, userId) => {
    const { ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_REDIRECT_URI } = envVars;
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

    // Get user details
    const userRes = await axios.get(`${ZOOM_API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${access_token}` },
    });
    
    const zoomUserId = userRes.data.id;
    const zoomEmail = userRes.data.email;

    // Verify user still exists before saving
    const userExists = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!userExists) {
        throw new Error(`The Dealafriq user ID (${userId}) no longer exists. Please generate a new Authorization link and try again.`);
    }

    // Save or update in DB
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

    return zoomAccount;
};

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
 * Fetch meetings for a specific user id
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
    // If you pass userId in body, we use it to authenticate.
    // Otherwise fallback to email param if UI is sending it as such
    const userId = data.userId || data.email; 
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

        return response.data;
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
 * Handle Webhook meeting.ended event
 */
const handleMeetingEndedWebhook = async (payload) => {
    const { object } = payload;
    const meetingId = object.id;
    const hostId = object.host_id;

    console.log(`Processing meeting.ended for meeting ID: ${meetingId}`);

    // Map Zoom host to our internal user
    const zoomAccount = await prisma.zoomAccount.findFirst({
        where: { zoomUserId: hostId }
    });

    if (!zoomAccount) {
        console.log(`No linked Zoom account found for host ${hostId}`);
        return;
    }
    
    const token = await getValidAccessToken(zoomAccount.connectedUserId);

    try {
        // Step 1: Fetch meeting recordings
        const response = await axios.get(`${ZOOM_API_BASE_URL}/meetings/${meetingId}/recordings`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const recordingData = response.data;
        const recordingFiles = recordingData.recording_files;

        // Step 2: Find transcript file
        const transcriptFile = recordingFiles.find((file) => file.file_type === "TRANSCRIPT" || (file.file_extension === "VTT" && file.recording_type === "audio_transcript"));

        if (!transcriptFile) {
            console.log(`No transcript found for meeting ${meetingId}`);
            return;
        }

        // Step 3: Download transcript 
        const downloadUrl = `${transcriptFile.download_url}?access_token=${token}`;
        const fileName = `zoom_transcript_${meetingId}_${Date.now()}.vtt`;
        const uploadsDir = path.join(process.cwd(), "uploads", "transcripts");

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filePath = path.join(uploadsDir, fileName);

        const downloadResponse = await axios({
            method: 'get',
            url: downloadUrl,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(filePath);
        downloadResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', async () => {
                try {
                    // Send to existing transcript service
                    const mockFile = {
                        path: filePath,
                        originalname: fileName
                    };

                    const transcript = await TranscriptService.uploadTranscriptService(mockFile, null);
                    console.log(`Transcript processed and saved: ${transcript.id}`);
                    resolve(transcript);
                } catch (err) {
                    console.error("Error saving transcript to DB:", err);
                    reject(err);
                }
            });
            writer.on('error', reject);
        });

    } catch (error) {
        console.error(`Error handling webhook for meeting ${meetingId}:`, error.response?.data || error.message);
        throw error;
    }
};

export const ZoomService = {
    generateZoomAuthUrl,
    handleZoomCallback,
    getUserMeetings,
    createMeeting,
    getUserRecordings,
    handleMeetingEndedWebhook,
};
