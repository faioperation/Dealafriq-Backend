import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { ProjectManagerService } from "./project_manager.service.js";

export const ProjectManagerController = {
    createProjectManager: catchAsync(async (req, res) => {
        const result = await ProjectManagerService.createProjectManager(
            prisma,
            req.body,
            req.user.id
        );

        sendResponse(res, {
            statusCode: StatusCodes.CREATED,
            success: true,
            message: "Project Manager created successfully",
            data: result,
        });
    }),

    getAllProjectManagers: catchAsync(async (req, res) => {
        const result = await ProjectManagerService.getAllProjectManagers(prisma);

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "Project Managers retrieved successfully",
            data: result,
        });
    }),

    getSingleProjectManager: catchAsync(async (req, res) => {
        const result = await ProjectManagerService.getSingleProjectManager(
            prisma,
            req.params.id
        );

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "Project Manager retrieved successfully",
            data: result,
        });
    }),

    updateProjectManager: catchAsync(async (req, res) => {
        const result = await ProjectManagerService.updateProjectManager(
            prisma,
            req.params.id,
            req.body,
            req.user.id
        );

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "Project Manager updated successfully",
            data: result,
        });
    }),

    deleteProjectManager: catchAsync(async (req, res) => {
        await ProjectManagerService.deleteProjectManager(
            prisma,
            req.params.id,
            req.user.id
        );

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "Project Manager deleted successfully",
            data: {},
        });
    }),

    approveProjectManager: catchAsync(async (req, res) => {
        const result = await ProjectManagerService.approveProjectManager(
            prisma,
            req.params.id,
            req.user.id
        );

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "Project Manager approved successfully",
            data: result,
        });
    }),
};
