import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { AppError } from "../../../errorHelper/appError.js";
import { ProjectChatbotService } from "./projectChatbot.service.js";

const createMessage = catchAsync(async (req, res) => {
    const { content, sender, agentName } = req.body;

    // Basic validation (handles both JSON and form-data)
    if (!content) throw new AppError(StatusCodes.BAD_REQUEST, "content is required");
    if (!["USER", "AGENT"].includes(sender)) {
        throw new AppError(StatusCodes.BAD_REQUEST, "sender must be USER or AGENT");
    }

    const payload = {
        content,
        sender,
        agentName: agentName ?? null,
        documentPath: req.file ? `/uploads/${req.file.filename}` : null,
        documentUrl: req.file ? `${process.env.BACKEND_URL}/uploads/${req.file.filename}` : null,
    };

    const result = await ProjectChatbotService.createMessage(prisma, payload, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Message created successfully",
        data: result,
    });
});

const getMyMessages = catchAsync(async (req, res) => {
    const result = await ProjectChatbotService.getMyMessages(prisma, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Messages fetched successfully",
        data: result,
    });
});

const getSingleMessage = catchAsync(async (req, res) => {
    const result = await ProjectChatbotService.getSingleMessage(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Message fetched successfully",
        data: result,
    });
});

const updateMessage = catchAsync(async (req, res) => {
    const payload = { ...req.body };

    // If a new file was uploaded, overwrite document fields
    if (req.file) {
        payload.documentPath = `/uploads/${req.file.filename}`;
        payload.documentUrl = `${process.env.BACKEND_URL}/uploads/${req.file.filename}`;
    }

    const result = await ProjectChatbotService.updateMessage(
        prisma,
        req.params.id,
        payload,
        req.user.id,
    );
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Message updated successfully",
        data: result,
    });
});

const deleteMessage = catchAsync(async (req, res) => {
    await ProjectChatbotService.deleteMessage(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Message deleted successfully",
        data: { id: req.params.id },
    });
});

const clearMyMessages = catchAsync(async (req, res) => {
    const result = await ProjectChatbotService.clearMyMessages(prisma, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "All your messages cleared successfully",
        data: result,
    });
});

export const ProjectChatbotController = {
    createMessage,
    getMyMessages,
    getSingleMessage,
    updateMessage,
    deleteMessage,
    clearMyMessages,
};
