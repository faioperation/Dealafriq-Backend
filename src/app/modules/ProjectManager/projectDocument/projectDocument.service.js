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

const normalizeStatus = (status, type) => {
    if (!status) return undefined;
    const normalized = status.trim().replace(/\s+/g, "_").toUpperCase();

    if (type === "keyPoint") {
        const valid = ["VALIDATED", "TO_BE_VALIDATED"];
        return valid.includes(normalized) ? normalized : undefined;
    } else if (type === "actionPoint") {
        const valid = ["PENDING", "IN_PROGRESS", "COMPLETED"];
        return valid.includes(normalized) ? normalized : undefined;
    }
    return normalized;
};

export const ProjectDocumentService = {
    // Project Documents (General)
    uploadDocuments: async (prisma, payloads, userId) => {
        if (!payloads || payloads.length === 0) return [];

        // Use the first payload to verify ownership (all should have the same projectId)
        await verifyProjectOwnership(prisma, payloads[0].projectId, userId);

        // We use a transaction or just map multiple creates to get returning data
        return Promise.all(payloads.map(payload => {
            const { keyPoints, actionPoints, ...docData } = payload;

            const nestedData = { ...docData };

            if (keyPoints && Array.isArray(keyPoints)) {
                const validPoints = keyPoints.flat().filter(kp => kp && kp.content);
                if (validPoints.length > 0) {
                    nestedData.keyPoints = {
                        create: validPoints.map(kp => ({
                            content: kp.content,
                            status: normalizeStatus(kp.status, "keyPoint") || "TO_BE_VALIDATED"
                        }))
                    };
                }
            }

            if (actionPoints && Array.isArray(actionPoints)) {
                const validPoints = actionPoints.flat().filter(ap => ap && ap.content);
                if (validPoints.length > 0) {
                    nestedData.actionPoints = {
                        create: validPoints.map(ap => ({
                            content: ap.content,
                            status: normalizeStatus(ap.status, "actionPoint") || "PENDING"
                        }))
                    };
                }
            }

            return prisma.projectDocumentUpload.create({
                data: nestedData,
                include: {
                    keyPoints: true,
                    actionPoints: true,
                }
            });
        }));
    },

    getAllDocuments: async (prisma, projectId, userId) => {
        await verifyProjectOwnership(prisma, projectId, userId);

        return prisma.projectDocumentUpload.findMany({
            where: { projectId },
            include: {
                keyPoints: true,
                actionPoints: true,
            },
            orderBy: { createdAt: "desc" },
        });
    },

    updateDocument: async (prisma, id, payload, userId) => {
        const doc = await prisma.projectDocumentUpload.findUnique({
            where: { id },
            include: { project: true },
        });

        if (!doc || doc.project.managerId !== userId || doc.project.deletedAt !== null) {
            throw new AppError(StatusCodes.FORBIDDEN, "Document not found or access denied");
        }

        const { keyPoints, actionPoints, ...updateData } = payload;

        const nestedOps = {};

        if (keyPoints && Array.isArray(keyPoints)) {
            const points = keyPoints.flat();
            nestedOps.keyPoints = {
                update: points.filter(kp => kp.id).map(kp => {
                    const data = {};
                    if (kp.content !== undefined) data.content = kp.content;
                    if (kp.status !== undefined) data.status = normalizeStatus(kp.status, "keyPoint");

                    return {
                        where: { id: kp.id },
                        data
                    };
                }),
                create: points.filter(kp => !kp.id && kp.content).map(kp => ({
                    content: kp.content,
                    status: normalizeStatus(kp.status, "keyPoint") || "TO_BE_VALIDATED"
                }))
            };
        }

        if (actionPoints && Array.isArray(actionPoints)) {
            const points = actionPoints.flat();
            nestedOps.actionPoints = {
                update: points.filter(ap => ap.id).map(ap => {
                    const data = {};
                    if (ap.content !== undefined) data.content = ap.content;
                    if (ap.status !== undefined) data.status = normalizeStatus(ap.status, "actionPoint");

                    return {
                        where: { id: ap.id },
                        data
                    };
                }),
                create: points.filter(ap => !ap.id && ap.content).map(ap => ({
                    content: ap.content,
                    status: normalizeStatus(ap.status, "actionPoint") || "PENDING"
                }))
            };
        }

        return prisma.projectDocumentUpload.update({
            where: { id },
            data: {
                ...updateData,
                ...nestedOps
            },
            include: {
                keyPoints: true,
                actionPoints: true,
            }
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
