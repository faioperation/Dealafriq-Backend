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
            "meeting:read:meeting",
            "meeting:write:meeting",
            "meeting:read:list_meetings",
            "meeting:write:create_meeting",
            "meeting:write:meeting:admin"
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
 * Get a valid Server-to-Server access token for the account
 * This doesn't require a specific user, it uses the Account ID from env
 */
const getAccountAccessToken = async () => {
    const { ZOOM_S2S_CLIENT_ID, ZOOM_S2S_CLIENT_SECRET, ZOOM_ACCOUNT_ID } = envVars;

    if (!ZOOM_ACCOUNT_ID) {
        console.warn("ZOOM_ACCOUNT_ID is not defined. Falling back to user-level OAuth.");
        return null;
    }

    const authString = Buffer.from(`${ZOOM_S2S_CLIENT_ID}:${ZOOM_S2S_CLIENT_SECRET}`).toString("base64");

    try {
        const response = await axios.post(
            ZOOM_OAUTH_URL,
            null,
            {
                params: {
                    grant_type: "account_credentials",
                    account_id: ZOOM_ACCOUNT_ID,
                },
                headers: {
                    Authorization: `Basic ${authString}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        return response.data.access_token;
    } catch (err) {
        console.error("Zoom Server-to-Server Token Error:", err.response?.data || err.message);
        return null;
    }
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
    const projectId = data.projectId;

    // 1. Get the user's linked Zoom account to find their Zoom Email/ID
    const zoomAccount = await prisma.zoomAccount.findFirst({
        where: { connectedUserId: userId }
    });

    if (!zoomAccount) {
        throw new Error("User has not connected their Zoom account.");
    }

    // 2. Prioritize Server-to-Server token for high-level permissions (managed on behalf of user)
    // Fallback to user-level token if S2S is not available
    const s2sToken = await getAccountAccessToken();
    const token = s2sToken || (await getValidAccessToken(userId));

    // 3. If using S2S, we can create a meeting for ANY user in the account using their email/id
    const targetUserId = s2sToken ? zoomAccount.zoomEmail : "me";

    try {
        const response = await axios.post(
            `${ZOOM_API_BASE_URL}/users/${targetUserId}/meetings`,
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
 * Fetch specific recording files for a meeting by ID
 */
const getRecordingFilesByMeetingId = async (meetingId) => {
    const token = await getAccountAccessToken();
    if (!token) return null;

    try {
        const response = await axios.get(`${ZOOM_API_BASE_URL}/meetings/${meetingId}/recordings`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        console.error(`[Zoom API Check] Failed to fetch recordings for meeting ${meetingId}:`, error.message);
        return null;
    }
};

/**
 * Handle Webhook recording.completed event to process transcripts
 */
const handleRecordingCompletedWebhook = async (payload) => {
    const { object } = payload;
    const meetingId = object.id;
    const hostId = object.host_id;
    console.log(`[Zoom Webhook] Received recording.completed for Zoom Meeting ID: ${meetingId} (Host: ${hostId})`);

    // 1. Find the project meeting record by its numeric ID in the URL
    // We do this first because if the meeting exists in our DB, we want to process it!
    let projectMeeting = await prisma.projectMeeting.findFirst({
        where: {
            meetingUrl: { contains: String(meetingId) }
        }
    });

    // Fallback: search for formatted IDs (e.g. "123 4567 8901" or "123-456-7890")
    if (!projectMeeting) {
        const formattedId1 = String(meetingId).replace(/(.{3})(.{4})(.{4})/, '$1 $2 $3');
        const formattedId2 = String(meetingId).replace(/(.{3})(.{3})(.{4})/, '$1-$2-$3');

        projectMeeting = await prisma.projectMeeting.findFirst({
            where: {
                OR: [
                    { meetingUrl: { contains: formattedId1 } },
                    { meetingUrl: { contains: formattedId2 } }
                ]
            }
        });
    }

    if (projectMeeting) {
        console.log(`[Zoom Webhook] Successfully matched meeting ID ${meetingId} to Project Meeting: ${projectMeeting.id}`);
    } else {
        console.warn(`[Zoom Webhook] Could not find any ProjectMeeting in our database containing ID: ${meetingId}. Ignoring webhook.`);
        return;
    }

    // 2. Identify the token to use (Server-to-Server is best for background tasks)
    const token = await getAccountAccessToken();
    
    // Fallback: If S2S is not available, try to find the host's personal token
    let finalToken = token;
    if (!finalToken) {
        const zoomAccount = await prisma.zoomAccount.findFirst({
            where: { zoomUserId: String(hostId) }
        });
        if (zoomAccount) {
            finalToken = await getValidAccessToken(zoomAccount.connectedUserId);
        }
    }

    if (!finalToken) {
        console.error(`[Zoom Webhook] Could not obtain a valid token (S2S or User) to download transcript for meeting ${meetingId}`);
        return;
    }

        // 3. Process the files
    try {
        const projectId = projectMeeting.projectId;
        let recordingFiles = object.recording_files || [];
        
        console.log(`[Zoom Webhook] Available files for meeting ${meetingId}:`, recordingFiles.map(f => `${f.file_type} (${f.status})`));

        // A. Find Video File (MP4) to update the playback link immediately
        const videoFile = recordingFiles.find((file) => file.file_type === "MP4");
        if (videoFile && videoFile.status === "completed") {
            await prisma.projectMeeting.update({
                where: { id: projectMeeting.id },
                data: {
                    videoPlayUrl: videoFile.play_url,
                    // If no transcript yet, set a friendly status
                    ...(projectMeeting.transcriptStatus !== "completed" && { transcriptStatus: "recording_ready" })
                }
            });
            console.log(`[Zoom Webhook] ProjectMeeting ${projectMeeting.id} updated with video playback link.`);
        }

        // B. Find Transcript file (VTT)
        let transcriptFile = recordingFiles.find((file) =>
            file.file_type === "TRANSCRIPT" ||
            String(file.recording_type).toLowerCase() === "audio_transcript" ||
            String(file.file_extension).toLowerCase() === "vtt"
        );

        // 🚀 SMART FALLBACK: If transcript is missing, call Zoom API directly to check again!
        if (!transcriptFile) {
            console.log(`[Zoom Webhook] No transcript in webhook. Checking Zoom API fallback for meeting ${meetingId}...`);
            const latestData = await getRecordingFilesByMeetingId(meetingId);
            
            if (latestData && latestData.recording_files) {
                recordingFiles = latestData.recording_files;
                transcriptFile = recordingFiles.find((file) =>
                    file.file_type === "TRANSCRIPT" ||
                    String(file.recording_type).toLowerCase() === "audio_transcript" ||
                    String(file.file_extension).toLowerCase() === "vtt"
                );
                
                if (transcriptFile) {
                    console.log(`[Zoom Webhook] ✅ Transcript found via API fallback for meeting ${meetingId}!`);
                }
            }
        }

        if (!transcriptFile) {
            console.log(`[Zoom Webhook] No transcript found yet for meeting ${meetingId}. Meeting record updated with video link only.`);
            return;
        }

        // Avoid duplicate processing if we already have this transcript
        if (projectMeeting.transcriptStatus === "completed" && projectMeeting.transcriptUrl === transcriptFile.download_url) {
            console.log(`[Zoom Webhook] Transcript for meeting ${meetingId} has already been processed. Skipping duplicates.`);
            return;
        }

        // Check if the file is still processing
        if (transcriptFile.status === "processing") {
            console.log(`[Zoom Webhook] Transcript for meeting ${meetingId} is still processing. Setting status and waiting...`);
            await prisma.projectMeeting.update({
                where: { id: projectMeeting.id },
                data: { transcriptStatus: "processing" }
            });
            return;
        }

        // Step 2: Download transcript 
        const separator = transcriptFile.download_url.includes('?') ? '&' : '?';
        const downloadUrl = `${transcriptFile.download_url}${separator}access_token=${finalToken}`;

        console.log(`[Zoom Webhook] Downloading transcript for meeting ${meetingId}...`);
        const fileName = `zoom_transcript_${meetingId}_${Date.now()}.vtt`;
        const uploadsDir = path.join(process.cwd(), "uploads", "transcripts");

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filePath = path.join(uploadsDir, fileName);

        const downloadResponse = await axios({
            method: 'get',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 60000 
        });

        if (downloadResponse.status !== 200) {
            console.error(`[Zoom Webhook] Failed to download transcript. Status: ${downloadResponse.status}`);
            return;
        }

        const writer = fs.createWriteStream(filePath);
        downloadResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', async () => {
                try {
                    const mockFile = {
                        path: filePath,
                        originalname: fileName
                    };

                    const transcript = await TranscriptService.uploadTranscriptService(mockFile, projectId);
                    console.log(`[Zoom Webhook] Transcript parsed and saved for meeting ${meetingId}. ID: ${transcript.id}`);

                    // ✅ Final Update: Patch the ProjectMeeting record with transcript info
                    if (projectMeeting) {
                        await prisma.projectMeeting.update({
                            where: { id: projectMeeting.id },
                            data: {
                                transcriptData: transcript.parsedData,
                                transcriptPath: transcript.filePath,
                                transcriptUrl: transcriptFile.download_url,
                                transcriptStatus: transcriptFile.status,
                                transcriptPlayUrl: transcriptFile.play_url,
                                transcriptFileType: transcriptFile.file_type
                            }
                        });
                        console.log(`[Zoom Webhook] ProjectMeeting ${projectMeeting.id} updated with transcript data.`);
                    }

                    resolve(transcript);
                } catch (err) {
                    console.error("[Zoom Webhook] Error finalizing transcript processing:", err);
                    reject(err);
                }
            });
            writer.on('error', (err) => {
                console.error("[Zoom Webhook] File writer error:", err);
                reject(err);
            });
        });

    } catch (error) {
        console.error(`Error handling Zoom update for meeting ${meetingId}:`, error.response?.data || error.message);
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
    getAccountAccessToken,
};