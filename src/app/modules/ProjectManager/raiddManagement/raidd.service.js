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
        throw new AppError(
            StatusCodes.FORBIDDEN,
            "You do not have access to this project",
        );
    }
    return project;
};

export const RaiddService = {
    createRaidd: async (prisma, payload, userId) => {
        const { aiDetectionId, ...raiddData } = payload;

        await verifyProjectOwnership(prisma, raiddData.projectId, userId);

        const raidd = await prisma.raidd.create({
            data: {
                ...raiddData,
                assumptionValidationDueDate: raiddData.assumptionValidationDueDate ? new Date(raiddData.assumptionValidationDueDate) : undefined,
                decisionDueDate: raiddData.decisionDueDate ? new Date(raiddData.decisionDueDate) : undefined,
                created_by: userId,
            },
        });

        // If this RAIDD was created from an AI Detection, auto-delete the detection record
        if (aiDetectionId) {
            try {
                await prisma.aiDetection.delete({
                    where: { id: aiDetectionId },
                });
                console.log(`[RAIDD Creation] Auto-deleted AI Detection record: ${aiDetectionId}`);
            } catch (error) {
                console.error(`[RAIDD Creation] Failed to auto-delete AI Detection ${aiDetectionId}:`, error.message);
                // We don't throw here to avoid failing the RAIDD creation if only the deletion fails
            }
        }

        await ActivityLogService.createLog(prisma, {
            type: "raidd",
            crudId: raidd.id,
            action: "create",
            userId,
            projectId: raidd.projectId,
        });

        // Trigger AI sync for THIS specific raidd record without awaiting it
        RaiddService.syncSingleRaiddFromAi(prisma, raidd.id, userId).catch(error => {
            console.error("Background AI Sync for RAIDD failed:", error.message);
        });

        return raidd;
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
                        vendorName: true,
                        startDate: true,
                        endDate: true,
                        vendor: {
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
                        vendorName: true,
                        managerId: true,
                        deletedAt: true,
                        vendor: {
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
                        vendorName: true,
                        startDate: true,
                        endDate: true,
                        vendor: {
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
        const delays = [15000, 30000, 45000, 60000, 60000]; // 15s, 30s, 45s, 60s, 60s

        for (let attempt = 0; attempt < delays.length; attempt++) {
            try {
                console.log(`[RAIDD AI Sync] Attempt ${attempt + 1} for RAIDD ${raiddId} starting in ${delays[attempt] / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delays[attempt]));

                const raidd = await prisma.raidd.findUnique({
                    where: { id: raiddId, deleted_at: null },
                    include: { project: true }
                });

                if (!raidd || raidd.project.deletedAt !== null) {
                    console.log(`[RAIDD AI Sync] RAIDD ${raiddId} not found or project deleted. Stopping retries.`);
                    return;
                }

                const response = await axios.post(`${envVars.API_AI}/summary/project`, {
                    project_id: raidd.projectId
                }, {
                    headers: {
                        'x-backend-service': "PROJECT_AI_BACKEND"
                    }
                });
                
                const projectsData = response.data;
                const aiProjectData = Array.isArray(projectsData)
                    ? projectsData.find(p => p.projectId === raidd.projectId)
                    : projectsData;

                if (!aiProjectData || !aiProjectData.raiddFlags) {
                    console.log(`[RAIDD AI Sync] Attempt ${attempt + 1} completed but no RAIDD flags found for project ${raidd.projectId} yet.`);
                    continue;
                }

                const { raiddFlags } = aiProjectData;
                
                // Match the database RAIDD type to the AI categories
                let aiItems = [];
                switch (raidd.type) {
                    case "RISK": aiItems = raiddFlags.risks; break;
                    case "ASSUMPTION": aiItems = raiddFlags.assumptions; break;
                    case "ISSUE": aiItems = raiddFlags.issues; break;
                    case "DEPENDENCY": aiItems = raiddFlags.dependencies; break;
                    case "DECISION": aiItems = raiddFlags.decisions; break;
                }

                if (Array.isArray(aiItems) && aiItems.length > 0) {
                    const validItems = aiItems.filter(i => typeof i === 'string' && i.trim() !== '');
                    if (validItems.length > 0) {
                        const combinedDescription = validItems.map(item => `- ${item}`).join('\n');
                        
                        // Update this specific RAIDD record with the combined AI data
                        await prisma.raidd.update({
                            where: { id: raiddId },
                            data: {
                                description: combinedDescription,
                                updated_by: userId
                            }
                        });

                        await ActivityLogService.createLog(prisma, {
                            type: "raidd",
                            crudId: raiddId,
                            action: "update_ai",
                            userId: userId,
                            projectId: raidd.projectId,
                        });

                        console.log(`[RAIDD AI Sync] Success on attempt ${attempt + 1} for RAIDD:`, raiddId);
                        return; // Success, exit retry loop
                    }
                }
                
                console.log(`[RAIDD AI Sync] Attempt ${attempt + 1} completed but no specific AI items found for RAIDD type ${raidd.type} in project ${raidd.projectId}.`);

            } catch (error) {
                console.error(`[RAIDD AI Sync] Attempt ${attempt + 1} failed for RAIDD ${raiddId}:`, error.message);
            }

            if (attempt === delays.length - 1) {
                console.warn(`[RAIDD AI Sync] All ${delays.length} attempts failed for RAIDD ${raiddId}. AI data might still be processing.`);
            }
        }
    },

    syncAllRaiddFromAi: async (prisma, projectsDataInput = null) => {
        try {
            let projectsData = projectsDataInput;
            if (!projectsData) {
                const response = await axios.post(`${envVars.API_AI}/summary/project`, {}, {
                    headers: {
                        'x-backend-service': "PROJECT_AI_BACKEND"
                    }
                });
                projectsData = response.data;
            }

            if (!Array.isArray(projectsData)) return;

            for (const aiProject of projectsData) {
                const { projectId, raiddFlags } = aiProject;
                if (!projectId || !raiddFlags) continue;

                // Find all RAIDD items for this project
                const raiddItems = await prisma.raidd.findMany({
                    where: { projectId, deleted_at: null }
                });

                for (const raidd of raiddItems) {
                    let aiItems = [];
                    switch (raidd.type) {
                        case "RISK": aiItems = raiddFlags.risks; break;
                        case "ASSUMPTION": aiItems = raiddFlags.assumptions; break;
                        case "ISSUE": aiItems = raiddFlags.issues; break;
                        case "DEPENDENCY": aiItems = raiddFlags.dependencies; break;
                        case "DECISION": aiItems = raiddFlags.decisions; break;
                    }

                    if (Array.isArray(aiItems) && aiItems.length > 0) {
                        const validItems = aiItems.filter(i => typeof i === 'string' && i.trim() !== '');
                        if (validItems.length > 0) {
                            const combinedDescription = validItems.map(item => `- ${item}`).join('\n');
                            
                            await prisma.raidd.update({
                                where: { id: raidd.id },
                                data: {
                                    description: combinedDescription
                                }
                            });
                        }
                    }
                }
            }
            console.log(`Bulk RAIDD AI Sync completed for projects in response`);
        } catch (error) {
            console.error("Bulk RAIDD AI Sync failed:", error.message);
        }
    }
};
