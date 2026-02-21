import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";

export const ProjectManagementService = {
    createProject: async (prisma, payload, userId) => {
        // Find the Project Manager to get their teamId
        const projectManager = await prisma.projectManager.findFirst({
            where: { userId: payload.managerId, deletedAt: null },
        });

        if (!projectManager) {
            // Check if the managerId is a User ID (which it likely is based on schema)
            const user = await prisma.user.findUnique({
                where: { id: payload.managerId },
                include: { projectManagers: true }
            });

            if (!user || user.role !== "PROJECT_MANAGER") {
                throw new AppError(StatusCodes.NOT_FOUND, "Project Manager not found");
            }

            // If they are a user but don't have a ProjectManager record yet, we might need to handle it
            // but usually they should have one if they are PM.
            payload.teamId = user.teamId;
        } else {
            payload.teamId = projectManager.teamId;
        }

        return prisma.project.create({
            data: {
                name: payload.name,
                description: payload.description,
                vendorName: payload.vendorName,
                startDate: payload.startDate ? new Date(payload.startDate) : null,
                endDate: payload.endDate ? new Date(payload.endDate) : null,
                status: payload.status || "IN_PROGRESS",
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

    getAllProjects: async (prisma) => {
        return prisma.project.findMany({
            where: { deletedAt: null },
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
            orderBy: { createdAt: "desc" },
        });
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
                health: true,
            },
        });

        if (!project) {
            throw new AppError(StatusCodes.NOT_FOUND, "Project not found");
        }

        return project;
    },

    updateProject: async (prisma, id, payload) => {
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

        return prisma.project.update({
            where: { id },
            data: updateData,
        });
    },

    deleteProject: async (prisma, id) => {
        const project = await prisma.project.findUnique({
            where: { id },
        });

        if (!project) {
            throw new AppError(StatusCodes.NOT_FOUND, "Project not found");
        }

        return prisma.project.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },
};
