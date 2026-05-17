import { StatusCodes } from "http-status-codes";
import { projectSearchableFields } from "../../../constant.js";
import { AppError } from "../../../errorHelper/appError.js";
import { QueryBuilder } from "../../../utils/QueryBuilder.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";
import axios from "axios";
import { envVars } from "../../../config/env.js";
import { LessonLearnService } from "../leasonLearn/leasonLearn.service.js";
import { ClientService } from "../clientManagement/client.service.js";
import { RaiddService } from "../raiddManagement/raidd.service.js";

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
                clientName: payload.clientName || payload.vendorName,
                startDate: payload.startDate ? new Date(payload.startDate) : null,
                endDate: payload.endDate ? new Date(payload.endDate) : null,
                status: payload.status || "ONGOING",
                cancelledReason: payload.cancelledReason,
                manager: { connect: { id: userId } },
                createdBy: { connect: { id: userId } },
                projectOwner: { connect: { id: userId } },
                projectProgress: payload.projectProgress || "0%",
                assignTeam: actualAssignTeamId ? { connect: { id: actualAssignTeamId } } : undefined,
                client: (payload.clientId || payload.vendorId) ? { connect: { id: payload.clientId || payload.vendorId } } : undefined,


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

        // Trigger client AI sync if a client is associated
        if (payload.clientId || payload.vendorId) {
            ClientService.syncAllClientsFromAi(prisma).catch(err => {
                console.error("Error in background client AI sync from project creation:", err);
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
                select: {
                    id: true,
                    name: true,
                    description: true,
                    clientName: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                    createdAt: true,
                    weeklyMeetingSummary: true,
                    projectAiSummary: true,
                    projectProgress: true,
                    projectHealth: true,
                    discussionPoints: true,
                    actionPoints: true,
                    notes: true,
                    cancelledReason: true,
                    aiCheck: true,
                    manager: {
                        select: {
                            firstName: true,
                            lastName: true,
                            id: true,
                            role: true,
                        },
                    },
                    assignTeam: {
                        select: {
                            id: true,
                            name: true,
                            createdAt: true,

                        }
                    },
                    tasks: {
                        select: {
                            id: true,
                            title: true,
                            startDate: true,
                            endDate: true,
                            priority: true,
                            status: true,
                            taskDescription: true,
                        }
                    },
                    milestones: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            startDate: true,
                            milestoneDate: true,
                            createdAt: true,
                        }
                    },
                    meetings: {
                        select: {
                            id: true,
                            title: true,
                            meetingDate: true,
                            createdAt: true,
                            lastMeetingSummary: true,
                            notes: true,
                            agenda: true,
                            transcriptPath: true,
                            transcriptUrl: true,
                            aiMeetingSummary: true,
                            transcriptFileType: true,
                            transcriptPlayUrl: true,
                            transcriptStatus: true,
                            videoPlayUrl: true,
                            aiCheck: true,
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

                },
            }),
            prisma.project.count({ where: buildQuery.where }),
        ]);

        return {
            meta: queryBuilder.getMeta(total),
            data: result,
        };
    },

    getSingleProject: async (prisma, id, userId) => {
        const project = await prisma.project.findFirst({
            where: {
                id,
                managerId: userId,
                deletedAt: null
            },
            select: {
                id: true,
                name: true,
                description: true,
                clientName: true,
                startDate: true,
                endDate: true,
                status: true,
                createdAt: true,
                weeklyMeetingSummary: true,
                projectAiSummary: true,
                projectProgress: true,
                projectHealth: true,
                discussionPoints: true,
                actionPoints: true,
                notes: true,
                cancelledReason: true,
                aiCheck: true,
                manager: {
                    select: {
                        firstName: true,
                        id: true,
                        lastName: true,
                        role: true,
                    },
                },
                assignTeam: {
                    select: {
                        id: true,
                        name: true,
                        createdAt: true,
                    }
                },
                tasks: {
                    select: {
                        id: true,
                        title: true,
                        startDate: true,
                        endDate: true,
                        priority: true,
                        status: true,
                        taskDescription: true,
                    }
                },
                milestones: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        startDate: true,
                        milestoneDate: true,
                        createdAt: true,
                    }
                },
                documents: {
                    include: {
                        keyPoints: true,
                        actionPoints: true,
                    },
                },
                transcripts: true,
                meetings: {
                    select: {
                        id: true,
                        title: true,
                        meetingDate: true,
                        createdAt: true,
                        lastMeetingSummary: true,
                        notes: true,
                        agenda: true,
                        transcriptPath: true,
                        transcriptUrl: true,
                        aiMeetingSummary: true,
                        transcriptFileType: true,
                        transcriptPlayUrl: true,
                        transcriptStatus: true,
                        videoPlayUrl: true,
                        aiCheck: true,
                        keyPoints: true,
                        actionPoints: true,
                    },
                    orderBy: { createdAt: 'desc' }
                },

                risks: true,
                assumptions: true,
                issues: true,
                decisions: true,
                dependencies: true,
            },
        });

        if (!project) {
            throw new AppError(StatusCodes.NOT_FOUND, "Project not found or you don't have access");
        }

        return project;
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
            include: {
                tasks: true,
            }
        });


        await ActivityLogService.createLog(prisma, {
            type: "project",
            crudId: id,
            action: "update",
            userId,
            projectId: id,
        });

        // Trigger AI sync in background on project update
        PMProjectManagementService.syncProjectAiStatusBackground(prisma, id, userId).catch(err => {
            console.error("[Project Update] Error in background AI sync:", err);
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
        try {
            console.log(`[Project AI Sync] Background sync for project ${id} is now handled via AI Push API.`);

            // Still update project progress as it's an internal calculation
            const project = await prisma.project.findFirst({
                where: { id, managerId: userId, deletedAt: null },
                include: { tasks: true }
            });

            if (project) {
                const totalTasks = project.tasks.length;
                const completedTasks = project.tasks.filter(task => task.status === "COMPLETED").length;
                const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                const projectProgress = `${progressPercentage}%`;

                await prisma.project.update({
                    where: { id },
                    data: { projectProgress }
                });

                // Trigger external AI Project summary endpoint
                const liveProjectSummaryUrl = `${envVars.API_AI}/summary/project?id=${id}`;
                console.log(`[Project AI Sync] Triggering background project summary API: ${liveProjectSummaryUrl}`);
                axios.post(liveProjectSummaryUrl, {}, {
                    headers: {
                        'Content-Type': 'application/json',
                        "x-backend-service": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9sTOlGEcqrij9J70RUO8Clh0"
                    }
                }).catch(axiosErr => {
                    console.error(`[Project AI Sync] Failed to trigger background AI Project summary:`, axiosErr.message);
                });
            }
            return;
        } catch (error) {
            console.error(`[Project AI Sync] Error in background task for project ${id}:`, error);
        }
    },

    syncAllProjectsFromAi: async (prisma) => {
        try {
            console.log("[Project AI Sync] Bulk sync skipped: AI Push API should be used.");
            return;
        } catch (error) {
            console.error("Bulk project AI Sync failed:", error.message);
        }
    }
};


