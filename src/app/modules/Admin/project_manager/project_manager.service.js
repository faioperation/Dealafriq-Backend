import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import { Role } from "../../../utils/role.js";

export const ProjectManagerService = {
    createProjectManager: async (prisma, payload, userId) => {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: payload.email },
        });

        if (existingUser) {
            throw new Error("User with this email already exists");
        }

        const hashedPassword = await bcrypt.hash(payload.password, 10);

        return prisma.$transaction(async (tx) => {
            // 1. Create User
            const user = await tx.user.create({
                data: {
                    firstName: payload.firstName,
                    lastName: payload.lastName,
                    email: payload.email,
                    passwordHash: hashedPassword,
                    role: Role.PROJECT_MANAGER,
                    isVerified: true, // Internal users are pre-verified
                    oauthProvider: "email",
                    teamId: payload.teamId, // Sync teamId to user table
                },
            });

            // 2. Create ProjectManager
            const projectManager = await tx.projectManager.create({
                data: {
                    firstName: payload.firstName,
                    lastName: payload.lastName,
                    projectId: payload.projectId,
                    user: {
                        connect: { id: user.id },
                    },
                    team: payload.teamId
                        ? {
                            connect: { id: payload.teamId },
                        }
                        : undefined,
                    createdBy: {
                        connect: { id: userId },
                    },
                },
            });

            return projectManager;
        });
    },

    getAllProjectManagers: async (prisma) => {
        return prisma.projectManager.findMany({
            where: { deletedAt: null },
            include: {
                team: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        teamId: true,
                        isVerified: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    },

    getSingleProjectManager: async (prisma, id) => {
        const projectManager = await prisma.projectManager.findFirst({
            where: { id, deletedAt: null },
            include: {
                team: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        isVerified: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        if (!projectManager) {
            throw new AppError(
                StatusCodes.NOT_FOUND,
                "Project Manager not found or deleted",
            );
        }

        return projectManager;
    },

    updateProjectManager: async (prisma, id, payload, userId) => {
        const projectManager = await prisma.projectManager.findFirst({
            where: { id, deletedAt: null },
        });

        if (!projectManager) {
            throw new AppError(
                StatusCodes.NOT_FOUND,
                "Project Manager not found or deleted",
            );
        }

        return prisma.$transaction(async (tx) => {
            // 1. Update ProjectManager
            const updatedPM = await tx.projectManager.update({
                where: { id, deletedAt: null },
                data: {
                    firstName: payload.firstName,
                    lastName: payload.lastName,
                    projectId: payload.projectId,
                    teamId: payload.teamId,
                    updatedById: userId,
                },
            });

            // 2. Sync to User if linked
            if (updatedPM.userId) {
                await tx.user.update({
                    where: { id: updatedPM.userId },
                    data: {
                        firstName: payload.firstName,
                        lastName: payload.lastName,
                        teamId: payload.teamId, // Sync teamId to user table
                    },
                });
            }

            return updatedPM;
        });
    },

    deleteProjectManager: async (prisma, id, userId) => {
        const projectManager = await prisma.projectManager.findUnique({
            where: { id },
        });

        if (!projectManager) {
            throw new AppError(StatusCodes.NOT_FOUND, "Project Manager not found");
        }

        return prisma.$transaction(async (tx) => {
            // 1. Delete ProjectManager
            await tx.projectManager.delete({
                where: { id },
            });

            // 2. Delete User if linked
            if (projectManager.userId) {
                await tx.user.delete({
                    where: { id: projectManager.userId },
                });
            }

            return {
                message: "Project Manager and associated user deleted permanently",
            };
        });
    },

    approveProjectManager: async (prisma, id, userId) => {
        return prisma.projectManager.update({
            where: { id },
            data: {
                approvedById: userId,
            },
        });
    },
};
