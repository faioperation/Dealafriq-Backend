import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { ProjectMeetingService } from "./projectMeeting.service.js";
import prisma from "../../../prisma/client.js";

const createMeeting = catchAsync(async (req, res) => {
    const result = await ProjectMeetingService.createMeeting(prisma, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Meeting created successfully",
        data: result,
    });
});

const getAllMeetings = catchAsync(async (req, res) => {
    const result = await ProjectMeetingService.getAllMeetings(prisma, req.params.projectId, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Meetings fetched successfully",
        data: result,
    });
});

const getSingleMeeting = catchAsync(async (req, res) => {
    const result = await ProjectMeetingService.getSingleMeeting(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Meeting fetched successfully",
        data: result,
    });
});

const updateMeeting = catchAsync(async (req, res) => {
    const result = await ProjectMeetingService.updateMeeting(prisma, req.params.id, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Meeting updated successfully",
        data: result,
    });
});

const deleteMeeting = catchAsync(async (req, res) => {
    const result = await ProjectMeetingService.deleteMeeting(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Meeting deleted successfully",
        data: result,
    });
});

export const ProjectMeetingController = {
    createMeeting,
    getAllMeetings,
    getSingleMeeting,
    updateMeeting,
    deleteMeeting,
};
