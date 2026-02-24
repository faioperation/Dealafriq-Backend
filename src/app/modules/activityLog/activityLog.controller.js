import { StatusCodes } from "http-status-codes";
import prisma from "../../prisma/client.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { ActivityLogService } from "./activityLog.service.js";

const getAllLogs = catchAsync(async (req, res) => {
    const result = await ActivityLogService.getAllLogs(prisma, req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Activity logs retrieved successfully",
        data: result,
    });
});

const getProjectLogs = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const result = await ActivityLogService.getProjectLogs(prisma, projectId);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project activity logs retrieved successfully",
        data: result,
    });
});

export const ActivityLogController = {
    getAllLogs,
    getProjectLogs,
};
