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
            message: "Top 3 latest projects retrieved successfully",
            data: result,
        });
    }),
};
