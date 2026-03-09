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

    // Validate if employeeIds exist before trying to connect
    if (payload.employeeIds && payload.employeeIds.length > 0) {
      const existingEmployees = await prisma.employee.findMany({
        where: {
          id: { in: payload.employeeIds },
          id: { in: payload.employeeIds },
          deletedAt: null
        }
      });

      if (existingEmployees.length !== payload.employeeIds.length) {
        const foundIds = existingEmployees.map(e => e.id);
        const missingIds = payload.employeeIds.filter(id => !foundIds.includes(id));
        throw new AppError(StatusCodes.BAD_REQUEST, `The following Employee IDs are invalid or have typos: ${missingIds.join(', ')}. Please copy the full IDs from the GET /employee/all API response rather than typing them from Prisma Studio.`);
      }
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

    // Validate employeeIds if provided
    if (employeeIds && employeeIds.length > 0) {
      const existingEmployees = await prisma.employee.findMany({
        where: {
          id: { in: employeeIds },
          deletedAt: null
        }
      });

      if (existingEmployees.length !== employeeIds.length) {
        const foundIds = existingEmployees.map(e => e.id);
        const missingIds = employeeIds.filter(id => !foundIds.includes(id));
        throw new AppError(StatusCodes.BAD_REQUEST, `The following Employee IDs are invalid or have typos: ${missingIds.join(', ')}. Please copy the full IDs from the GET /employee/all API response rather than typing them from Prisma Studio.`);
      }
    }

    return prisma.team.update({
      where: { id, deletedAt: null },
      data: {
        ...updateData,
        updatedById: userId,
        employees: employeeIds ? {
          set: employeeIds.map(empId => ({ id: empId }))
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
