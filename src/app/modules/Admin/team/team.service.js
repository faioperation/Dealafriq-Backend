import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";

export const TeamService = {
  createTeam: async (prisma, payload, userId) => {
    return prisma.team.create({
      data: {
        name: payload.name,
        createdById: userId,
      },
    });
  },

  getAllTeams: async (prisma) => {
    return prisma.team.findMany({
      where: { deletedAt: null },
      include: {
        members: {
          select: {
            id: true,
            firstName: true,
            email: true,
          },
        },
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
        deletedById: null, //  prevent fetching deleted team
      },
      include: {
        members: {
          select: {
            id: true,
            firstName: true,
            email: true,
          },
        },
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
    return prisma.team.update({
      where: { id, deletedById: null },
      data: {
        ...payload,
        updatedById: userId,
      },
    });
  },

  deleteTeam: async (prisma, id, userId) => {
    return prisma.team.update({
      where: { id, deletedById: null },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  },
};
