import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { AiDetectionService } from "./aiDetection.service.js";

const createAiDetection = catchAsync(async (req, res) => {
    const result = await AiDetectionService.createAiDetection(prisma, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "AI Detection record created successfully",
        data: result,
    });
});

const getAllAiDetections = catchAsync(async (req, res) => {
    const result = await AiDetectionService.getAllAiDetections(prisma, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "AI Detection records fetched successfully",
        data: result,
    });
});

const getAiDetectionById = catchAsync(async (req, res) => {
    const result = await AiDetectionService.getAiDetectionById(prisma, req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "AI Detection record fetched successfully",
        data: result,
    });
});

const updateAiDetection = catchAsync(async (req, res) => {
    const result = await AiDetectionService.updateAiDetection(prisma, req.params.id, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "AI Detection record updated successfully",
        data: result,
    });
});

const deleteAiDetection = catchAsync(async (req, res) => {
    const result = await AiDetectionService.deleteAiDetection(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "AI Detection record deleted successfully",
        data: { id: req.params.id },
    });
});

export const AiDetectionController = {
    createAiDetection,
    getAllAiDetections,
    getAiDetectionById,
    updateAiDetection,
    deleteAiDetection,
};
