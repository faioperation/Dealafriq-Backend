import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";

const verifyProjectOwnership = async (prisma, projectId, userId) => {
    const project = await prisma.project.findFirst({
        where: { id: projectId, managerId: userId, deletedAt: null },
    });
    if (!project) {
        throw new AppError(
            StatusCodes.FORBIDDEN,
            "You do not have access to this project"
        );
    }
    return project;
};

export const LessonLearnService = {
    createLessonLearn: async (prisma, payload, userId) => {
        await verifyProjectOwnership(prisma, payload.projectId, userId);

        const lessonLearn = await prisma.lessonLearn.create({
            data: {
                ...payload,
                loggedDate: payload.loggedDate ? new Date(payload.loggedDate) : new Date(),
                created_by: userId,
            },
        });

        await ActivityLogService.createLog(prisma, {
            type: "lessonLearn",
            crudId: lessonLearn.id,
            action: "create",
            userId,
            projectId: lessonLearn.projectId,
        });

        return lessonLearn;
    },

    getAllLessonLearns: async (prisma, projectId, userId) => {
        await verifyProjectOwnership(prisma, projectId, userId);

        return prisma.lessonLearn.findMany({
            where: { projectId, deleted_at: null },
            include: {
                project: {
                    select: {
                        name: true,
                        managerId: true,
                    },
                },
            },
            orderBy: { created_at: "desc" },
        });
    },

    getSingleLessonLearn: async (prisma, id, userId) => {
        const lessonLearn = await prisma.lessonLearn.findUnique({
            where: { id },
            include: {
                project: {
                    select: {
                        id: true,
                        managerId: true,
                        deletedAt: true,
                    },
                },
            },
        });

        if (
            !lessonLearn ||
            lessonLearn.project.managerId !== userId ||
            lessonLearn.project.deletedAt !== null ||
            lessonLearn.deleted_at !== null
        ) {
            throw new AppError(
                StatusCodes.FORBIDDEN,
                "LessonLearn record not found or access denied"
            );
        }

        return lessonLearn;
    },

    updateLessonLearn: async (prisma, id, payload, userId) => {
        const lessonLearn = await prisma.lessonLearn.findUnique({
            where: { id },
            include: { project: true },
        });

        if (
            !lessonLearn ||
            lessonLearn.project.managerId !== userId ||
            lessonLearn.project.deletedAt !== null ||
            lessonLearn.deleted_at !== null
        ) {
            throw new AppError(
                StatusCodes.FORBIDDEN,
                "LessonLearn record not found or access denied"
            );
        }
        
        let updateData = { ...payload, updated_by: userId };
        if (payload.loggedDate) {
            updateData.loggedDate = new Date(payload.loggedDate);
        }

        const updatedLessonLearn = await prisma.lessonLearn.update({
            where: { id },
            data: updateData,
        });

        await ActivityLogService.createLog(prisma, {
            type: "lessonLearn",
            crudId: id,
            action: "update",
            userId,
            projectId: lessonLearn.projectId,
        });

        return updatedLessonLearn;
    },

    deleteLessonLearn: async (prisma, id, userId) => {
        const lessonLearn = await prisma.lessonLearn.findUnique({
            where: { id },
            include: { project: true },
        });

        if (
            !lessonLearn ||
            lessonLearn.project.managerId !== userId ||
            lessonLearn.project.deletedAt !== null ||
            lessonLearn.deleted_at !== null
        ) {
            throw new AppError(
                StatusCodes.FORBIDDEN,
                "LessonLearn record not found or access denied"
            );
        }

        const deletedLessonLearn = await prisma.lessonLearn.update({
            where: { id },
            data: {
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });

        await ActivityLogService.createLog(prisma, {
            type: "lessonLearn",
            crudId: id,
            action: "delete",
            userId,
            projectId: lessonLearn.projectId,
        });

        return deletedLessonLearn;
    },
};
