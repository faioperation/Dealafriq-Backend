import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";

import { sendResponse } from "../../../utils/sendResponse.js";
import { ProjectManagementService } from "./project_management.service.js";

const createProject = catchAsync(async (req, res) => {
    const result = await ProjectManagementService.createProject(prisma, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Project created successfully",
        data: result,
    });
});

const getAllProjects = catchAsync(async (req, res) => {
    const result = await ProjectManagementService.getAllProjects(prisma);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Projects fetched successfully",
        data: result,
    });
});

const getSingleProject = catchAsync(async (req, res) => {
    const result = await ProjectManagementService.getSingleProject(prisma, req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project fetched successfully",
        data: result,
    });
});

const updateProject = catchAsync(async (req, res) => {
    const result = await ProjectManagementService.updateProject(prisma, req.params.id, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project updated successfully",
        data: result,
    });
});

const deleteProject = catchAsync(async (req, res) => {
    const result = await ProjectManagementService.deleteProject(prisma, req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project deleted successfully",
        data: result,
    });
});

export const ProjectManagementController = {
    createProject,
    getAllProjects,
    getSingleProject,
    updateProject,
    deleteProject,
};
