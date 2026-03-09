import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";

export const TeamService = {
  createTeam: async (prisma, payload, userId) => {
    const pm = await prisma.projectManager.findFirst({
      where: { userId: userId, deletedAt: null }
    });

    if (!pm) {
      throw new AppError(StatusCodes.FORBIDDEN, "Only Project Managers can create teams");
    }

    return prisma.team.create({
      data: {
        name: payload.name,
        projectManagerId: pm.id,
        createdById: userId,
        employees: payload.employeeIds ? {
          connect: payload.employeeIds.map(id => ({ id }))
        } : undefined
      },
      include: {
        employees: true,
        projectManager: true
      }
    });
  },

  getAllTeams: async (prisma, userId) => {
    return prisma.team.findMany({
      where: { deletedAt: null, createdById: userId },
      include: {
        employees: true,
        projectManager: true,
        createdBy: {
          select: {
            firstName: true,
            email: true,
          },
        },
      },
    });
  },
  getSingleTeam: async (prisma, id) => {
    const team = await prisma.team.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        employees: true,
        projectManager: true,
        createdBy: {
          select: {
            firstName: true,
            email: true,
          },
        },
      },
    });

    if (!team) {
      throw new AppError(StatusCodes.NOT_FOUND, "Team not found or already deleted");
    }

    return team;
  },

  updateTeam: async (prisma, id, payload, userId) => {
    const { employeeIds, ...updateData } = payload;
    return prisma.team.update({
      where: { id, deletedAt: null },
      data: {
        ...updateData,
        updatedById: userId,
        employees: employeeIds ? {
          set: employeeIds.map(id => ({ id }))
        } : undefined
      },
    });
  },

  deleteTeam: async (prisma, id, userId) => {
    return prisma.team.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  },
};
