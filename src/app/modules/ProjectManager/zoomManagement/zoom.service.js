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

/* -------------------- NEW HELPERS -------------------- */
const MAX_RETRY_ATTEMPTS = 6;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const findTranscriptFile = (files = []) => {
    return files.find(f =>
        f.file_type === "TRANSCRIPT" ||
        (f.file_extension && f.file_extension.toLowerCase() === "vtt")
    );
};

/**
 * Recursive delay/polling mechanism for when a transcript is not yet ready.
 */
const scheduleTranscriptRetry = async ({
    uuid,
    projectMeetingId,
    attempt = 1
}) => {
    if (attempt > MAX_RETRY_ATTEMPTS) {
        console.warn(`[Step 8.X] RETRY: Max attempts (${MAX_RETRY_ATTEMPTS}) reached for meeting ${projectMeetingId}. Giving up.`);
        return;
    }

    const delayTime = attempt * 30000; // 30s, 60s, 90s, etc.
    console.log(`[Step 8.Retry ${attempt}] BUSY: Scheduling next check in ${delayTime / 1000}s...`);

    setTimeout(async () => {
        try {
            console.log(`[Step 8.Retry ${attempt}] START: Checking Zoom API for transcript via UUID ${uuid}...`);
            const latestData = await getRecordingFilesByMeetingId(uuid);
            const transcriptFile = findTranscriptFile(latestData?.recording_files);

            if (!transcriptFile || transcriptFile.status === "processing") {
                console.log(`[Step 8.Retry ${attempt}] MISS: Transcript still not ready. Retrying...`);
                return scheduleTranscriptRetry({
                    uuid,
                    projectMeetingId,
                    attempt: attempt + 1
                });
            }

            console.log(`[Step 8.Retry ${attempt}] ✅ FOUND: Transcript is ready! Processing download...`);
            
            // Re-fetch token just before processing to ensure it's fresh
            const freshToken = await getAccountAccessToken();
            
            await processTranscriptFile({
                transcriptFile,
                projectMeetingId,
                token: freshToken
            });

        } catch (err) {
            console.error(`[Step 8.Retry ${attempt}] ERROR:`, err.message);
        }
    }, delayTime);
};

/**
 * Standardized logic to download, parse, and save a specific transcript file.
 */
const processTranscriptFile = async ({
    transcriptFile,
    projectMeetingId,
    token
}) => {
    const projectMeeting = await prisma.projectMeeting.findUnique({
        where: { id: projectMeetingId }
    });

    if (!projectMeeting) return;

    // Avoid duplicate processing
    if (
        projectMeeting.transcriptStatus === "completed" &&
        projectMeeting.transcriptUrl === transcriptFile.download_url
    ) {
        console.log(`[Process] Duplicate transcript skipped.`);
        return;
    }

    const downloadFunc = async (currentToken) => {
        const separator = transcriptFile.download_url.includes('?') ? '&' : '?';
        const downloadUrl = `${transcriptFile.download_url}${separator}access_token=${currentToken}`; 

        const fileName = `zoom_transcript_${Date.now()}.vtt`;
        const uploadsDir = path.join(process.cwd(), "uploads", "transcripts");
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const filePath = path.join(uploadsDir, fileName);

        console.log(`[Step 10] DL: Starting transcript download for project meeting ${projectMeetingId}...`);
        
        try {
            const response = await axios({
                method: 'get',
                url: downloadUrl,
                responseType: 'stream',
                timeout: 60000
            });
            return { response, filePath, fileName };
        } catch (error) {
            if (error.response?.status === 401) {
                console.warn(`[Step 10.Retry] 401: Token rejected. Attempting User OAuth fallback...`);
                // Find the host's connected Zoom account to get a user-level token
                const zoomAccount = await prisma.zoomAccount.findFirst({
                    where: { zoomEmail: projectMeeting.hostEmail || undefined } // Fallback logic
                });

                if (zoomAccount) {
                    const userToken = await getValidAccessToken(zoomAccount.connectedUserId);
                    if (userToken) {
                        console.log(`[Step 10.Retry] SUCCESS: Got User token! Retrying download...`);
                        const retryUrl = `${transcriptFile.download_url}${separator}access_token=${userToken}`;
                        const retryResponse = await axios({
                            method: 'get',
                            url: retryUrl,
                            responseType: 'stream',
                            timeout: 60000
                        });
                        return { response: retryResponse, filePath, fileName };
                    }
                }
            }
            throw error;
        }
    };

    try {
        const { response, filePath, fileName } = await downloadFunc(token);
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', async () => {
                try {
                    const mockFile = { path: filePath, originalname: fileName };
                    const transcriptInDB = await TranscriptService.uploadTranscriptService(mockFile, projectMeeting.projectId);

                    await prisma.projectMeeting.update({
                        where: { id: projectMeetingId },
                        data: {
                            transcriptData: transcriptInDB.parsedData,
                            transcriptPath: transcriptInDB.filePath,
                            transcriptUrl: transcriptFile.download_url,
                            transcriptStatus: "completed",
                            transcriptPlayUrl: transcriptFile.play_url,
                            transcriptFileType: transcriptFile.file_type
                        }
                    });

                    console.log(`[Step 13] UPDATE: ✅ Transcript saved and updated in ProjectMeeting ${projectMeetingId}.`);
                    resolve();
                } catch (err) {
                    console.error(`[Process] Error finalizing update:`, err.message);
                    reject(err);
                }
            });
            writer.on('error', (err) => {
                console.error(`[Process] Download stream error:`, err.message);
                reject(err);
            });
        });
    } catch (err) {
        console.error(`[Step 10.FATAL] Download failed even with potential fallback:`, err.message);
    }
};

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
            "cloud_recording:read:list_recording_files",
            "cloud_recording:read:list_recording_files:admin",
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
 * Fetch specific recording files for a meeting by ID or UUID.
 * Note: For recording APIs, Zoom requires the UUID to be double-encoded if it starts 
 * with a '/' or contains '//'.
 */
