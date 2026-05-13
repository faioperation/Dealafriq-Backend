import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { AiPushService } from "./aiPush.service.js";
import prisma from "../../../prisma/client.js";

const syncProjectData = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const result = await AiPushService.syncProjectData(projectId, req.body, req.user?.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Project AI data synced successfully",
        data: result
    });
});

const syncRaiddData = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const result = await AiPushService.syncRaiddData(projectId, req.body, req.user?.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "RAIDD AI data synced successfully",
        data: result
    });
});

const syncEmailData = catchAsync(async (req, res) => {
    const { emailId } = req.params; // This param name is fine as it acts as a generic id
    const result = await AiPushService.syncUnifiedEmailData(emailId, req.body, req.user?.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Email/Outlook AI data synced successfully",
        data: result
    });
});

const syncOutlookData = catchAsync(async (req, res) => {
    const { outlookId } = req.params;
    const result = await AiPushService.syncOutlookData(outlookId, req.body, req.user?.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Outlook AI data synced successfully",
        data: result
    });
});

const syncMeetingAiData = catchAsync(async (req, res) => {
    const { meetingId } = req.params;
    const result = await AiPushService.syncMeetingAiData(meetingId, req.body, req.user?.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Meeting AI data synced successfully",
        data: result
    });
});

const syncDocumentAiData = catchAsync(async (req, res) => {
    const { documentId } = req.params;
    const result = await AiPushService.syncDocumentAiData(documentId, req.body, req.user?.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Document AI data synced successfully",
        data: result
    });
});

const syncWeeklyAiSummary = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const result = await AiPushService.syncWeeklyAiSummary(projectId, req.body, req.user?.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Weekly AI summary synced successfully",
        data: result
    });
});

export const AiPushController = {
    syncProjectData,
    syncRaiddData,
    syncEmailData,
    syncOutlookData,
    syncMeetingAiData,
    syncDocumentAiData,
    syncWeeklyAiSummary
};
