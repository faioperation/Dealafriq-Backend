import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { LessonLearnService } from "./leasonLearn.service.js";

const createLessonLearn = catchAsync(async (req, res) => {
    const result = await LessonLearnService.createLessonLearn(prisma, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "LessonLearn record created successfully",
        data: result,
    });
});

const getAllLessonLearns = catchAsync(async (req, res) => {
    const result = await LessonLearnService.getAllLessonLearns(prisma, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "LessonLearn records fetched successfully",
        data: result,
    });
});

const getSingleLessonLearn = catchAsync(async (req, res) => {
    const result = await LessonLearnService.getSingleLessonLearn(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "LessonLearn record fetched successfully",
        data: result,
    });
});

const updateLessonLearn = catchAsync(async (req, res) => {
    const result = await LessonLearnService.updateLessonLearn(prisma, req.params.id, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "LessonLearn record updated successfully",
        data: result,
    });
});

const deleteLessonLearn = catchAsync(async (req, res) => {
    await LessonLearnService.deleteLessonLearn(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "LessonLearn record deleted successfully",
        data: null,
    });
});

export const LessonLearnController = {
    createLessonLearn,
    getAllLessonLearns,
    getSingleLessonLearn,
    updateLessonLearn,
    deleteLessonLearn,
};
