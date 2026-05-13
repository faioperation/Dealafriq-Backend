import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";
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
            try { parsedKeyPoints = JSON.parse(keyPoints); } catch (e) { }
        }
        if (typeof actionPoints === 'string') {
            try { parsedActionPoints = JSON.parse(actionPoints); } catch (e) { }
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
            select: {
                id: true,
                title: true,
                projectId: true,
                meetingDate: true,
                createdAt: true,
                lastMeetingSummary: true,
                notes: true,
                agenda: true,
                aiMeetingSummary: true,
                project: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                keyPoints: {
                    select: {
                        id: true,
                        content: true,
                        status: true,
                    }
                },
                actionPoints: {
                    select: {
                        id: true,
                        content: true,
                        status: true,
                    }
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return meetings;
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
                select: {
                    id: true,
                    projectId: true,
                    title: true,
                    meetingDate: true,
                    createdAt: true,
                    lastMeetingSummary: true,
                    notes: true,
                    agenda: true,
                    aiMeetingSummary: true,
                    project: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                    keyPoints: {
                        select: {
                            id: true,
                            content: true,
                            status: true,
                        }
                    },
                    actionPoints: {
                        select: {
                            id: true,
                            content: true,
                            status: true,
                        }
                    },
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
            select: {
                id: true,
                projectId: true,
                title: true,
                meetingDate: true,
                createdAt: true,
                lastMeetingSummary: true,
                notes: true,
                agenda: true,
                aiMeetingSummary: true,
                project: {
                    select: {
                        id: true,
                        name: true,
                        managerId: true,
                        deletedAt: true,
                    }
                },
                keyPoints: {
                    select: {
                        id: true,
                        content: true,
                        status: true,
                    }
                },
                actionPoints: {
                    select: {
                        id: true,
                        content: true,
                        status: true,
                    }
                },
            },
        });

        if (
            !meeting ||
            meeting.project.managerId !== userId ||
            meeting.project.deletedAt !== null
        ) {
            throw new AppError(StatusCodes.FORBIDDEN, "Meeting not found or access denied");
        }

        // Clean up internal authorization fields before returning
        delete meeting.project.managerId;
        delete meeting.project.deletedAt;

        return meeting;
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

}
