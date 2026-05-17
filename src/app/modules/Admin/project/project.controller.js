import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { AdminProjectService } from "./project.service.js";

export const AdminProjectController = {
    getAllProjects: catchAsync(async (req, res) => {
        const result = await AdminProjectService.getAllProjects(prisma, req.query);

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "Projects retrieved successfully",
            meta: result.meta,
            data: result.data,
        });
    }),

    getAllProjectsWithRaidd: catchAsync(async (req, res) => {
        const result = await AdminProjectService.getAllProjectsWithRaidd(prisma, req.query);

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "Projects with RAIDDs retrieved successfully",
            meta: result.meta,
            data: result.data,
        });
    }),

    getAllProjectsWithRaiddForChatbot: catchAsync(async (req, res) => {
        const result = await AdminProjectService.getAllProjectsWithRaiddForChatbot(prisma, req.query);

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "Projects with RAIDDs for chatbot retrieved successfully",
            meta: result.meta,
            data: result.data,
        });
    }),

    getProjectWithRaiddById: catchAsync(async (req, res) => {
        const result = await AdminProjectService.getProjectWithRaiddById(prisma, req.params.id);

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "Project with RAIDD retrieved successfully",
            data: result,
        });
    }),

    getProjectWithRaiddByIdForChatbot: catchAsync(async (req, res) => {
        const result = await AdminProjectService.getProjectWithRaiddByIdForChatbot(prisma, req.params.id);

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "Project with RAIDD for chatbot retrieved successfully",
            data: result,
        });
    }),

    getSingleProject: catchAsync(async (req, res) => {
        const result = await AdminProjectService.getSingleProject(prisma, req.params.id);

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "Project retrieved successfully",
            data: result,
        });
    }),

    getLatestThreeProjects: catchAsync(async (req, res) => {
        const result = await AdminProjectService.getLatestThreeProjects(prisma, req.query);

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "projects retrieved successfully",
            data: result,
        });
    }),
};
