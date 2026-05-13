import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";

const createAiDetection = async (prisma, payload, userId) => {
    const aiDetection = await prisma.aiDetection.create({
        data: {
            ...payload,
            createdBy: userId,
        },
    });

    await ActivityLogService.createLog(prisma, {
        type: "ai-detection",
        crudId: aiDetection.id,
        action: "create",
        userId,
    });

    return aiDetection;
};

const getAllAiDetections = async (prisma, userId) => {
    const where = { deletedAt: null };
    if (userId) {
        where.managerId = userId;
    }
    return prisma.aiDetection.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            projectRisks: true,
            projectAssumptions: true,
            projectIssues: true,
            projectDecisions: true,
            projectDependencies: true,
            email: true,
            outlook: true
        }
    });
};

const getAiDetectionById = async (prisma, id, userId = null) => {
    const where = { id, deletedAt: null };
    if (userId) {
        where.managerId = userId;
    }
    const aiDetection = await prisma.aiDetection.findFirst({
        where,
        include: {
            projectRisks: true,
            projectAssumptions: true,
            projectIssues: true,
            projectDecisions: true,
            projectDependencies: true,
            email: true,
            outlook: true
        }
    });

    if (!aiDetection) {
        throw new AppError(StatusCodes.NOT_FOUND, "AI Detection record not found or access denied");
    }

    return aiDetection;
};

const updateAiDetection = async (prisma, id, payload, userId) => {
    const aiDetection = await prisma.aiDetection.findFirst({
        where: { id, managerId: userId, deletedAt: null },
    });

    if (!aiDetection) {
        throw new AppError(StatusCodes.NOT_FOUND, "AI Detection record not found or access denied");
    }

    const updatedAiDetection = await prisma.aiDetection.update({
        where: { id },
        data: {
            ...payload,
            updatedBy: userId,
        },
    });

    await ActivityLogService.createLog(prisma, {
        type: "ai-detection",
        crudId: id,
        action: "update",
        userId,
    });

    return updatedAiDetection;
};

const deleteAiDetection = async (prisma, id, userId) => {
    const aiDetection = await prisma.aiDetection.findFirst({
        where: { id, managerId: userId, deletedAt: null },
    });

    if (!aiDetection) {
        throw new AppError(StatusCodes.NOT_FOUND, "AI Detection record not found or access denied");
    }

    // Soft delete
    const deletedAiDetection = await prisma.aiDetection.update({
        where: { id },
        data: {
            deletedAt: new Date(),
            deletedBy: userId,
        },
    });

    await ActivityLogService.createLog(prisma, {
        type: "ai-detection",
        crudId: id,
        action: "delete",
        userId,
    });

    return deletedAiDetection;
};

export const AiDetectionService = {
    createAiDetection,
    getAllAiDetections,
    getAiDetectionById,
    updateAiDetection,
    deleteAiDetection,
};
