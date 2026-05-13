import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";
import axios from "axios";
import { envVars } from "../../../config/env.js";

const verifyProjectOwnership = async (prisma, projectId, userId) => {
    const project = await prisma.project.findFirst({
        where: { id: projectId, managerId: userId, deletedAt: null },
        include: {
            manager: {
                select: { id: true, firstName: true, lastName: true, email: true }
            }
        }
    });
    if (!project) {
        throw new AppError(
            StatusCodes.FORBIDDEN,
            "You do not have access to this project",
        );
    }
    return project;
};

export const RaiddService = {
    createRaidd: async (prisma, payload, userId) => {
        const { aiDetectionId, type, ...raiddData } = payload;
        const project = await verifyProjectOwnership(prisma, raiddData.projectId, userId);

        const typesToCreate = Array.isArray(type) ? type : [type];
        let description = raiddData.description;

        // Try to get description from project's saved AI details if not provided in payload
        if (!description && project.projectAiDetails && typeof project.projectAiDetails === 'object') {
            const raiddFlags = project.projectAiDetails.raiddFlags;
            if (raiddFlags && typeof raiddFlags === 'object') {
                let aiItems = [];
                for (const t of typesToCreate) {
                    let items = [];
                    switch (t) {
                        case "RISK": items = raiddFlags.risks; break;
                        case "ASSUMPTION": items = raiddFlags.assumptions; break;
                        case "ISSUE": items = raiddFlags.issues; break;
                        case "DEPENDENCY": items = raiddFlags.dependencies; break;
                        case "DECISION": items = raiddFlags.decisions; break;
                    }
                    if (Array.isArray(items)) {
                        aiItems = [...aiItems, ...items];
                    }
                }
                if (aiItems.length > 0) {
                    const validItems = aiItems.filter(i => typeof i === 'string' && i.trim() !== '');
                    if (validItems.length > 0) {
                        description = validItems.map(item => `- ${item}`).join('\n');
                    }
                }
            }
        }

        const createdRaidd = await prisma.raidd.create({
            data: {
                ...raiddData,
                description: description || raiddData.description,
                type: typesToCreate,
                assumptionValidationDueDate: raiddData.assumptionValidationDueDate ? new Date(raiddData.assumptionValidationDueDate) : undefined,
                decisionDueDate: raiddData.decisionDueDate ? new Date(raiddData.decisionDueDate) : undefined,
                aiDetectionId: aiDetectionId || undefined,
                created_by: userId,
            }
        });

        await ActivityLogService.createLog(prisma, {
            type: "raidd",
            crudId: createdRaidd.id,
            action: "create",
            userId,
            projectId: createdRaidd.projectId,
        });

        // Trigger AI sync for THIS specific raidd record without awaiting it
        RaiddService.syncSingleRaiddFromAi(prisma, createdRaidd.id, userId).catch(error => {
            console.error("Background AI Sync for RAIDD failed:", error.message);
        });

        let aiDetection = null;
        if (aiDetectionId) {
            aiDetection = await prisma.aiDetection.findUnique({
                where: { id: aiDetectionId }
            });
        }

        if (aiDetection) {
            try {
                let newRaiddData = aiDetection.raiddData ? { ...aiDetection.raiddData } : null;
                let newRaiddAnalysis = aiDetection.raiddAnalysis ? (Array.isArray(aiDetection.raiddAnalysis) ? [ ...aiDetection.raiddAnalysis ] : aiDetection.raiddAnalysis) : null;
                let newFullAiResponse = aiDetection.fullAiResponse ? JSON.parse(JSON.stringify(aiDetection.fullAiResponse)) : null;

                for (const t of typesToCreate) {
                    let raiddKey = "";
                    let categoryToRemove = "";
                    switch (t) {
                        case "RISK": raiddKey = "risks"; categoryToRemove = "Risk"; break;
                        case "ASSUMPTION": raiddKey = "assumptions"; categoryToRemove = "Assumption"; break;
                        case "ISSUE": raiddKey = "issues"; categoryToRemove = "Issue"; break;
                        case "DEPENDENCY": raiddKey = "dependencies"; categoryToRemove = "Dependency"; break;
                        case "DECISION": raiddKey = "decisions"; categoryToRemove = "Decision"; break;
                    }

                    if (raiddKey) {
                        // 1. Update raiddData
                        if (newRaiddData && typeof newRaiddData === 'object') {
                            if (newRaiddData[raiddKey] !== undefined) delete newRaiddData[raiddKey];
                            if (newRaiddData[categoryToRemove] !== undefined) delete newRaiddData[categoryToRemove];
                            if (newRaiddData[categoryToRemove.toLowerCase()] !== undefined) delete newRaiddData[categoryToRemove.toLowerCase()];
                        }

                        // 2. Update raiddAnalysis array
                        if (Array.isArray(newRaiddAnalysis)) {
                            newRaiddAnalysis = newRaiddAnalysis.filter(item => 
                                typeof item === 'string' &&
                                item.toLowerCase() !== categoryToRemove.toLowerCase() &&
                                item.toLowerCase() !== raiddKey.toLowerCase()
                            );
                        }

                        // 3. Update fullAiResponse
                        if (newFullAiResponse) {
                            // Handle raiddAnalysis as object or array in full response
                            if (newFullAiResponse.raiddAnalysis) {
                                if (typeof newFullAiResponse.raiddAnalysis === 'object' && !Array.isArray(newFullAiResponse.raiddAnalysis)) {
                                    delete newFullAiResponse.raiddAnalysis[raiddKey];
                                    delete newFullAiResponse.raiddAnalysis[categoryToRemove];
                                } else if (Array.isArray(newFullAiResponse.raiddAnalysis)) {
                                    newFullAiResponse.raiddAnalysis = newFullAiResponse.raiddAnalysis.filter(item => 
                                        typeof item === 'string' &&
                                        item.toLowerCase() !== categoryToRemove.toLowerCase() &&
                                        item.toLowerCase() !== raiddKey.toLowerCase()
                                    );
                                }
                            }
                            
                            // Handle category array
                            if (Array.isArray(newFullAiResponse.category)) {
                                newFullAiResponse.category = newFullAiResponse.category.filter(item => 
                                    typeof item === 'string' &&
                                    item.toLowerCase() !== categoryToRemove.toLowerCase() &&
                                    item.toLowerCase() !== raiddKey.toLowerCase()
                                );
                            }

                            // Handle top-level keys if they exist (like in some AI responses)
                            if (newFullAiResponse[raiddKey] !== undefined) delete newFullAiResponse[raiddKey];
                        }
                    }
                }

                // Clean up empty objects/arrays
                if (newRaiddData && Object.keys(newRaiddData).length === 0) newRaiddData = null;
                if (newRaiddAnalysis && Array.isArray(newRaiddAnalysis) && newRaiddAnalysis.length === 0) newRaiddAnalysis = null;

                // Only delete if EVERYTHING is gone
                if (!newRaiddData && (!newRaiddAnalysis || newRaiddAnalysis.length === 0)) {
                    await prisma.aiDetection.delete({
                        where: { id: aiDetectionId },
                    });
                    console.log(`[RAIDD Creation] Auto-deleted full AI Detection record: ${aiDetectionId}`);
                } else {
                    await prisma.aiDetection.update({
                        where: { id: aiDetectionId },
                        data: {
                            raiddData: newRaiddData || {},
                            raiddAnalysis: newRaiddAnalysis || [],
                            fullAiResponse: newFullAiResponse
                        }
                    });
                    console.log(`[RAIDD Creation] Updated AI Detection record: removed selected types for ${aiDetectionId}`);
                }
            } catch (error) {
                console.error("Error auto-deleting/updating AI Detection after RAIDD creation:", error);
            }
        }

        // Populate individual models if we derived description from AI details
        if (project.projectAiDetails && typeof project.projectAiDetails === 'object' && project.projectAiDetails.raiddFlags) {
            await RaiddService.populateIndividualRaiddItems(prisma, createdRaidd.projectId, createdRaidd.id, project.projectAiDetails.raiddFlags, typesToCreate);
        }

        return createdRaidd;
    },
    getAllRaidds: async (prisma, projectId, userId) => {
        await verifyProjectOwnership(prisma, projectId, userId);

        const raidds = await prisma.raidd.findMany({
            where: { projectId, deleted_at: null },
            include: {
                project: {
                    select: {
                        name: true,
                        description: true,
                        clientName: true,
                        startDate: true,
                        endDate: true,
                        client: {
                            select: {
                                name: true,
                                email: true,
                                designation: true,
                                numberOfProjects: true,
                            },
                        },
                        manager: {
                            select: {
                                avatarUrl: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                        projectAiDetails: true,
                        weeklySummaryDate: true,
                    },
                },
            },
            orderBy: { created_at: "desc" },
        });

        return raidds.map(raidd => ({
            ...raidd,
            raisedBy: raidd.project?.manager ?? null,
        }));
    },

    getSingleRaidd: async (prisma, id, userId) => {
        const raidd = await prisma.raidd.findUnique({
            where: { id },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        clientName: true,
                        managerId: true,
                        deletedAt: true,
                        client: {
                            select: {
                                name: true,
                                email: true,
                                designation: true,
                                numberOfProjects: true,
                            },
                        },
                        manager: {
                            select: {
                                avatarUrl: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                        projectAiDetails: true,
                        weeklySummaryDate: true,
                    },
                },
            },
        });

        if (
            !raidd ||
            raidd.project.managerId !== userId ||
            raidd.project.deletedAt !== null ||
            raidd.deleted_at !== null
        ) {
            throw new AppError(
                StatusCodes.FORBIDDEN,
                "RAIDD record not found or access denied",
            );
        }

        return {
            ...raidd,
            raisedBy: raidd.project?.manager ?? null,
        };
    },

    updateRaidd: async (prisma, id, payload, userId) => {
        const raidd = await prisma.raidd.findUnique({
            where: { id },
            include: { project: true },
        });

        if (
            !raidd ||
            raidd.project.managerId !== userId ||
            raidd.project.deletedAt !== null ||
            raidd.deleted_at !== null
        ) {
            throw new AppError(
                StatusCodes.FORBIDDEN,
                "RAIDD record not found or access denied",
            );
        }

        const updatedRaidd = await prisma.raidd.update({
            where: { id },
            data: {
                ...payload,
                assumptionValidationDueDate: payload.assumptionValidationDueDate ? new Date(payload.assumptionValidationDueDate) : undefined,
                decisionDueDate: payload.decisionDueDate ? new Date(payload.decisionDueDate) : undefined,
                updated_by: userId,
            },
        });

        await ActivityLogService.createLog(prisma, {
            type: "raidd",
            crudId: id,
            action: "update",
            userId,
            projectId: raidd.projectId,
        });

        return updatedRaidd;
    },

    deleteRaidd: async (prisma, id, userId) => {
        const raidd = await prisma.raidd.findUnique({
            where: { id },
            include: { project: true },
        });

        if (
            !raidd ||
            raidd.project.managerId !== userId ||
            raidd.project.deletedAt !== null ||
            raidd.deleted_at !== null
        ) {
            throw new AppError(
                StatusCodes.FORBIDDEN,
                "RAIDD record not found or access denied",
            );
        }

        const deletedRaidd = await prisma.raidd.update({
            where: { id },
            data: {
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });

        await ActivityLogService.createLog(prisma, {
            type: "raidd",
            crudId: id,
            action: "delete",
            userId,
            projectId: raidd.projectId,
        });

        return deletedRaidd;
    },

    getAllMyRaidds: async (prisma, userId) => {
        return prisma.raidd.findMany({
            where: {
                project: {
                    managerId: userId,
                    deletedAt: null,
                },
                deleted_at: null,
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        clientName: true,
                        startDate: true,
                        endDate: true,
                        client: {
                            select: {
                                name: true,
                                email: true,
                                numberOfProjects: true,
                            },
                        },
                        projectAiDetails: true,
                        weeklySummaryDate: true,
                    },
                },
            },
            orderBy: { created_at: "desc" },
        });
    },

    syncSingleRaiddFromAi: async (prisma, raiddId, userId) => {
        console.log(`[RAIDD AI Sync] Sync for RAIDD ${raiddId} is now handled via AI Push API.`);
    },

    syncAllRaiddFromAi: async (prisma, projectsDataInput = null) => {
        console.log("[RAIDD AI Sync] Bulk sync is now handled via AI Push API.");
    },

    syncRaiddsForProjectFromAi: async (prisma, projectId, userId) => {
        try {
            console.log(`[RAIDD AI Sync] Sync for project ${projectId} is now handled via AI Push API.`);
            return;
        } catch (error) {
            console.error("RAIDD AI Sync failed:", error.message);
        }
    },

    syncIndividualItems: async (prisma, projectId, raiddFlags, raiddId = null, sourceIds = {}) => {
        try {
            const { emailId, outlookId, aiDetectionId } = sourceIds;
            const models = [
                { type: "RISK", key: "risks", model: "projectRisk" },
                { type: "ASSUMPTION", key: "assumptions", model: "projectAssumption" },
                { type: "ISSUE", key: "issues", model: "projectIssue" },
                { type: "DEPENDENCY", key: "dependencies", model: "projectDependency" },
                { type: "DECISION", key: "decisions", model: "projectDecision" }
            ];

            for (const { key, model } of models) {
                const items = raiddFlags[key];

                if (Array.isArray(items) && items.length > 0) {
                    for (const itemData of items) {
                        if (typeof itemData !== 'string' || itemData.trim() === '') continue;

                        // Check for duplicate in the context of this project and data
                        const exists = await prisma[model].findFirst({ where: { projectId, data: itemData } });
                        if (exists) {
                            // Update links if they are missing
                            const updateData = {};
                            if (raiddId && !exists.raiddId) updateData.raiddId = raiddId;
                            if (emailId && !exists.emailId) updateData.emailId = emailId;
                            if (outlookId && !exists.outlookId) updateData.outlookId = outlookId;
                            if (aiDetectionId && !exists.aiDetectionId) updateData.aiDetectionId = aiDetectionId;

                            if (Object.keys(updateData).length > 0) {
                                await prisma[model].update({
                                    where: { id: exists.id },
                                    data: updateData
                                });
                            }
                        } else {
                            await prisma[model].create({
                                data: {
                                    projectId,
                                    raiddId: raiddId || undefined,
                                    emailId: emailId || undefined,
                                    outlookId: outlookId || undefined,
                                    aiDetectionId: aiDetectionId || undefined,
                                    data: itemData
                                }
                            });
                        }
                    }
                }
            }
        } catch (err) {
            console.error(`[RAIDD Individual Sync] Failed to sync individual models:`, err.message);
        }
    },

    populateIndividualRaiddItems: async (prisma, projectId, raiddId, raiddFlags, types) => {
        // Filtering flags based on types if necessary, but usually we just sync all available flags
        await RaiddService.syncIndividualItems(prisma, projectId, raiddFlags, raiddId);
    }
};
