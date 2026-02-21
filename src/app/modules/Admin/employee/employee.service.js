import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import { Role } from "../../../utils/role.js";

export const EmployeeService = {
  createEmployee: async (prisma, payload, userId) => {
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
          isVerified: true, // Internal employees are pre-verified
          oauthProvider: "email",
        },
      });

      // 2. Create Employee
      const employee = await tx.employee.create({
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

      return employee;
    });
  },

  getAllEmployees: async (prisma) => {
    return prisma.employee.findMany({
      where: { deletedAt: null },
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
  },

  getSingleEmployee: async (prisma, id) => {
    const employee = await prisma.employee.findFirst({
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

    if (!employee) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        "Project Manager not found or deleted",
      );
    }

    return employee;
  },

  updateEmployee: async (prisma, id, payload, userId) => {
    const employee = await prisma.employee.findFirst({
      where: { id, deletedAt: null },
    });

    if (!employee) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        "Project Manager not found or deleted",
      );
    }

    return prisma.employee.update({
      where: { id, deletedAt: null },
      data: {
        firstName: payload.firstName,
        projectId: payload.projectId,
        teamId: payload.teamId,
        updatedById: userId,
      },
    });
  },

  deleteEmployee: async (prisma, id, userId) => {
    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new AppError(StatusCodes.NOT_FOUND, "Project Manager not found");
    }

    return prisma.$transaction(async (tx) => {
      // 1. Delete Employee
      await tx.employee.delete({
        where: { id },
      });

      // 2. Delete User if linked
      if (employee.userId) {
        await tx.user.delete({
          where: { id: employee.userId },
        });
      }

      return {
        message: "Project Manager and associated user deleted permanently",
      };
    });
  },

  approveEmployee: async (prisma, id, userId) => {
    return prisma.employee.update({
      where: { id },
      data: {
        approvedById: userId,
      },
    });
  },
};
