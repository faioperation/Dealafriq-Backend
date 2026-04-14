import { StatusCodes } from "http-status-codes";
import axios from "axios";
import crypto from "crypto";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { AppError } from "../../../errorHelper/appError.js";
import { ProjectChatbotService } from "./projectChatbot.service.js";
import { envVars } from "../../../config/env.js";

const createMessage = catchAsync(async (req, res) => {
    let { content, sender, agentName, sessionId, projectId } = req.body;

    // If projectId is provided and sessionId is empty, try to reuse existing session or generate a new one
    if (projectId && !sessionId) {
        const existingMessage = await prisma.message.findFirst({
            where: { projectId: projectId, userId: req.user.id, sessionId: { not: null } },
            orderBy: { createdAt: "desc" }
        });

        if (existingMessage && existingMessage.sessionId) {
            sessionId = existingMessage.sessionId;
        } else {
            sessionId = crypto.randomUUID();
        }
    }

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
        documentUrl: req.file ? `${envVars.BACKEND_URL}/uploads/${req.file.filename}` : null,
        sessionId: sessionId ?? null,
        projectId: projectId ?? null,
    };

    await ProjectChatbotService.createMessage(prisma, payload, req.user.id);

    let aiMessageResult = null;

    if (projectId) {
        try {
            // Send request to AI endpoint
            const aiEndpoint = `${envVars.AI_CHATBOT_API || "https://ai2.pmify.cloud/api/v1"}/chat/`;
            const aiResponse = await axios.post(aiEndpoint, {
                message: content,
                session_id: sessionId || req.user.id,
                project_id: projectId,
                role: "USER"
            });

            // If the AI returns a message string/response, save it as a new message from AGENT
            const aiReplyContent = aiResponse?.data?.reply;
            if (aiReplyContent) {
                const aiPayload = {
                    content: aiReplyContent,
                    sender: "AGENT",
                    agentName: "AI Assistant",
                    sessionId: sessionId ?? null,
                    projectId: projectId ?? null,
                };
                aiMessageResult = await ProjectChatbotService.createMessage(prisma, aiPayload, req.user.id);
            }
        } catch (error) {
            console.error("Error communicating with AI Chatbot:", error?.response?.data || error.message);
        }
    }

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Message created successfully",
        data: {
            aiMessage: aiMessageResult
        },
    });
});

const getMessagesBySessionId = catchAsync(async (req, res) => {
    const { sessionId } = req.params;
    const result = await ProjectChatbotService.getMessagesBySessionId(prisma, sessionId, req.user.id);
    
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Messages successfully retrieved for session",
        data: result,
    });
});

const getChatbotSessions = catchAsync(async (req, res) => {
    const result = await ProjectChatbotService.getChatbotSessions(prisma, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Chatbot sessions fetched successfully",
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
    getChatbotSessions,
    getSingleMessage,
    updateMessage,
    deleteMessage,
    clearMyMessages,
    getMessagesBySessionId,
};
