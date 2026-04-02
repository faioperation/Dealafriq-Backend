import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { DashboardService } from "./dashboard.service.js";

const getDashboardData = catchAsync(async (req, res) => {
    const result = await DashboardService.getDashboardStats(prisma);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Dashboard data fetched successfully",
        data: result,
    });
});

export const DashboardController = {
    getDashboardData,
};
