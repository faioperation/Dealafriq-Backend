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

export const ProjectHealthService = {
    upsertHealth: async (prisma, payload, userId) => {
        await verifyProjectOwnership(prisma, payload.projectId, userId);

        const { projectId, health } = payload;

        const result = await prisma.$transaction(async (tx) => {
            // Delete existing health records
            await tx.projectHealth.deleteMany({
                where: { projectId },
            });

            // Bulk create new records
            return tx.projectHealth.createMany({
                data: health.map(h => ({
                    projectId,
                    type: h.field,
                    healthStatus: h.healthStatus,
                    score: h.score,
                    status: h.status,
                })),
            });
        });

        await ActivityLogService.createLog(prisma, {
            type: "projectHealth",
            crudId: projectId,
            action: "update",
            userId,
            projectId: projectId,
        });

        return result;
    },

    getHealthByProjectId: async (prisma, projectId, userId) => {
        await verifyProjectOwnership(prisma, projectId, userId);

        return prisma.projectHealth.findMany({
            where: { projectId },
            orderBy: { createdAt: "desc" },
        });
    },

    deleteHealthByProjectId: async (prisma, projectId, userId) => {
        await verifyProjectOwnership(prisma, projectId, userId);

        return prisma.projectHealth.deleteMany({
            where: { projectId },
        });
    },
};
