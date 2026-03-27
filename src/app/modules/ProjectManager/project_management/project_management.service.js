import { StatusCodes } from "http-status-codes";
import { projectSearchableFields } from "../../../constant.js";
import { AppError } from "../../../errorHelper/appError.js";
import { QueryBuilder } from "../../../utils/QueryBuilder.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";
import axios from "axios";

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
                // Fetch from process.env.API_AI
                const apiUrl = `${process.env.API_AI}/project-summary`; // Adjusting endpoint as based on base URL
                const response = await axios.get(apiUrl);
                
                // Assuming it returns the structure: { summary: "..." }
                aiSummary = response.data.summary || "";
            } catch (error) {
                console.error("AI API Call failed:", error.message);
                // In case of error, we can still update the progress but AI summary will be empty
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
    }
};


