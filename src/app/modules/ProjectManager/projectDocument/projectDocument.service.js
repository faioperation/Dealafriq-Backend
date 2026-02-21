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

export const ProjectDocumentService = {
    // Project Documents (General)
    uploadDocuments: async (prisma, payloads, userId) => {
        if (!payloads || payloads.length === 0) return [];

        // Use the first payload to verify ownership (all should have the same projectId)
        await verifyProjectOwnership(prisma, payloads[0].projectId, userId);

        // We use a transaction or just map multiple creates to get returning data
        return Promise.all(payloads.map(payload =>
            prisma.projectDocumentUpload.create({
                data: payload,
            })
        ));
    },

    getAllDocuments: async (prisma, projectId, userId) => {
        await verifyProjectOwnership(prisma, projectId, userId);

        return prisma.projectDocumentUpload.findMany({
            where: { projectId },
            orderBy: { createdAt: "desc" },
        });
    },

    deleteDocument: async (prisma, id, userId) => {
        const doc = await prisma.projectDocumentUpload.findUnique({
            where: { id },
            include: { project: true },
        });

        if (!doc || doc.project.managerId !== userId || doc.project.deletedAt !== null) {
            throw new AppError(StatusCodes.FORBIDDEN, "Document not found or access denied");
        }

        return prisma.projectDocumentUpload.delete({
            where: { id },
        });
    },


};
