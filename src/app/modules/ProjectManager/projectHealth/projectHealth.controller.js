import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { ProjectHealthService } from "./projectHealth.service.js";

const updateHealth = catchAsync(async (req, res) => {
    const result = await ProjectHealthService.updateHealth(prisma, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project health updated successfully",
        data: result,
    });
});

const updateHealthById = catchAsync(async (req, res) => {
    const result = await ProjectHealthService.updateHealthById(prisma, req.params.id, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project health record updated successfully",
        data: result,
    });
});

const getHealth = catchAsync(async (req, res) => {
    const result = await ProjectHealthService.getHealth(prisma, req.params.projectId, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project health fetched successfully",
        data: result,
    });
});

const getSingleHealth = catchAsync(async (req, res) => {
    const result = await ProjectHealthService.getSingleHealth(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project health record fetched successfully",
        data: result,
    });
});

const deleteHealth = catchAsync(async (req, res) => {
    const result = await ProjectHealthService.deleteHealth(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project health record deleted successfully",
        data: { id: req.params.id },
    });
});

export const ProjectHealthController = {
    updateHealth,
    updateHealthById,
    getHealth,
    getSingleHealth,
    deleteHealth,
};
