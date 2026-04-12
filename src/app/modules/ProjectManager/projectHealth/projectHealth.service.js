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
    calculateAndUpsertHealth: async (prisma, projectId, userProvidedHealth = []) => {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { projectProgress: true }
        });

        if (!project) return null;

        const progressStr = project.projectProgress || "0%";
        const progress = parseInt(progressStr.replace("%", ""), 10) || 0;

        // Dynamic Status Calculation Logic
        const calculateOverallStatus = (p) => {
            if (p <= 40) return "AT_RISK";
            if (p <= 50) return "LOW";
            if (p <= 70) return "ON_TRACK";
            if (p <= 80) return "GOOD";
            return "EXCELLENT";
        };

        const calculateTaskStatus = (p) => {
            if (p <= 40) return "BAD";
            if (p <= 70) return "NORMAL";
            return "PERFECT";
        };

        const overallHealthStatus = calculateOverallStatus(progress);
        const taskHealthStatus = calculateTaskStatus(progress);

        // Map fixed types and preserve score/status if provided
        const fixedHealthParams = [
            { type: "OVERALL_STATUS", healthStatus: overallHealthStatus },
            { type: "TASK_STATUS", healthStatus: taskHealthStatus },
        ];

        const finalHealthData = fixedHealthParams.map(fixed => {
            const userProvided = userProvidedHealth?.find(h => h.field === fixed.type) || {};
            return {
                projectId,
                type: fixed.type,
                healthStatus: fixed.healthStatus,
                score: userProvided.score,
                status: userProvided.status,
            };
        });

        return prisma.$transaction(async (tx) => {
            // Delete existing health records for this project
            await tx.projectHealth.deleteMany({
                where: { projectId },
            });

            // Create fixed records
            return tx.projectHealth.createMany({
                data: finalHealthData,
            });
        });
    },

    upsertHealth: async (prisma, payload, userId) => {
        await verifyProjectOwnership(prisma, payload.projectId, userId);

        const { projectId, health } = payload;
        const result = await ProjectHealthService.calculateAndUpsertHealth(prisma, projectId, health);

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