const getRecordingFilesByMeetingId = async (meetingIdOrUuid) => {
    const token = await getAccountAccessToken();
    if (!token) return null;

    try {
        let encodedId = String(meetingIdOrUuid);
        // Double-encode ONLY IF it starts with '/' or contains '//'
        if (encodedId.startsWith('/') || encodedId.includes('//')) {
            encodedId = encodeURIComponent(encodeURIComponent(encodedId));
        } else {
            encodedId = encodeURIComponent(encodedId);
        }

        const response = await axios.get(`${ZOOM_API_BASE_URL}/meetings/${encodedId}/recordings`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        console.error(`[Zoom API Check] Failed to fetch recordings for ${meetingIdOrUuid}:`, error.response?.data?.message || error.message);
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

    console.log(`\n[Step 1] RECV: Zoom Webhook for Meeting ID: ${meetingId} (Topic: "${object.topic}")`);
    
    // 1. Initial Delay to ensure DB Consistency
    console.log(`[Step 2] WAIT: 12 seconds buffering delay for database...`);
    await delay(12000); 

    // 2. Identify and Find the ProjectMeeting record
    const targetIdStr = String(meetingId);
    console.log(`[Step 3] SEARCH: Looking for meeting containing ID: ${targetIdStr}`);

    let projectMeeting = await prisma.projectMeeting.findFirst({
        where: { meetingUrl: { contains: targetIdStr } }
    });

    // Fallback 1: Manual Title-based search
    if (!projectMeeting) {
        console.log(`[Step 3.1] FALLBACK: ID Search failed. Checking for title matches: "${object.topic}"`);
        projectMeeting = await prisma.projectMeeting.findFirst({
            where: {
                title: { contains: object.topic },
                meetingDate: {
                    gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000) // Within 24h
                }
            }
        });
    }

    if (!projectMeeting) {
        console.warn(`[Step 3.2] ABORT: Could not match Meeting ${meetingId} to any ProjectMeeting in our DB.`);
        return;
    }

    console.log(`[Step 4] MATCH: Linked to ProjectMeeting ID: ${projectMeeting.id}`);

    // 3. Obtain Token
    const token = await getAccountAccessToken();
    let finalToken = token;
    if (!finalToken) {
        const zoomAccount = await prisma.zoomAccount.findFirst({ where: { zoomUserId: String(hostId) } });
        if (zoomAccount) finalToken = await getValidAccessToken(zoomAccount.connectedUserId);
    }

    if (!finalToken) {
        console.error(`[Step 5] FAIL: Could not obtain an Access Token to process Zoom data.`);
        return;
    }
    console.log(`[Step 5] TOKEN: Access token secured.`);

    // 4. Process the files
    try {
        let recordingFiles = object.recording_files || [];
        console.log(`[Step 6] FILES: Found ${recordingFiles.length} files from Zoom.`);

        // A. Video Update (MP4) - DO THIS FIRST
        const videoFile = recordingFiles.find(f => f.file_type === "MP4");
        if (videoFile && videoFile.status === "completed") {
            try {
                await prisma.projectMeeting.update({
                    where: { id: projectMeeting.id },
                    data: {
                        videoPlayUrl: videoFile.play_url,
                        transcriptStatus: projectMeeting.transcriptStatus === "completed" ? "completed" : "recording_ready"
                    }
                });
                console.log(`[Step 7] VIDEO: Playback URL saved (${videoFile.play_url})`);
            } catch (vErr) {
                console.error(`[Step 7 - ERR] Failed to update video link:`, vErr.message);
            }
        }

        // B. Transcript Check & Polling Logic
        let transcriptFile = findTranscriptFile(recordingFiles);

        // API Fallback check if not in webhook
        if (!transcriptFile) {
            console.log(`[Step 8] FALLBACK: Transcript missing in webhook. Checking Zoom API via Numeric ID ${meetingId}...`);
            let latestData = await getRecordingFilesByMeetingId(meetingId);
            
            // If numeric ID fails, try UUID as secondary fallback
            if (!latestData) {
                console.log(`[Step 8.1] FALLBACK: Numeric ID failed. Trying UUID ${object.uuid}...`);
                latestData = await getRecordingFilesByMeetingId(object.uuid);
            }

            if (latestData?.recording_files) {
                recordingFiles = latestData.recording_files;
                transcriptFile = findTranscriptFile(recordingFiles);
            }
        }

        // If still missing OR still "processing", trigger the retry loop
        if (!transcriptFile || transcriptFile.status === "processing") {
            console.log(`[Step 8] BUSY: Transcript not ready yet. Scheduling recursive retry...`);
            
            await prisma.projectMeeting.update({
                where: { id: projectMeeting.id },
                data: { transcriptStatus: "pending" }
            });

            await scheduleTranscriptRetry({
                uuid: object.uuid,
                projectMeetingId: projectMeeting.id,
                attempt: 1
            });

            return;
        }

        // C. Process Found Transcript Immediately
        console.log(`[Step 9] TRANSCRIPT: Ready! Processing immediately...`);
        await processTranscriptFile({
            transcriptFile,
            projectMeetingId: projectMeeting.id,
            token: finalToken
        });

    } catch (error) {
        console.error(`[CRITICAL] Error in Zoom processing:`, error.message);
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