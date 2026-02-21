import { StatusCodes } from "http-status-codes";


import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";

import { sendResponse } from "../../../utils/sendResponse.js";
import { PMProjectManagementService } from "./project_management.service.js";

const createProject = catchAsync(async (req, res) => {
    const result = await PMProjectManagementService.createProject(prisma, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Project created successfully",
        data: result,
    });
});

const getMyProjects = catchAsync(async (req, res) => {
    const result = await PMProjectManagementService.getMyProjects(prisma, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Projects fetched successfully",
        data: result,
    });
});

const getSingleProject = catchAsync(async (req, res) => {
    const result = await PMProjectManagementService.getSingleProject(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project fetched successfully",
        data: result,
    });
});
const deleteSingleProject = catchAsync(async (req, res) => {
   await PMProjectManagementService.deleteSingleProject(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project deleted successfully",
        data: { id: req.params.id },
    });
});

const updateProject = catchAsync(async (req, res) => {
    const result = await PMProjectManagementService.updateProject(prisma, req.params.id, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project updated successfully",
        data: result,
    });
});

export const PMProjectManagementController = {
    createProject,
    getMyProjects,
    getSingleProject,
    updateProject,
    deleteSingleProject
};
