import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";

import { sendResponse } from "../../../utils/sendResponse.js";
import { ProjectManagementService } from "./project_management.service.js";

const createProject = catchAsync(async (req, res) => {
    const payload = { ...req.body };

    // Format meetings if provided (handle potential stringified JSON from multipart)
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
            fileType: "SLA", // Default
        }));
    }

    const result = await ProjectManagementService.createProject(prisma, payload, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Project created successfully with associated files and meetings",
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
