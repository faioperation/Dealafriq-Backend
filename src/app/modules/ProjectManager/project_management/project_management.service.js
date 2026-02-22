import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import { QueryBuilder } from "../../../utils/QueryBuilder.js";
import { projectSearchableFields } from "../../../constant.js";

export const PMProjectManagementService = {
    createProject: async (prisma, payload, userId) => {
        // Find the logged-in user to get their teamId
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || user.role !== "PROJECT_MANAGER") {
            throw new AppError(StatusCodes.FORBIDDEN, "Only Project Managers can create projects this way");
        }

        return prisma.project.create({
            data: {
                name: payload.name,
                description: payload.description,
                vendorName: payload.vendorName,
                startDate: payload.startDate ? new Date(payload.startDate) : null,
                endDate: payload.endDate ? new Date(payload.endDate) : null,
                status: payload.status || "IN_PROGRESS",
                manager: { connect: { id: userId } },
                createdBy: { connect: { id: userId } },
                team: user.teamId ? { connect: { id: user.teamId } } : undefined,

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
            },
            include: {
                meetings: true,
                documents: true,
                projectAgreements: true,
                manager: {
                    select: {
                        firstName: true,
                        lastName: true,
                        role: true,
                    }
                }
            }
        });
    },

    getMyProjects: async (prisma, userId, query) => {
        const relationConfig = {
            manager: ["firstName", "lastName", "email"],
            team: ["name"],
        };

        const queryBuilder = new QueryBuilder(query)
            .search(projectSearchableFields)
            .filter(relationConfig)
            .sort("createdAt", relationConfig)
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
                documents: true,
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

        return prisma.project.update({
            where: { id },
            data: updateData,
        });
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

        return prisma.project.delete({
            where: { id }
        });
    },
};
