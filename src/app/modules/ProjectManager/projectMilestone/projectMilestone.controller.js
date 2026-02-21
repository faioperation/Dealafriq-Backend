import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { ProjectMilestoneService } from "./projectMilestone.service.js";
import prisma from "../../../prisma/client.js";

const createMilestone = catchAsync(async (req, res) => {
    const result = await ProjectMilestoneService.createMilestone(prisma, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Milestone created successfully",
        data: result,
    });
});

const getAllMilestones = catchAsync(async (req, res) => {
    const result = await ProjectMilestoneService.getAllMilestones(prisma, req.params.projectId, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Milestones fetched successfully",
        data: result,
    });
});

const getSingleMilestone = catchAsync(async (req, res) => {
    const result = await ProjectMilestoneService.getSingleMilestone(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Milestone fetched successfully",
        data: result,
    });
});

const updateMilestone = catchAsync(async (req, res) => {
    const result = await ProjectMilestoneService.updateMilestone(prisma, req.params.id, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Milestone updated successfully",
        data: result,
    });
});

const deleteMilestone = catchAsync(async (req, res) => {
    const result = await ProjectMilestoneService.deleteMilestone(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Milestone deleted successfully",
        data: result,
    });
});

export const ProjectMilestoneController = {
    createMilestone,
    getAllMilestones,
    getSingleMilestone,
    updateMilestone,
    deleteMilestone,
};
