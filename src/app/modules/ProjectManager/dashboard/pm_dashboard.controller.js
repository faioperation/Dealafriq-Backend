import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { PMDashboardService } from "./pm_dashboard.service.js";

const getDashboardData = catchAsync(async (req, res) => {
    const result = await PMDashboardService.getPMDashboardData(prisma, req.user.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "PM Dashboard data fetched successfully",
        data: result,
    });
});

export const PMDashboardController = {
    getDashboardData,
};
