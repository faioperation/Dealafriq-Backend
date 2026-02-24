import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import { QueryBuilder } from "../../../utils/QueryBuilder.js";
import { projectSearchableFields } from "../../../constant.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";

export const ProjectManagementService = {
    createProject: async (prisma, payload, userId) => {
        // Initialize fallback
        let targetManagerId = payload.managerId;
        let teamId = payload.teamId;

        // Try to find the Project Manager record first (user might have sent ProjectManager.id or ProjectManager.userId)
        const pmRecord = await prisma.projectManager.findFirst({
            where: {
                OR: [
                    { id: payload.managerId },
                    { userId: payload.managerId }
                ],
                deletedAt: null
            },
        });

        if (pmRecord) {
            // If found, use the related userId and teamId
            targetManagerId = pmRecord.userId;
            teamId = pmRecord.teamId;
        } else {
            // If not found in ProjectManager table, check if it's a direct User ID with PM role
            const user = await prisma.user.findUnique({
                where: { id: payload.managerId },
            });

            if (!user || user.role !== "PROJECT_MANAGER") {
                throw new AppError(StatusCodes.NOT_FOUND, "Project Manager not found");
            }
            teamId = user.teamId;
        }

        // Update payload with the verified User ID and Team ID
        payload.managerId = targetManagerId;
        payload.teamId = teamId;

        const project = await prisma.project.create({
            data: {
                name: payload.name,
                description: payload.description,
                vendorName: payload.vendorName,
                startDate: payload.startDate ? new Date(payload.startDate) : null,
                endDate: payload.endDate ? new Date(payload.endDate) : null,
                status: payload.status || "ONGOING",
                manager: { connect: { id: payload.managerId } },
                createdBy: { connect: { id: userId } },
                team: payload.teamId ? { connect: { id: payload.teamId } } : undefined,

                // Integrated creation of sub-entities
                meetings: payload.meetings ? {
                    create: payload.meetings.map(m => ({
                        title: m.title,
                        meetingUrl: m.meetingUrl,
                    }))
                } : undefined,

                documents: payload.documents ? {
                    create: payload.documents.map(d => ({
                        fileName: d.fileName,
                        fileUrl: d.fileUrl,
                        filePath: d.filePath,
                        title: d.title,
                        projectSummary: d.projectSummary,
                        keyPoints: d.keyPoints ? {
                            create: d.keyPoints.filter(kp => kp && kp.content).map(kp => ({
                                content: kp.content,
                                status: kp.status || "TO_BE_VALIDATED"
                            }))
                        } : undefined,
                        actionPoints: d.actionPoints ? {
                            create: d.actionPoints.filter(ap => ap && ap.content).map(ap => ({
                                content: ap.content,
                                status: ap.status || "PENDING"
                            }))
                        } : undefined,
                    }))
                } : undefined,

                projectAgreements: payload.agreements ? {
                    create: payload.agreements.map(a => ({
                        fileName: a.fileName,
                        fileUrl: a.fileUrl,
                        filePath: a.filePath,
                        fileType: a.fileType || "SLA",
                    }))
                } : undefined,

                health: payload.health ? {
                    create: payload.health.map(h => ({
                        type: h.field,
                        healthStatus: h.healthStatus,
                        score: h.score,
                        status: h.status,
                    }))
                } : undefined,
            },
            include: {
                meetings: true,
                documents: true,
                projectAgreements: true,
                health: true,
                manager: {
                    select: {
                        firstName: true,
                        lastName: true,
                        role: true,
                    }
                }
            }
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

    getAllProjects: async (prisma, query) => {
        const relationConfig = {
            manager: ["firstName", "lastName", "email"],
            team: ["name"],
        };

        const queryBuilder = new QueryBuilder(query)
            .search(projectSearchableFields)
            .filter(relationConfig, { status: ["DRAFT", "IN_PROGRESS", "ONGOING", "ON_HOLD", "COMPLETED", "CANCELLED"] })
            .sort("createdAt", relationConfig)
            .paginate();

        const buildQuery = queryBuilder.build();
        buildQuery.where = { ...buildQuery.where, deletedAt: null };

        const [result, total] = await Promise.all([
            prisma.project.findMany({
                ...buildQuery,
                include: {
                    manager: {
                        select: {
                            firstName: true,
                            lastName: true,
                            role: true,
                        },
                    },
                    team: true,
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
                    projectAgreements: true,
                    health: true,
                    assignments: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    role: true,
                                },
                            },
                        },
                    },
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

    getSingleProject: async (prisma, id) => {
        const project = await prisma.project.findFirst({
            where: { id, deletedAt: null },
            include: {
                manager: {
                    select: {
                        firstName: true,
                        lastName: true,
                        role: true,
                    },
                },
                team: true,
                tasks: true,
                milestones: true,
                meetings: {
                    include: {
                        keyPoints: true,
                        actionPoints: true,
                    },
                },
                documents: true,
                health: true,
                projectAgreements: true,
                assignments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                role: true,
                            },
                        },
                    },
                },
                transcripts: true,
            },
        });

        if (!project) {
            throw new AppError(StatusCodes.NOT_FOUND, "Project not found");
        }

        return project;
    },

    updateProject: async (prisma, id, payload, userId) => {
        const project = await prisma.project.findFirst({
            where: { id, deletedAt: null },
        });

        if (!project) {
            throw new AppError(StatusCodes.NOT_FOUND, "Project not found");
        }

        const updateData = { ...payload };
        if (payload.startDate) updateData.startDate = new Date(payload.startDate);
        if (payload.endDate) updateData.endDate = new Date(payload.endDate);

        // If manager changes, automatically update team
        if (payload.managerId && payload.managerId !== project.managerId) {
            const projectManager = await prisma.user.findUnique({
                where: { id: payload.managerId },
            });
            if (projectManager) {
                updateData.teamId = projectManager.teamId;
            }
        }

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

    deleteProject: async (prisma, id, userId) => {
        const project = await prisma.project.findUnique({
            where: { id },
        });

        if (!project) {
            throw new AppError(StatusCodes.NOT_FOUND, "Project not found");
        }

        const deletedProject = await prisma.project.update({
            where: { id },
            data: { deletedAt: new Date() },
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
};
