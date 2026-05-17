import prisma from "../../../prisma/client.js";
import { QueryBuilder } from "../../../utils/QueryBuilder.js";

/**
 * Get all project documents for AI
 */
const getAllDocumentsForAi = async () => {
    return await prisma.projectDocumentUpload.findMany({
        orderBy: {
            createdAt: 'desc'
        },
        select: {
            id: true,
            projectId: true,
            title: true,
            fileName: true,
            fileUrl: true,
            filePath: true,
            createdAt: true,
        },
    });
};

/**
 * Get a single project document by ID
 */
const getSingleDocument = async (id) => {
    return await prisma.projectDocumentUpload.findUnique({
        where: { id },
        select: {
            id: true,
            projectId: true,
            title: true,
            fileName: true,
            fileUrl: true,
            filePath: true,
            createdAt: true,
        },
    });
};

export const DocumentService = {
    getAllDocumentsForAi,
    getSingleDocument
};
