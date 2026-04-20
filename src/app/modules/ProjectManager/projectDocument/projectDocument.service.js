import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";
import axios from "axios";
import { envVars } from "../../../config/env.js";

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
        const project = await verifyProjectOwnership(prisma, payloads[0].projectId, userId);

        // We use a transaction or just map multiple creates to get returning data
        const results = await Promise.all(payloads.map(async (payload) => {
            if (payload.setDate && project.startDate) {
                const dSet = new Date(payload.setDate);
                const dStart = new Date(project.startDate);
                dSet.setUTCHours(0, 0, 0, 0);
                dStart.setUTCHours(0, 0, 0, 0);
                if (dSet < dStart) {
                    throw new AppError(StatusCodes.BAD_REQUEST, "Document set date can not be before project start date");
                }
            }

            const { keyPoints, actionPoints, ...docData } = payload;

            const nestedData = {
                ...docData,
                title: docData.title || docData.fileName || "Untitled Document",
                setDate: payload.setDate ? new Date(payload.setDate) : undefined
            };

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

            const doc = await prisma.projectDocumentUpload.create({
                data: nestedData,
                include: {
                    keyPoints: true,
                    actionPoints: true,
                }
            });

            await ActivityLogService.createLog(prisma, {
                type: "document",
                crudId: doc.id,
                action: "create",
                userId,
                projectId: doc.projectId,
            });

            return doc;
        }));

        // Fire and forget (Background Task)
        ProjectDocumentService.syncDocumentAiSummaryBackground(prisma, results.map(doc => doc.id), userId).catch(err => {
            console.error("Critical error in document background AI sync:", err);
        });

        return results;
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

        const updatedDoc = await prisma.projectDocumentUpload.update({
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

        await ActivityLogService.createLog(prisma, {
            type: "document",
            crudId: id,
            action: "update",
            userId,
            projectId: doc.projectId,
        });

        return updatedDoc;
    },

    deleteDocument: async (prisma, id, userId) => {
        const doc = await prisma.projectDocumentUpload.findUnique({
            where: { id },
            include: { project: true },
        });

        if (!doc || doc.project.managerId !== userId || doc.project.deletedAt !== null) {
            throw new AppError(StatusCodes.FORBIDDEN, "Document not found or access denied");
        }

        const deletedDoc = await prisma.projectDocumentUpload.delete({
            where: { id },
        });

        await ActivityLogService.createLog(prisma, {
            type: "document",
            crudId: id,
            action: "delete",
            userId,
            projectId: doc.projectId,
        });

        return deletedDoc;
    },

    syncAllDocumentsFromAi: async (prisma) => {
        try {
            const apiUrl = `${envVars.API_AI}/summary/document`;
            const response = await axios.post(apiUrl, {}, {
                headers: {
                    'x-backend-service': "PROJECT_AI_BACKEND"
                }
            });

            const projectsData = response.data;
            if (!Array.isArray(projectsData)) {
                console.error("Invalid AI API response for bulk document sync");
                return [];
            }

            const updatedIds = [];

            for (const aiProject of projectsData) {
                const { documents } = aiProject;
                if (!Array.isArray(documents)) continue;

                for (const doc of documents) {
                    const { documentId, summary } = doc;
                    if (!documentId) continue;

                    const docExists = await prisma.projectDocumentUpload.findUnique({
                        where: { id: documentId }
                    });

                    if (docExists && summary) {
                        await prisma.projectDocumentUpload.update({
                            where: { id: documentId },
                            data: { aiDocumentSummary: summary }
                        });
                        updatedIds.push(documentId);
                    }
                }
            }
            console.log(`Bulk Document AI Sync completed successfully. ${updatedIds.length} documents updated.`);
            return updatedIds;
        } catch (error) {
            console.error("Bulk Document AI Sync failed:", error.message);
            return [];
        }
    },

    syncDocumentAiSummaryBackground: async (prisma, documentIds, userId) => {
        let remainingIds = [...documentIds];
        const delays = [15000, 30000, 45000, 60000, 60000]; // 15s, 30s, 45s, 60s, 60s

        for (let attempt = 0; attempt < delays.length; attempt++) {
            if (remainingIds.length === 0) break;

            try {
                console.log(`[Document AI Sync] Attempt ${attempt + 1} for ${remainingIds.length} documents starting in ${delays[attempt] / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delays[attempt]));

                const updatedIds = await ProjectDocumentService.syncAllDocumentsFromAi(prisma);
                
                // Filter out IDs that have been successfully updated
                remainingIds = remainingIds.filter(id => !updatedIds.includes(id));

                if (remainingIds.length === 0) {
                    console.log(`[Document AI Sync] All documents updated successfully on attempt ${attempt + 1}.`);
                    break;
                } else {
                    console.log(`[Document AI Sync] Attempt ${attempt + 1} completed. ${remainingIds.length} documents still waiting for AI data.`);
                }
            } catch (error) {
                console.error(`[Document AI Sync] Critical error in attempt ${attempt + 1}:`, error);
            }

            if (attempt === delays.length - 1 && remainingIds.length > 0) {
                console.warn(`[Document AI Sync] All ${delays.length} attempts failed for documents: ${remainingIds.join(", ")}`);
            }
        }
    },

};
