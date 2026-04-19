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
        // Trigger AI sync in the background
        ProjectMeetingService.syncAiMeetingSummary(prisma, userId).catch(error => {
            console.error("Background AI Sync failed:", error.message);
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

    syncAiMeetingSummary: async (prisma, userId) => {
        try {
            // Wait 5 seconds to ensure the meeting creation is propagated to the AI system
            await new Promise(resolve => setTimeout(resolve, 5000));

            const response = await axios.post(`${envVars.API_AI}/summary/meeting`, {}, {
                headers: {
                  'x-backend-service': envVars.AI_SERVICE_SECRET
                }
            });
            const projectsData = response.data;
            
           console.log(
  "=== AI API Response Data for Meetings 🧑‍💼 ===\n",
  JSON.stringify(projectsData, null, 2)
);

            let updatedCount = 0;

            if (!Array.isArray(projectsData)) {
                throw new AppError(StatusCodes.BAD_REQUEST, "Invalid response from AI API");
            }

            for (const projectItem of projectsData) {
                const { meetings, projectId } = projectItem;
                if (!meetings || !Array.isArray(meetings)) continue;

                for (const aiMeeting of meetings) {
                    const { meetingId, summary, actionPoints, discussionPoints, notes, agenda } = aiMeeting;

                    // check if meeting exists
                    const meetingExists = await prisma.projectMeeting.findUnique({
                        where: { id: meetingId },
                        include: { project: true }
                    });

                    if (meetingExists) {
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

                        updatedCount++;
                    }
                }
            }
            return { updatedCount, message: `Successfully updated ${updatedCount} meetings with AI summaries.` };
        } catch (error) {
            throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to sync AI meeting summaries: " + error.message);
        }
    },
};
