import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";

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
            },
        });
    },

    getMyProjects: async (prisma, userId) => {
        return prisma.project.findMany({
            where: {
                managerId: userId,
                deletedAt: null
            },
            include: {
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
    },

    getSingleProject: async (prisma, id, userId) => {
        const project = await prisma.project.findFirst({
            where: {
                id,
                managerId: userId,
                deletedAt: null
            },
            include: {
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
