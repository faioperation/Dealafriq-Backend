import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { ProjectHealthService } from "./projectHealth.service.js";

const upsertHealth = catchAsync(async (req, res) => {
    const result = await ProjectHealthService.upsertHealth(prisma, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project health upserted successfully",
        data: result,
    });
});

const getHealthByProjectId = catchAsync(async (req, res) => {
    const result = await ProjectHealthService.getHealthByProjectId(prisma, req.params.projectId, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project health records fetched successfully",
        data: result,
    });
});

const deleteHealthByProjectId = catchAsync(async (req, res) => {
    const result = await ProjectHealthService.deleteHealthByProjectId(prisma, req.params.projectId, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project health records deleted successfully",
        data: result,
    });
});

export const ProjectHealthController = {
    upsertHealth,
    getHealthByProjectId,
    deleteHealthByProjectId,
};
