import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";

const verifyProjectOwnership = async (prisma, projectId, userId) => {
    const project = await prisma.project.findFirst({
        where: { id: projectId, managerId: userId, deletedAt: null },
    });
    if (!project) {
        throw new AppError(StatusCodes.FORBIDDEN, "Project not found or access denied");
    }
    return project;
};

export const ProjectAgreementService = {
    uploadAgreements: async (prisma, payloads, userId) => {
        if (!payloads || payloads.length === 0) return [];

        await verifyProjectOwnership(prisma, payloads[0].projectId, userId);

        return Promise.all(payloads.map(payload =>
            prisma.projectAgreements.create({
                data: {
                    projectId: payload.projectId,
                    fileName: payload.fileName,
                    fileUrl: payload.fileUrl,
                    filePath: payload.filePath,
                    fileType: payload.fileType || "SLA",
                },
            })
        ));
    },

    getAllAgreements: async (prisma, projectId, userId) => {
        await verifyProjectOwnership(prisma, projectId, userId);

        return prisma.projectAgreements.findMany({
            where: { projectId },
            orderBy: { createdAt: "desc" },
        });
    },

    getSingleAgreement: async (prisma, id, userId) => {
        const agreement = await prisma.projectAgreements.findUnique({
            where: { id },
            include: { project: true },
        });

        if (!agreement || agreement.project.managerId !== userId || agreement.project.deletedAt !== null) {
            throw new AppError(StatusCodes.FORBIDDEN, "Agreement not found or access denied");
        }

        return agreement;
    },

    deleteAgreement: async (prisma, id, userId) => {
        const agreement = await prisma.projectAgreements.findUnique({
            where: { id },
            include: { project: true },
        });

        if (!agreement || agreement.project.managerId !== userId || agreement.project.deletedAt !== null) {
            throw new AppError(StatusCodes.FORBIDDEN, "Agreement not found or access denied");
        }

        return prisma.projectAgreements.delete({
            where: { id },
        });
    },
};
