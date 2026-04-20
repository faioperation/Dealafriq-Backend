import { StatusCodes } from "http-status-codes";
import { projectSearchableFields } from "../../../constant.js";
import { AppError } from "../../../errorHelper/appError.js";
import { QueryBuilder } from "../../../utils/QueryBuilder.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";
import axios from "axios";
import { envVars } from "../../../config/env.js";
import { LessonLearnService } from "../leasonLearn/leasonLearn.service.js";
import { ProjectHealthService } from "../projectHealth/projectHealth.service.js";
import { VendorService } from "../vendorManagement/vendor.service.js";


export const PMProjectManagementService = {
    createProject: async (prisma, payload, userId) => {
        // Find the logged-in user to get their teamId
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || user.role !== "PROJECT_MANAGER") {
            throw new AppError(StatusCodes.FORBIDDEN, "Only Project Managers can create projects this way");
        }

        const actualAssignTeamId = payload.assignTeamId || payload.assignTeam;

        const project = await prisma.project.create({
            data: {
                name: payload.name,
                description: payload.description,
                vendorName: payload.vendorName,
                startDate: payload.startDate ? new Date(payload.startDate) : null,
                endDate: payload.endDate ? new Date(payload.endDate) : null,
                status: payload.status || "ONGOING",
                cancelledReason: payload.cancelledReason,
                manager: { connect: { id: userId } },
                createdBy: { connect: { id: userId } },
                projectOwner: { connect: { id: userId } },
                projectProgress: payload.projectProgress || "0%",
                assignTeam: actualAssignTeamId ? { connect: { id: actualAssignTeamId } } : undefined,


                documents: payload.documents ? {
                    create: payload.documents.map(doc => ({
                        fileName: doc.fileName,
                        filePath: doc.filePath,
                        fileUrl: doc.fileUrl,
                    }))
                } : undefined,

                agreements: payload.agreements ? {
                    create: payload.agreements.map(agr => ({
                        fileName: agr.fileName,
                        filePath: agr.filePath,
                        fileUrl: agr.fileUrl,
                        fileType: agr.fileType,
                    }))
                } : undefined,
                meetings: payload.meetings ? {
                    create: payload.meetings.map(m => ({
                        title: m.title || "Project Meeting",
                        meetingUrl: m.meetingUrl,
                        meetingDate: m.meetingDate ? new Date(m.meetingDate) : new Date(),
                    }))
                } : undefined,
            },
            include: {
                meetings: true,
                documents: true,
                health: true,
                tasks: true,
                projectAgreements: true,
                transcripts: true,
                milestones: true,
                assignTeam: true,
                manager: {
                    select: {
                        firstName: true,
                        lastName: true,
                        role: true,
                    }
                }
            }
        });
        
        // Initialize standardized health
        await ProjectHealthService.calculateAndUpsertHealth(prisma, project.id, payload.health);

        // Create a baseline LessonLearn record immediately on project creation
        await LessonLearnService.createLessonLearn(prisma, {
            projectId: project.id,
            projectName: project.name,
            title: `Lesson Learn for ${project.name}`,
            description: "Lesson learn record created at project creation. AI insights will update this record once available.",
            source: "System",
            status: "PENDING",
            loggedDate: new Date().toISOString(),
        }, userId);

        // Fire and forget (Background Task)
        PMProjectManagementService.syncProjectAiStatusBackground(prisma, project.id, userId).catch(err => {
            console.error("Critical error in background AI sync:", err);
        });

        // Trigger vendor AI sync if a vendor is associated
        if (payload.vendorId) {
            VendorService.syncAllVendorsFromAi(prisma).catch(err => {
                console.error("Error in background vendor AI sync from project creation:", err);
            });
        }


        await ActivityLogService.createLog(prisma, {
            type: "project",
            crudId: project.id,
            action: "create",
            userId,
            projectId: project.id,
        });

        return project;
    },

    getMyProjects: async (prisma, userId, query) => {
        const relationConfig = {
            manager: ["firstName", "lastName", "email"],
            assignTeam: ["name"],
        };

        const queryBuilder = new QueryBuilder(query)
            .search(projectSearchableFields)
            .filter(relationConfig, { status: ["DRAFT", "IN_PROGRESS", "ONGOING", "ON_HOLD", "COMPLETED", "CANCELLED"] })
            .sort("-createdAt", relationConfig)
            .paginate();

        const buildQuery = queryBuilder.build();
        buildQuery.where = {
            ...buildQuery.where,
            managerId: userId,
            deletedAt: null
        };

        const [result, total] = await Promise.all([
            prisma.project.findMany({
                ...buildQuery,
                include: {
                    manager: {
                        select: {
                            firstName: true,
                            lastName: true,
                            id: true,
                            role: true,
                        },
                    },
                    assignTeam: true,
                    tasks: true,
                    milestones: true,
                    health: true,
                    meetings: {
                        include: {
                            keyPoints: true,
                            actionPoints: true,
                        },
                        orderBy: { createdAt: 'desc' }
                    },
                    documents: {
                        include: {
                            keyPoints: true,
                            actionPoints: true,
                        },
                    },
                    health: true,
                    transcripts: true,
                },
            }),
            prisma.project.count({ where: buildQuery.where }),
        ]);

        const dataWithoutSummaries = result.map(project => {
            const { projectSummary, weeklyMeetingSummary, ...rest } = project;
            return rest;
        });

        return {
            meta: queryBuilder.getMeta(total),
            data: dataWithoutSummaries,
        };
    },

    getSingleProject: async (prisma, id, userId) => {
        const project = await prisma.project.findFirst({
            where: {
                id,
                managerId: userId,
                deletedAt: null
            },
            include: {
                manager: {
                    select: {
                        firstName: true,
                        id: true,
                        lastName: true,
                        role: true,
                    },
                },
                assignTeam: true,
                tasks: true,
                milestones: true,
                health: true,
                documents: true,
                transcripts: true,
                meetings: {
                    include: {
                        keyPoints: true,
                        actionPoints: true,
                    },
                },
            },
        });

        if (!project) {
            throw new AppError(StatusCodes.NOT_FOUND, "Project not found or you don't have access");
        }

        const { projectSummary, weeklyMeetingSummary, ...rest } = project;
        return rest;
    },

    updateProject: async (prisma, id, payload, userId) => {
        const project = await prisma.project.findFirst({
            where: {
                id,
                managerId: userId,
                deletedAt: null
            },
        });

        if (!project) {
            throw new AppError(StatusCodes.NOT_FOUND, "Project not found or you don't have access");
        }

        const updateData = { ...payload };
        if (payload.startDate) updateData.startDate = new Date(payload.startDate);
        if (payload.endDate) updateData.endDate = new Date(payload.endDate);

        // Project manager cannot change the managerId of the project to someone else in this view
        delete updateData.managerId;

        const updatedProject = await prisma.project.update({
            where: { id },
            data: updateData,
        });

        // Update health status if progress might have changed
        await ProjectHealthService.calculateAndUpsertHealth(prisma, id);

        await ActivityLogService.createLog(prisma, {
            type: "project",
            crudId: id,
            action: "update",
            userId,
            projectId: id,
        });

        return updatedProject;
    },
    deleteSingleProject: async (prisma, id, userId) => {
        const project = await prisma.project.findFirst({
            where: {
                id,
                managerId: userId,
                deletedAt: null
            }
        });

        if (!project) {
            throw new AppError(
                StatusCodes.NOT_FOUND,
                "Project not found or you don't have access"
            );
        }

        const deletedProject = await prisma.project.delete({
            where: { id }
        });

        return deletedProject;
    },

    syncProjectAiStatusBackground: async (prisma, id, userId) => {
        const delays = [15000, 30000, 45000, 60000, 60000]; // 15s, 30s, 45s, 60s, 60s
        
        for (let attempt = 0; attempt < delays.length; attempt++) {
            try {
                console.log(`[Project AI Sync] Attempt ${attempt + 1} for project ${id} starting in ${delays[attempt] / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delays[attempt]));

                // Find the project and ensure ownership
                const project = await prisma.project.findFirst({
                    where: { id, managerId: userId, deletedAt: null },
                    include: { tasks: true }
                });

                if (!project) {
                    console.log(`[Project AI Sync] Project ${id} not found or access denied. Stopping retries.`);
                    return;
                }

                // 1. Calculate project progress
                const totalTasks = project.tasks.length;
                const completedTasks = project.tasks.filter(task => task.status === "COMPLETED").length;
                const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                const projectProgress = `${progressPercentage}%`;

                // 2. Fetch AI Summary from External AI API
                // 2. Fetch AI payload from External AI API
                let aiSummary = "";
                let fullPayload = {};
                try {
                    const apiUrl = `${envVars.API_AI}/summary/project`;
                    const response = await axios.post(apiUrl, {}, {
                        headers: {
                            'x-backend-service': "PROJECT_AI_BACKEND"
                        }
                    });
                    const projectsData = response.data;
                    const aiData = Array.isArray(projectsData)
                        ? projectsData.find(p => p.projectId === id)
                        : projectsData;
                    fullPayload = aiData || {};
                    aiSummary = aiData?.summary ?? "";
                } catch (error) {
                    console.error(`[Project AI Sync] API Call failed on attempt ${attempt + 1}:`, error.message);
                }

                if (aiSummary) {
                    // 3. Update the Project with summary and raw payload
                    await prisma.project.update({
                        where: { id },
                        data: {
                            projectProgress,
                            projectAiSummary: { push: aiSummary },
                            weeklyAiSummary: aiSummary,
                            projectAiDetails: fullPayload
                        }
                    });

                    console.log(`[Project AI Sync] Success on attempt ${attempt + 1} for project:`, id);
                    
                    // 3.5 Update Dynamic Health Status
                    await ProjectHealthService.calculateAndUpsertHealth(prisma, id);

                    // 4. Sync Lesson Learn AI data
                    await LessonLearnService.syncLessonLearnForProject(prisma, project, userId);

                    await ActivityLogService.createLog(prisma, {
                        type: "project",
                        crudId: id,
                        action: "ai-sync-background",
                        userId,
                        projectId: id,
                    });

                    return; // Success, exit retry loop
                } else {
                    console.log(`[Project AI Sync] Attempt ${attempt + 1} completed but no summary found for project ${id} yet.`);
                }

            } catch (error) {
                console.error(`[Project AI Sync] Critical error in attempt ${attempt + 1} for project ${id}:`, error);
            }

            if (attempt === delays.length - 1) {
                console.warn(`[Project AI Sync] All ${delays.length} attempts failed for project ${id}. AI data might still be processing.`);
            }
        }
    },

    syncAllProjectsFromAi: async (prisma) => {
        try {
            const apiUrl = `${envVars.API_AI}/summary/project`;
            const response = await axios.post(apiUrl, {}, {
                headers: {
                    'x-backend-service': "PROJECT_AI_BACKEND"
                }
            });

            const projectsData = response.data;
            if (!Array.isArray(projectsData)) {
                console.error("Invalid AI API response for bulk project sync");
                return;
            }

            for (const aiProject of projectsData) {
                const { projectId, summary } = aiProject;
                if (!projectId || !summary) continue;

                // Check if project exists in database
                const projectExists = await prisma.project.findUnique({
                    where: { id: projectId }
                });

                if (projectExists) {
                    // Calculate progress based on existing tasks
                    const tasks = await prisma.projectTask.findMany({
                        where: { projectId: projectId }
                    });
                    const totalTasks = tasks.length;
                    const completedTasks = tasks.filter(t => t.status === "COMPLETED").length;
                    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                    const projectProgress = `${progressPercentage}%`;

                    await prisma.project.update({
                        where: { id: projectId },
                        data: {
                            projectProgress,
                            projectAiSummary: {
                                push: summary
                            },
                            weeklyAiSummary: summary
                        }
                    });
                    
                    // Update Dynamic Health Status
                    await ProjectHealthService.calculateAndUpsertHealth(prisma, projectId);
                }
            }
            console.log(`Bulk Project AI Sync completed for ${projectsData.length} items`);
            return projectsData; // Return data for RAIDD sync to reuse
        } catch (error) {
            console.error("Bulk Project AI Sync failed:", error.message);
        }
    }
};


