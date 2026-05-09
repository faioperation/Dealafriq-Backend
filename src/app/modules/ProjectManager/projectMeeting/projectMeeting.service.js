import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";
import axios from "axios";
import { envVars } from "../../../config/env.js";
import { GoogleCalendarService } from "../googleCalender/googleCalender.service.js";
import { buildFileUrl } from "../../../utils/buildFileUrl.js";
import { TranscriptParser } from "../../../utils/transcript.parser.js";
import path from "path";
import { QueryBuilder } from "../../../utils/QueryBuilder.js";
import { projectMeetingSearchableFields } from "../../../constant.js";
import { AiDetectionService } from "../aiDetection/aiDetection.service.js";

const verifyProjectOwnership = async (prisma, projectId, userId) => {
    const project = await prisma.project.findFirst({
        where: { id: projectId, managerId: userId, deletedAt: null },
    });
    if (!project) {
        throw new AppError(StatusCodes.FORBIDDEN, "You do not have access to this project");
    }
    return project;
};

const normalizeStatus = (status, type) => {
    if (!status) return undefined;
    const normalized = status.trim().replace(/\s+/g, "_").toUpperCase();

    if (type === "keyPoint") {
        const valid = ["VALIDATED", "TO_BE_VALIDATED"];
        return valid.includes(normalized) ? normalized : undefined;
    } else if (type === "actionPoint") {
        const valid = ["PENDING", "IN_PROGRESS", "COMPLETED"];
        return valid.includes(normalized) ? normalized : undefined;
    }
    return normalized;
};

