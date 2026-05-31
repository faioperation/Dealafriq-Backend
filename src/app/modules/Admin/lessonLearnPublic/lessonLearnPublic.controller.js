import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { LessonLearnPublicService } from "./lessonLearnPublic.service.js";

const getAllPublicLessonLearns = catchAsync(async (req, res) => {
    const result = await LessonLearnPublicService.getAllPublicLessonLearns(prisma);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Public LessonLearn records fetched successfully",
        data: result,
    });
});

const getSinglePublicLessonLearn = catchAsync(async (req, res) => {
    const result = await LessonLearnPublicService.getSinglePublicLessonLearn(prisma, req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Public LessonLearn record fetched successfully",
        data: result,
    });
});

export const LessonLearnPublicController = {
    getAllPublicLessonLearns,
    getSinglePublicLessonLearn,
};
