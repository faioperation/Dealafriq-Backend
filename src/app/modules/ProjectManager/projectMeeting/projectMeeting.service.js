import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";

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
    createMeeting: async (prisma, payload, userId) => {
        await verifyProjectOwnership(prisma, payload.projectId, userId);

        const { keyPoints, actionPoints, ...meetingData } = payload;

        const meeting = await prisma.projectMeeting.create({
            data: {
                ...meetingData,
                title: payload.title || "Project Meeting",
                meetingDate: payload.meetingDate ? new Date(payload.meetingDate) : new Date(),
                keyPoints: keyPoints ? {
                    create: keyPoints.map(kp => ({
                        content: kp.content,
                        status: normalizeStatus(kp.status, "keyPoint") || "TO_BE_VALIDATED"
                    }))
                } : undefined,
                actionPoints: actionPoints ? {
                    create: actionPoints.map(ap => ({
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

        return meeting;
    },

    getAllMeetings: async (prisma, projectId, userId) => {
        await verifyProjectOwnership(prisma, projectId, userId);

        return prisma.projectMeeting.findMany({
            where: { projectId },
            include: {
                keyPoints: true,
                actionPoints: true,
            },
            orderBy: { meetingDate: "desc" },
        });
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
};
