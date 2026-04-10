import { StatusCodes } from "http-status-codes";
import { projectSearchableFields } from "../../../constant.js";
import { AppError } from "../../../errorHelper/appError.js";
import { QueryBuilder } from "../../../utils/QueryBuilder.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";
import axios from "axios";
import { envVars } from "../../../config/env.js";
import { LessonLearnService } from "../leasonLearn/leasonLearn.service.js";

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
                manager: { connect: { id: userId } },
                createdBy: { connect: { id: userId } },
                projectOwner: { connect: { id: userId } },
                assignTeam: actualAssignTeamId ? { connect: { id: actualAssignTeamId } } : undefined,

                health: payload.health ? {
                    create: payload.health.map(h => ({
                        type: h.field,
                        healthStatus: h.healthStatus,
                        score: h.score,
                        status: h.status,
                    }))
                } : undefined,

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

        // Fire and forget (Background Task)
        PMProjectManagementService.syncProjectAiStatusBackground(prisma, project.id, userId).catch(err => {
            console.error("Critical error in background AI sync:", err);
        });

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

        await ActivityLogService.createLog(prisma, {
            type: "project",
            crudId: id,
            action: "delete",
            userId,
            projectId: id,
        });

        return deletedProject;
    },

    syncProjectAiStatusBackground: async (prisma, id, userId) => {
        try {
            // Wait 5 seconds to ensure the project creation is propagated to the AI system
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Find the project and ensure ownership
            const project = await prisma.project.findFirst({
                where: { id, managerId: userId, deletedAt: null },
                include: { tasks: true }
            });

            if (!project) return;

            // 1. Calculate project progress
            const totalTasks = project.tasks.length;
            const completedTasks = project.tasks.filter(task => task.status === "COMPLETED").length;
            const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const projectProgress = `${progressPercentage}%`;

            // 2. Fetch AI Summary from External AI API
            let aiSummary = "";
            try {
                const apiUrl = `${envVars.API_AI}/summary/project`;
                console.log("Fetching AI summary from:", apiUrl);

                // Use POST with header as required by the AI service (matching RAIDD/Meeting logic)
                const response = await axios.post(apiUrl, {}, {
                    headers: {
                        'x-backend-service': 'PROJECT_AI_BACKEND'
                    }
                });

                console.log("AI API Response Data:", JSON.stringify(response.data, null, 2));

                const projectsData = response.data;
                if (Array.isArray(projectsData)) {
                    // Find the summary for this specific project
                    const projectAiData = projectsData.find(p => p.projectId === id);
                    aiSummary = projectAiData?.summary || "";
                    
                    if (!aiSummary) {
                        console.log(`No summary found for project ID: ${id} in AI response array.`);
                    }
                } else {
                    console.log("Unexpected response format: expected an array from AI API.");
                    aiSummary = response.data?.summary || "";
                }
            } catch (error) {
                console.error("AI API Call failed:", error.message);
                if (error.response) {
                    console.error("AI API Error Response:", error.response.data);
                }
            }

            // 3. Update the Project
            await prisma.project.update({
                where: { id },
                data: {
                    projectProgress,
                    ...(aiSummary && {
                        projectAiSummary: {
                            push: aiSummary
                        },
                        weeklyAiSummary: aiSummary
                    })
                }
            });

            console.log("ai api data updated for the new created project:", id);

            // 4. Sync Lesson Learn AI data
            console.log(`[AI sync] Triggering Lesson Learn AI sync for project ${id}`);
            await LessonLearnService.syncLessonLearnForProject(prisma, project, userId);

            await ActivityLogService.createLog(prisma, {
                type: "project",
                crudId: id,
                action: "ai-sync-background",
                userId,
                projectId: id,
            });

        } catch (error) {
            console.error("Background sync failed:", error);
        }
    },

    syncAllProjectsFromAi: async (prisma) => {
        try {
            const apiUrl = `${envVars.API_AI}/summary/project`;
            const response = await axios.post(apiUrl, {}, {
                headers: {
                    'x-backend-service': 'PROJECT_AI_BACKEND'
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
                }
            }
            console.log(`Bulk Project AI Sync completed for ${projectsData.length} items`);
            return projectsData; // Return data for RAIDD sync to reuse
        } catch (error) {
            console.error("Bulk Project AI Sync failed:", error.message);
        }
    }
};


