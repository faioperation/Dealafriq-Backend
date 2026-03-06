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
    return prisma.aiDetection.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
    });
};

const getAiDetectionById = async (prisma, id) => {
    const aiDetection = await prisma.aiDetection.findUnique({
        where: { id, deletedAt: null },
    });

    if (!aiDetection) {
        throw new AppError(StatusCodes.NOT_FOUND, "AI Detection record not found");
    }

    return aiDetection;
};

const updateAiDetection = async (prisma, id, payload, userId) => {
    const aiDetection = await prisma.aiDetection.findUnique({
        where: { id, deletedAt: null },
    });

    if (!aiDetection) {
        throw new AppError(StatusCodes.NOT_FOUND, "AI Detection record not found");
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
    const aiDetection = await prisma.aiDetection.findUnique({
        where: { id, deletedAt: null },
    });

    if (!aiDetection) {
        throw new AppError(StatusCodes.NOT_FOUND, "AI Detection record not found");
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
