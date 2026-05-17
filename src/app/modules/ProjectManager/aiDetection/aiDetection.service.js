import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";

const createAiDetection = async (prisma, payload, userId) => {
    const { title, sourceType, raiddAnalysis, raiddData, emailId, outlookId } = payload;
    const aiDetection = await prisma.aiDetection.create({
        data: {
            title,
            sourceType,
            raiddAnalysis,
            raiddData,
            emailId,
            outlookId,
            managerId: userId,
            createdBy: userId,
        },
        select: {
            id: true,
            title: true,
            sourceType: true,
            raiddAnalysis: true,
            raiddData: true,
            createdAt: true,
            updatedAt: true,
            emailId: true,
            outlookId: true
        }
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
    const detections = await prisma.aiDetection.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            title: true,
            sourceType: true,
            raiddAnalysis: true,
            raiddData: true,
            createdAt: true,
            updatedAt: true,
            emailId: true,
            outlookId: true
        }
    });

    return detections.filter(d => d.raiddAnalysis && Array.isArray(d.raiddAnalysis) && d.raiddAnalysis.length > 0);
};

const getAiDetectionById = async (prisma, id, userId = null) => {
    const where = { id, deletedAt: null };
    if (userId) {
        where.managerId = userId;
    }
    const aiDetection = await prisma.aiDetection.findFirst({
        where,
        select: {
            id: true,
            title: true,
            sourceType: true,
            raiddAnalysis: true,
            raiddData: true,
            createdAt: true,
            updatedAt: true,
            emailId: true,
            outlookId: true
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

    const { title, sourceType, raiddAnalysis, raiddData, emailId, outlookId } = payload;
    const updatedAiDetection = await prisma.aiDetection.update({
        where: { id },
        data: {
            title: title !== undefined ? title : undefined,
            sourceType: sourceType !== undefined ? sourceType : undefined,
            raiddAnalysis: raiddAnalysis !== undefined ? raiddAnalysis : undefined,
            raiddData: raiddData !== undefined ? raiddData : undefined,
            emailId: emailId !== undefined ? emailId : undefined,
            outlookId: outlookId !== undefined ? outlookId : undefined,
            updatedBy: userId,
        },
        select: {
            id: true,
            title: true,
            sourceType: true,
            raiddAnalysis: true,
            raiddData: true,
            createdAt: true,
            updatedAt: true,
            emailId: true,
            outlookId: true
        }
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
