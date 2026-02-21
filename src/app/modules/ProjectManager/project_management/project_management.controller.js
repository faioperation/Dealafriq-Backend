import { StatusCodes } from "http-status-codes";


import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";

import { sendResponse } from "../../../utils/sendResponse.js";
import { PMProjectManagementService } from "./project_management.service.js";

const createProject = catchAsync(async (req, res) => {
    const payload = { ...req.body };

    // Format meetings if provided
    if (typeof payload.meetings === "string") {
        try {
            payload.meetings = JSON.parse(payload.meetings);
        } catch (e) {
            payload.meetings = [];
        }
    }

    // Handle uploaded documents
    if (req.files && req.files.documents) {
        payload.documents = req.files.documents.map(file => ({
            fileName: file.originalname,
            fileUrl: `${req.protocol}://${req.get("host")}/uploads/project-documents/${file.filename}`,
            filePath: `uploads/project-documents/${file.filename}`,
        }));
    }

    // Handle uploaded agreements
    if (req.files && req.files.agreements) {
        payload.agreements = req.files.agreements.map(file => ({
            fileName: file.originalname,
            fileUrl: `${req.protocol}://${req.get("host")}/uploads/project-agreements/${file.filename}`,
            filePath: `uploads/project-agreements/${file.filename}`,
            fileType: "SLA",
        }));
    }

    const result = await PMProjectManagementService.createProject(prisma, payload, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Project created successfully with associated files and meetings",
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
