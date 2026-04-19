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
        await verifyProjectOwnership(prisma, payload.projectId, userId);

        const raidd = await prisma.raidd.create({
            data: {
                ...payload,
                created_by: userId,
            },
        });

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
                                email: true,
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
                        description: true,
                        vendorName: true,
                        startDate: true,
                        endDate: true,
                        managerId: true,
                        deletedAt: true,
                        vendor: {
                            select: {
                                email: true,
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
                        description: true,
                        vendorName: true,
                        startDate: true,
                        endDate: true,
                        vendor: {
                            select: {
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: { created_at: "desc" },
        });
    },

    syncSingleRaiddFromAi: async (prisma, raiddId, userId) => {
        try {
            const raidd = await prisma.raidd.findUnique({
                where: { id: raiddId },
                include: { project: true }
            });

            if (!raidd || raidd.project.deletedAt !== null) return;

            const response = await axios.post(`${envVars.API_AI}/summary/project`, {}, {
                headers: {
                   'x-backend-service': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUzMDAyMTM3LTU5MmMtNGI4Mi04Nzk2LTdiOWI5YzA2MWU0NCIsImVtYWlsIjoic2hhcmFoJzaW9uIjowLCJpYXQiOjE3NzY0ODkyMzEsImV4cCI6MTc3NzA5NDAzMX0.ahuFS_2BlgjN-O6XjRQesTOlGEcqrij9J70RUO8Clh0"
                }
            });
            
            const projectsData = response.data;
            if (!Array.isArray(projectsData)) return;

            // Find the AI project data by matching projectId
            const aiProjectData = projectsData.find(p => p.projectId === raidd.projectId);
            if (!aiProjectData || !aiProjectData.raiddFlags) return;

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
                }
            }
        } catch (error) {
            console.error("Failed to sync AI RAIDD summary for single record:", error.message);
        }
    },

    syncAllRaiddFromAi: async (prisma, projectsDataInput = null) => {
        try {
            let projectsData = projectsDataInput;
            if (!projectsData) {
                const response = await axios.post(`${envVars.API_AI}/summary/project`, {}, {
                    headers: {
                        'x-backend-service': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUzMDAyMTM3LTU5MmMtNGI4Mi04Nzk2LTdiOWI5YzA2MWU0NCIsImVtYWlsIjoic2hhcmFoJzaW9uIjowLCJpYXQiOjE3NzY0ODkyMzEsImV4cCI6MTc3NzA5NDAzMX0.ahuFS_2BlgjN-O6XjRQesTOlGEcqrij9J70RUO8Clh0"
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
