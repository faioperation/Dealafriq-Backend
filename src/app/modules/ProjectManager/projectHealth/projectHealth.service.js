import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";

const verifyProjectOwnership = async (prisma, projectId, userId) => {
    const project = await prisma.project.findFirst({
        where: { id: projectId, managerId: userId, deletedAt: null },
    });
    if (!project) {
        throw new AppError(StatusCodes.FORBIDDEN, "You do not have access to this project");
    }
    return project;
};

export const ProjectHealthService = {
    updateHealth: async (prisma, payload, userId) => {
        await verifyProjectOwnership(prisma, payload.projectId, userId);

        return prisma.projectHealth.upsert({
            where: {
                projectId: payload.projectId,
            },
            update: {
                overallStatus: payload.overallStatus,
                budgetStatus: payload.budgetStatus,
                teamSentiment: payload.teamSentiment,
                score: payload.score,
                status: payload.status,
            },
            create: payload,
        });
    },

    updateHealthById: async (prisma, id, payload, userId) => {
        const health = await prisma.projectHealth.findUnique({
            where: { id },
            include: { project: true },
        });

        if (!health || health.project.managerId !== userId || health.project.deletedAt !== null) {
            throw new AppError(StatusCodes.FORBIDDEN, "Health record not found or access denied");
        }

        return prisma.projectHealth.update({
            where: { id },
            data: payload,
        });
    },

    getHealth: async (prisma, projectId, userId) => {
        await verifyProjectOwnership(prisma, projectId, userId);

        return prisma.projectHealth.findUnique({
            where: { projectId },
        });
    },

    getSingleHealth: async (prisma, id, userId) => {
        const health = await prisma.projectHealth.findUnique({
            where: { id },
            include: { project: true },
        });

        if (!health || health.project.managerId !== userId || health.project.deletedAt !== null) {
            throw new AppError(StatusCodes.FORBIDDEN, "Health record not found or access denied");
        }

        return health;
    },

    deleteHealth: async (prisma, id, userId) => {
        const health = await prisma.projectHealth.findUnique({
            where: { id },
            include: { project: true },
        });

        if (!health || health.project.managerId !== userId || health.project.deletedAt !== null) {
            throw new AppError(StatusCodes.FORBIDDEN, "Health record not found or access denied");
        }

        return prisma.projectHealth.delete({
            where: { id },
        });
    },
};
