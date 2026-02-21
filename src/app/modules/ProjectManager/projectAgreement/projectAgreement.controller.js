import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { ProjectAgreementService } from "./projectAgreement.service.js";
import prisma from "../../../prisma/client.js";

const uploadAgreement = catchAsync(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        throw new Error("Agreement files are required");
    }

    const payloads = req.files.map(file => ({
        projectId: req.body.projectId,
        fileType: req.body.fileType,
        fileName: file.originalname,
        fileUrl: `${req.protocol}://${req.get("host")}/uploads/project-agreements/${file.filename}`,
        filePath: `uploads/project-agreements/${file.filename}`,
    }));

    const result = await ProjectAgreementService.uploadAgreements(prisma, payloads, req.user.id);

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: `${result.length} agreement(s) uploaded successfully`,
        data: result,
    });
});

const getAllAgreements = catchAsync(async (req, res) => {
    const result = await ProjectAgreementService.getAllAgreements(prisma, req.params.projectId, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project agreements fetched successfully",
        data: result,
    });
});

const getSingleAgreement = catchAsync(async (req, res) => {
    const result = await ProjectAgreementService.getSingleAgreement(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project agreement fetched successfully",
        data: result,
    });
});

const deleteAgreement = catchAsync(async (req, res) => {
    const result = await ProjectAgreementService.deleteAgreement(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project agreement deleted successfully",
        data: result,
    });
});

export const ProjectAgreementController = {
    uploadAgreement,
    getAllAgreements,
    getSingleAgreement,
    deleteAgreement,
};
