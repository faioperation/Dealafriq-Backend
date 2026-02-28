import axios from "axios";
import { redisClient } from "../../../config/redis.config.js";
import { envVars } from "../../../config/env.js";
import fs from "fs";
import path from "path";
import { TranscriptService } from "../transcriptManagement/transcript.service.js";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Zoom API Base URL
const ZOOM_API_BASE_URL = "https://api.zoom.us/v2";
const ZOOM_OAUTH_URL = "https://zoom.us/oauth/token";

const getZoomAccessToken = async () => {
    const cacheKey = "zoom_access_token";

    // Try to get token from cache
    const cachedToken = await redisClient.get(cacheKey);
    if (cachedToken) {
        return cachedToken;
    }

    const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = envVars;

    if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
        throw new Error("Missing Zoom OAuth environment variables in centralized config");
    }

    const authString = Buffer.from(`${ZOOM_CLIENT_ID.trim()}:${ZOOM_CLIENT_SECRET.trim()}`).toString("base64");

    try {
        const response = await axios.post(
            ZOOM_OAUTH_URL,
            null,
            {
                params: {
                    grant_type: "account_credentials",
                    account_id: ZOOM_ACCOUNT_ID.trim(),
                },
                headers: {
                    Authorization: `Basic ${authString}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const { access_token, expires_in } = response.data;

        // Cache token (subtract 60 seconds for safety)
        await redisClient.set(cacheKey, access_token, {
            EX: expires_in - 60,
        });

        return access_token;
    } catch (error) {
        const zoomError = error.response?.data;
        console.error("Zoom Auth Error Details:", zoomError || error.message);

        const errorMessage = zoomError
            ? `Zoom Auth Failed: ${zoomError.reason || zoomError.error || "Unknown reason"} - ${zoomError.error_description || ""}`
            : "Failed to authenticate with Zoom";

        throw new Error(errorMessage);
    }
};

/**
 * Fetch meetings for a specific user email
 */
const getUserMeetings = async (email) => {
    const token = await getZoomAccessToken();

    try {
        const response = await axios.get(`${ZOOM_API_BASE_URL}/users/${email}/meetings`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return response.data.meetings;
    } catch (error) {
        console.error(`Error fetching meetings for ${email}:`, error.response?.data || error.message);
        throw new Error(`Failed to fetch meetings for ${email}`);
    }
};

/**
 * Create a new meeting
 */
const createMeeting = async (data) => {
    const token = await getZoomAccessToken();

    try {
        const response = await axios.post(
            `${ZOOM_API_BASE_URL}/users/${data.email}/meetings`,
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
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error(`Error creating meeting for ${data.email}:`, error.response?.data || error.message);
        throw new Error(`Failed to create meeting for ${data.email}`);
    }
};

/**
 * Fetch cloud recordings for a specific user
 */
const getUserRecordings = async (email) => {
    const token = await getZoomAccessToken();

    try {
        const response = await axios.get(`${ZOOM_API_BASE_URL}/users/${email}/recordings`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return response.data.meetings;
    } catch (error) {
        console.error(`Error fetching recordings for ${email}:`, error.response?.data || error.message);
        throw new Error(`Failed to fetch recordings for ${email}`);
    }
};

/**
 * Handle Webhook meeting.ended event
 */
const handleMeetingEndedWebhook = async (payload) => {
    const { object } = payload;
    const meetingId = object.id;
    const userId = object.host_id;

    console.log(`Processing meeting.ended for meeting ID: ${meetingId}`);

    const token = await getZoomAccessToken();

    try {
        // Step 1: Fetch meeting recordings
        const response = await axios.get(`${ZOOM_API_BASE_URL}/meetings/${meetingId}/recordings`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const recordingData = response.data;
        const recordingFiles = recordingData.recording_files;

        // Step 2: Find transcript file (file_type = "TRANSCRIPT")
        const transcriptFile = recordingFiles.find((file) => file.file_type === "TRANSCRIPT" || (file.file_extension === "VTT" && file.recording_type === "audio_transcript"));

        if (!transcriptFile) {
            console.log(`No transcript found for meeting ${meetingId}`);
            return;
        }

        // Step 3: Download transcript (VTT file)
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
                    // Step 4 & 5: Call existing transcript service method
                    // Mocking what uploadTranscriptService expects: { path, originalname }
                    const mockFile = {
                        path: filePath,
                        originalname: fileName
                    };

                    // Note: projectId is not directly available from Zoom webhook payload unless tracked in DB
                    // For now, passing null or you might want to look it up by meeting ID if saved previously
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
    getZoomAccessToken,
    getUserMeetings,
    createMeeting,
    getUserRecordings,
    handleMeetingEndedWebhook,
};
