import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { RaiddService } from "./raidd.service.js";

const createRaidd = catchAsync(async (req, res) => {
    const result = await RaiddService.createRaidd(prisma, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "RAIDD record created successfully",
        data: result,
    });
});

const getAllMyRaidds = catchAsync(async (req, res) => {
    const result = await RaiddService.getAllMyRaidds(prisma, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "All RAIDD records fetched successfully",
        data: result,
    });
});

const getAllRaidds = catchAsync(async (req, res) => {
    const result = await RaiddService.getAllRaidds(prisma, req.params.projectId, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "RAIDD records fetched successfully",
        data: result,
    });
});

const getSingleRaidd = catchAsync(async (req, res) => {
    const result = await RaiddService.getSingleRaidd(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "RAIDD record fetched successfully",
        data: result,
    });
});

const updateRaidd = catchAsync(async (req, res) => {
    const result = await RaiddService.updateRaidd(prisma, req.params.id, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "RAIDD record updated successfully",
        data: result,
    });
});

const deleteRaidd = catchAsync(async (req, res) => {
    await RaiddService.deleteRaidd(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "RAIDD record deleted successfully",
        data: null,
    });
});

export const RaiddController = {
    createRaidd,
    getAllMyRaidds,
    getAllRaidds,
    getSingleRaidd,
    updateRaidd,
    deleteRaidd,
};