export const ProjectMeetingService = {
    createMeeting: async (prisma, payload, userId, file) => {
        await verifyProjectOwnership(prisma, payload.projectId, userId);

        const { keyPoints, actionPoints, ...meetingData } = payload;

        let transcriptUrl = null;
        let transcriptPath = null;
        let transcriptData = null;

        if (file) {
            transcriptPath = file.path.replace(/\\/g, "/");
            try {
                // Determine file type and parse
                const ext = path.extname(file.originalname).toLowerCase();
                let parsedResult = null;

                if (ext === ".vtt") {
                    parsedResult = TranscriptParser.parseVtt(file.path);
                } else if (ext === ".txt") {
                    parsedResult = TranscriptParser.parseTxt(file.path);
                } else if (ext === ".docx") {
                    parsedResult = await TranscriptParser.parseDocx(file.path);
                }

                if (parsedResult) {
                    transcriptData = parsedResult.speeches; // Store just the speeches array, or the whole object based on preference
                }
                
                // Assume buildFileUrl exists and handles relative paths. We might need a req object if BACKEND_URL isn't set.
                // Normally buildFileUrl requires req to get host, but we don't have req here easily unless we pass it.
                // The current buildFileUrl has fallback: envVars.BACKEND_URL.
                transcriptUrl = buildFileUrl(transcriptPath); 
            } catch (err) {
                console.error("Failed to parse transcript:", err);
            }
        }

        let parsedKeyPoints = keyPoints;
        let parsedActionPoints = actionPoints;

        // If form-data sends keyPoints/actionPoints as stringified JSON
        if (typeof keyPoints === 'string') {
            try { parsedKeyPoints = JSON.parse(keyPoints); } catch(e) {}
        }
        if (typeof actionPoints === 'string') {
            try { parsedActionPoints = JSON.parse(actionPoints); } catch(e) {}
        }

        const meeting = await prisma.projectMeeting.create({
            data: {
                ...meetingData,
                title: payload.title || "Project Meeting",
                meetingDate: payload.meetingDate ? new Date(payload.meetingDate) : new Date(),
                transcriptPath,
                transcriptUrl,
                transcriptData,
                keyPoints: parsedKeyPoints && Array.isArray(parsedKeyPoints) ? {
                    create: parsedKeyPoints.map(kp => ({
                        content: kp.content,
                        status: normalizeStatus(kp.status, "keyPoint") || "TO_BE_VALIDATED"
                    }))
                } : undefined,
                actionPoints: parsedActionPoints && Array.isArray(parsedActionPoints) ? {
                    create: parsedActionPoints.map(ap => ({
                        content: ap.content,
                        status: normalizeStatus(ap.status, "actionPoint") || "PENDING"
                    }))
                } : undefined,
            },
            include: {
                keyPoints: true,
                actionPoints: true,
            },
        });

        await ActivityLogService.createLog(prisma, {
            type: "meeting",
            crudId: meeting.id,
            action: "create",
            userId,
            projectId: meeting.projectId,
        });
        // Trigger AI sync in the background with retry logic
        const syncWithRetry = async () => {
            const delays = [15000, 30000, 45000, 60000, 60000]; // 15s, 30s, 45s, 60s, 60s
            for (let attempt = 0; attempt < delays.length; attempt++) {
                try {
                    console.log(`[Meeting AI Sync] Attempt ${attempt + 1} for meeting ${meeting.id} starting in ${delays[attempt] / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delays[attempt]));
                    
                    const result = await ProjectMeetingService.syncAiMeetingSummary(prisma, userId, meeting.id);
                    if (result && result.targetIdUpdated) {
                        console.log(`[Meeting AI Sync] Success on attempt ${attempt + 1} for meeting ${meeting.id}`);
                        break;
                    } else {
                        console.log(`[Meeting AI Sync] Attempt ${attempt + 1} joined successfully but target meeting ${meeting.id} was not in AI response yet.`);
                    }
                } catch (error) {
                    console.error(`[Meeting AI Sync] Attempt ${attempt + 1} failed for meeting ${meeting.id}:`, error.message);
                }
                
                if (attempt === delays.length - 1) {
                    console.warn(`[Meeting AI Sync] All ${delays.length} attempts failed for meeting ${meeting.id}. AI data might still be processing or API is down.`);
                }
            }
        };

        syncWithRetry().catch(error => {
            console.error("Critical error in background AI Sync loop:", error.message);
        });

        // Trigger Google Calendar sync in the background
        GoogleCalendarService.createEvent(userId, meeting).catch(error => {
            console.error("Background Google Calendar event creation failed:", error.message);
        });

        // Return the original meeting immediately
        return meeting;
    },

    getAllMeetings: async (prisma, projectId, userId) => {
        await verifyProjectOwnership(prisma, projectId, userId);

        const meetings = await prisma.projectMeeting.findMany({
            where: { projectId },
            include: {
                keyPoints: true,
                actionPoints: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return meetings.map(({ meetingUrl, ...meeting }) => meeting);
    },

    getMyMeetings: async (prisma, userId, query) => {
        const queryBuilder = new QueryBuilder(query)
            .search(projectMeetingSearchableFields)
            .filter({}, {}) 
            .sort("-createdAt")
            .paginate();

        const buildQuery = queryBuilder.build();
        buildQuery.where = {
            ...buildQuery.where,
            project: {
                managerId: userId,
                deletedAt: null
            }
        };

        const [result, total] = await Promise.all([
            prisma.projectMeeting.findMany({
                ...buildQuery,
                include: {
                    project: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                    keyPoints: true,
                    actionPoints: true,
                },
            }),
            prisma.projectMeeting.count({ where: buildQuery.where }),
        ]);

        const dataWithoutUrl = result.map(({ meetingUrl, ...meeting }) => meeting);

        return {
            meta: queryBuilder.getMeta(total),
            data: dataWithoutUrl,
        };
    },

    getSingleMeeting: async (prisma, id, userId) => {
        const meeting = await prisma.projectMeeting.findUnique({
            where: { id },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        managerId: true,
                        deletedAt: true,
                    },
                },
                keyPoints: true,
                actionPoints: true,
            },
        });

        if (
            !meeting ||
            meeting.project.managerId !== userId ||
            meeting.project.deletedAt !== null
        ) {
            throw new AppError(StatusCodes.FORBIDDEN, "Meeting not found or access denied");
        }

        const { meetingUrl, ...meetingWithoutUrl } = meeting;
        return meetingWithoutUrl;
    },

    updateMeeting: async (prisma, id, payload, userId) => {
        const meeting = await prisma.projectMeeting.findUnique({
            where: { id },
            include: { project: true },
        });

        if (!meeting || meeting.project.managerId !== userId || meeting.project.deletedAt !== null) {
            throw new AppError(StatusCodes.FORBIDDEN, "Meeting not found or access denied");
        }

        const { keyPoints, actionPoints, ...updateDataRaw } = payload;
        const updateData = { ...updateDataRaw };
        if (payload.meetingDate) updateData.meetingDate = new Date(payload.meetingDate);

        const nestedOps = {};

        if (keyPoints) {
            nestedOps.keyPoints = {
                update: keyPoints.filter(kp => kp.id).map(kp => {
                    const data = {};
                    if (kp.content !== undefined) data.content = kp.content;
                    if (kp.status !== undefined) data.status = normalizeStatus(kp.status, "keyPoint");

                    return {
                        where: { id: kp.id },
                        data
                    };
                }),
                create: keyPoints.filter(kp => !kp.id).map(kp => ({
                    content: kp.content,
                    status: normalizeStatus(kp.status, "keyPoint") || "TO_BE_VALIDATED"
                }))
            };
        }

        if (actionPoints) {
            nestedOps.actionPoints = {
                update: actionPoints.filter(ap => ap.id).map(ap => {
                    const data = {};
                    if (ap.content !== undefined) data.content = ap.content;
                    if (ap.status !== undefined) data.status = normalizeStatus(ap.status, "actionPoint");

                    return {
                        where: { id: ap.id },
                        data
                    };
                }),
                create: actionPoints.filter(ap => !ap.id).map(ap => ({
                    content: ap.content,
                    status: normalizeStatus(ap.status, "actionPoint") || "PENDING"
                }))
            };
        }

        const updatedMeeting = await prisma.projectMeeting.update({
            where: { id },
            data: {
                ...updateData,
                ...nestedOps
            },
            include: {
                keyPoints: true,
                actionPoints: true,
            }
        });

        await ActivityLogService.createLog(prisma, {
            type: "meeting",
            crudId: id,
            action: "update",
            userId,
            projectId: meeting.projectId,
        });

        return updatedMeeting;
    },

    deleteMeeting: async (prisma, id, userId) => {
        const meeting = await prisma.projectMeeting.findUnique({
            where: { id },
            include: { project: true },
        });

        if (!meeting || meeting.project.managerId !== userId || meeting.project.deletedAt !== null) {
            throw new AppError(StatusCodes.FORBIDDEN, "Meeting not found or access denied");
        }

        const deletedMeeting = await prisma.projectMeeting.delete({
            where: { id },
        });

        await ActivityLogService.createLog(prisma, {
            type: "meeting",
            crudId: id,
            action: "delete",
            userId,
            projectId: meeting.projectId,
        });

        return deletedMeeting;
    },

    syncAiMeetingSummary: async (prisma, userId, targetMeetingId = null) => {
        try {
            // No initial fixed wait here anymore, it's handled by the retry loop in createMeeting or caller
            // If called without targetMeetingId (e.g. manual trigger), we might still want a small delay or none.

            // Call both AI APIs with individual error handling and correct internal keys
            let projectsData = [];
            let transcriptData = [];

            try {
                const meetingResponse = await axios.post(`${envVars.API_AI}/summary/meeting`, {}, {
                    headers: { 'x-backend-service': envVars.INTERNAL_BACKEND_SERVICE_KEY }
                });
                projectsData = meetingResponse.data;
                console.log(
                    "=== AI API Response Data for Meetings 🧑‍💼 ===\n",
                    JSON.stringify(projectsData, null, 2)
                );
            } catch (err) {
                console.error("[AI Sync] Meeting summary API failed:", err.message);
            }

            try {
                const transcriptResponse = await axios.post(`${envVars.API_AI}/summary/transcripts`, {}, {
                    headers: { 'x-backend-service': envVars.INTERNAL_BACKEND_SERVICE_KEY }
                });
                transcriptData = transcriptResponse.data;
                console.log(
                    "=== AI API Response Data for Transcripts 📝 ===\n",
                    JSON.stringify(transcriptData, null, 2)
                );
            } catch (err) {
                console.error("[AI Sync] Transcript detection API failed or not found:", err.message);
            }

            let targetIdUpdated = false;
            let updatedCount = 0;

            if (!Array.isArray(projectsData)) {
                throw new AppError(StatusCodes.BAD_REQUEST, "Invalid response from AI API");
            }

            for (const projectItem of projectsData) {
                const { meetings, projectId, session } = projectItem;
                if (!meetings || !Array.isArray(meetings)) continue;

                for (const aiMeeting of meetings) {
                    const { meetingId, summary, actionPoints, discussionPoints, notes, agenda } = aiMeeting;

                    // check if meeting exists
                    const meetingExists = await prisma.projectMeeting.findUnique({
                        where: { id: meetingId },
                        include: { project: true }
                    });

                    if (meetingExists) {
                        // Only update if the project status matches the AI session
                        if (meetingExists.project.status !== session) continue;

                        const updateData = {
                            notes: notes || meetingExists.notes,
                            agenda: agenda || meetingExists.agenda,
                        };

                        if (summary) {
                            updateData.aiMeetingSummary = {
                                push: summary
                            };
                            updateData.lastMeetingSummary = summary;
                        }

                        // Deduplication: Delete existing action points and key points for THIS meeting
                        // This ensures that frequent syncs don't create thousands of duplicates
                        await prisma.actionPoint.deleteMany({
                            where: { meetingId: meetingId }
                        });
                        await prisma.keyPoint.deleteMany({
                            where: { meetingId: meetingId }
                        });

                        const nestedOps = {};

                        if (actionPoints && Array.isArray(actionPoints) && actionPoints.length > 0) {
                            nestedOps.actionPoints = {
                                create: actionPoints.map(content => ({
                                    content,
                                    status: "PENDING"
                                }))
                            };
                        }

                        if (discussionPoints && Array.isArray(discussionPoints) && discussionPoints.length > 0) {
                            nestedOps.keyPoints = {
                                create: discussionPoints.map(content => ({
                                    content,
                                    status: "TO_BE_VALIDATED"
                                }))
                            };
                        }

                        // update the meeting
                        await prisma.projectMeeting.update({
                            where: { id: meetingId },
                            data: {
                                ...updateData,
                                ...nestedOps
                            }
                        });


                        // log activity (optional but good)
                        if (userId && meetingExists.project) {
                            await ActivityLogService.createLog(prisma, {
                                type: "meeting",
                                crudId: meetingId,
                                action: "update_ai_summary",
                                userId,
                                projectId: meetingExists.projectId,
                            });
                        }

                        if (meetingId === targetMeetingId) {
                            targetIdUpdated = true;
                        }

                        updatedCount++;
                    }
                }
            }
            
            // Handle Transcript Data and AI Detection
            if (Array.isArray(transcriptData)) {
                for (const transcriptItem of transcriptData) {
                    const { meetingId, summary, raiddAnalysis } = transcriptItem;
                    if (!meetingId) continue;

                    const meeting = await prisma.projectMeeting.findUnique({
                        where: { id: meetingId },
                        include: { project: true }
                    });

                    if (meeting) {
                        // Check if detection already exists for this transcript to avoid duplicates during retries
                        const existingDetection = await prisma.aiDetection.findFirst({
                            where: {
                                sourceType: 'meeting_transcript',
                                title: meeting.title || 'New AI Detection from Meeting Transcript',
                                summary: summary,
                            }
                        });

                        if (!existingDetection) {
                            // Filter raiddData
                            let filteredRaiddData = null;
                            if (raiddAnalysis && typeof raiddAnalysis === 'object') {
                                filteredRaiddData = {};
                                for (const key in raiddAnalysis) {
                                    if (raiddAnalysis[key] !== null) {
                                        filteredRaiddData[key] = raiddAnalysis[key];
                                    }
                                }
                                if (Object.keys(filteredRaiddData).length === 0) {
                                    filteredRaiddData = null;
                                }
                            }

                            // Create AI detection record
                            await AiDetectionService.createAiDetection(prisma, {
                                title: meeting.title || 'New AI Detection from Meeting Transcript',
                                summary: summary,
                                raiddAnalysis: transcriptItem.category || [],
                                raiddData: filteredRaiddData,
                                sourceType: 'meeting_transcript',
                                managerId: meeting.project?.managerId || userId,
                                fullAiResponse: transcriptItem
                            }, userId);
                        }
                    }
                }
            }

            return { updatedCount, targetIdUpdated, message: `Successfully updated ${updatedCount} meetings with AI summaries.` };
        } catch (error) {
            throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to sync AI meeting summaries: " + error.message);
        }
    },
};
