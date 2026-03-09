import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { EmployeeService } from "./employee.service.js";

export const EmployeeController = {
    createEmployee: catchAsync(async (req, res) => {
        const result = await EmployeeService.createEmployee(
            prisma,
            req.body,
            req.user.id
        );

        sendResponse(res, {
            statusCode: StatusCodes.CREATED,
            success: true,
            message: "Employee created successfully",
            data: result,
        });
    }),

    getAllEmployees: catchAsync(async (req, res) => {
        const result = await EmployeeService.getAllEmployees(prisma, req.user.id);

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "Employees retrieved successfully",
            data: result,
        });
    }),

    getSingleEmployee: catchAsync(async (req, res) => {
        const result = await EmployeeService.getSingleEmployee(
            prisma,
            req.params.id,
            req.user.id
        );

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "Employee retrieved successfully",
            data: result,
        });
    }),

    updateEmployee: catchAsync(async (req, res) => {
        const result = await EmployeeService.updateEmployee(
            prisma,
            req.params.id,
            req.body,
            req.user.id
        );

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "Employee updated successfully",
            data: result,
        });
    }),

    deleteEmployee: catchAsync(async (req, res) => {
        const result = await EmployeeService.deleteEmployee(
            prisma,
            req.params.id,
            req.user.id
        );

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "Employee deleted successfully",
            data: null,
        });
    }),
};
