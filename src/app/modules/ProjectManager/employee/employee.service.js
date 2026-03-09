import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";

export const EmployeeService = {
    createEmployee: async (prisma, payload, userId) => {
        return prisma.employee.create({
            data: {
                firstName: payload.firstName,
                lastName: payload.lastName,
                email: payload.email,
                phoneNumber: payload.phoneNumber,
                created_by: userId,
            },
        });
    },

    getAllEmployees: async (prisma, userId) => {
        return prisma.employee.findMany({
            where: { deletedAt: null, created_by: userId },
            include: {
                team: true,
            },
            orderBy: { createdAt: "desc" },
        });
    },

    getSingleEmployee: async (prisma, id, userId) => {
        const employee = await prisma.employee.findFirst({
            where: { id, deletedAt: null, created_by: userId },
            include: {
                team: true,
            },
        });

        if (!employee) {
            throw new AppError(StatusCodes.NOT_FOUND, "Employee not found");
        }

        return employee;
    },

    updateEmployee: async (prisma, id, payload, userId) => {
        return prisma.employee.update({
            where: { id, created_by: userId, deletedAt: null },
            data: {
                ...payload,
                updated_by: userId,
            },
        });
    },

    deleteEmployee: async (prisma, id, userId) => {
        return prisma.employee.delete({
            where: { id, created_by: userId },
        });
    },
};
