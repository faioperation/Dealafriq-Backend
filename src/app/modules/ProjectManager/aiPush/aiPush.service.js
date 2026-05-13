import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { AppError } from "../../../errorHelper/appError.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";
import { RaiddService } from "../raiddManagement/raidd.service.js";

const syncProjectData = async (projectId, payload, userId) => {
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });

    if (!project) {
        throw new AppError(StatusCodes.NOT_FOUND, "Project not found");
    }

    console.log(`[AI Push Sync] Received Project Data Sync for Project: ${project.name} (ID: ${projectId})`);
    console.log(`[AI Push Sync] Payload:`, JSON.stringify(payload, null, 2));

    const { summary, weeklySummary, projectHealth, raiddData, fullAiResponse, discussionPoints, actionPoints, notes } = payload;

    // Update project with AI data
    const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
            projectAiSummary: summary ? { push: summary } : undefined,
            projectAiDetails: fullAiResponse || payload,
            projectHealth: projectHealth || undefined,
            discussionPoints: discussionPoints || undefined,
            actionPoints: actionPoints || undefined,
            notes: notes || undefined
        }
    });

    // Handle RAIDD Data
    if (raiddData) {
        await RaiddService.syncIndividualItems(prisma, projectId, raiddData, null, {});
    }

    await ActivityLogService.createLog(prisma, {
        type: "project",
        crudId: projectId,
        action: "ai-push-sync",
        userId: userId || project.managerId,
        projectId
    });

    console.log(`[AI Push Sync] Project ${project.name} updated successfully in database.`);
    console.log(`[AI Push Sync] Final Updated Project Data:`, JSON.stringify(updatedProject, null, 2));
    return updatedProject;
};

const syncRaiddData = async (projectId, payload, userId) => {
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });

    if (!project) {
        throw new AppError(StatusCodes.NOT_FOUND, "Project not found");
    }

    console.log(`[AI Push RAIDD Sync] Received RAIDD Sync for Project: ${project.name} (ID: ${projectId})`);
    console.log(`[AI Push RAIDD Sync] Payload:`, JSON.stringify(payload, null, 2));

    const { raiddData } = payload;

    if (raiddData) {
        await RaiddService.syncIndividualItems(prisma, projectId, raiddData, null, {});
    }

    await ActivityLogService.createLog(prisma, {
        type: "raidd",
        crudId: projectId,
        action: "ai-push-raidd-sync",
        userId: userId || project.managerId,
        projectId
    });

    console.log(`[AI Push RAIDD Sync] RAIDD data for Project ${project.name} updated successfully in database.`);
    return { message: "RAIDD data synced successfully" };
};

const syncEmailData = async (emailId, payload, userId) => {
    const email = await prisma.email.findUnique({
        where: { id: emailId }
    });

    if (!email) {
        throw new AppError(StatusCodes.NOT_FOUND, "Email record not found");
    }

    console.log(`[AI Push Email Sync] Received AI Data for Email ID: ${emailId}`);
    console.log(`[AI Push Email Sync] Payload:`, JSON.stringify(payload, null, 2));

    const { summary, tasks, raiddAnalysis, raiddData, raidData, decisions, sentiment, generatedReply, fullAiResponse } = payload;
    const finalRaiddData = raiddData || raidData;

    const updatedEmail = await prisma.email.update({
        where: { id: emailId },
        data: {
            summary: summary || undefined,
            tasks: tasks || undefined,
            raiddAnalysis: raiddAnalysis || undefined,
            raiddData: finalRaiddData || undefined,
            decisions: decisions || undefined,
            sentiment: sentiment || undefined,
            generatedReply: generatedReply || undefined,
            fullAiResponse: fullAiResponse || payload
        }
    });

    // Sync RAIDD to project if links exist
    if (finalRaiddData) {
        // Find project by client if possible
        const clientProjects = await prisma.project.findMany({
            where: { clientId: email.clientId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1
        });

        if (clientProjects.length > 0) {
            await RaiddService.syncIndividualItems(prisma, clientProjects[0].id, finalRaiddData, null, { emailId });
        }
    }

    console.log(`[AI Push Email Sync] Email ${emailId} updated successfully in database.`);
    console.log(`[AI Push Email Sync] Final Updated Email Data:`, JSON.stringify(updatedEmail, null, 2));
    return updatedEmail;
};

const syncOutlookData = async (outlookId, payload, userId) => {
    const outlook = await prisma.outlook.findUnique({
        where: { id: outlookId }
    });

    if (!outlook) {
        throw new AppError(StatusCodes.NOT_FOUND, "Outlook record not found");
    }

    console.log(`[AI Push Outlook Sync] Received AI Data for Outlook ID: ${outlookId}`);
    console.log(`[AI Push Outlook Sync] Payload:`, JSON.stringify(payload, null, 2));

    const { summary, tasks, raiddAnalysis, raiddData, raidData, decisions, sentiment, generatedReply, fullAiResponse } = payload;
    const finalRaiddData = raiddData || raidData;

    const updatedOutlook = await prisma.outlook.update({
        where: { id: outlookId },
        data: {
            summary: summary || undefined,
            tasks: tasks || undefined,
            raiddAnalysis: raiddAnalysis || undefined,
            raiddData: finalRaiddData || undefined,
            decisions: decisions || undefined,
            sentiment: sentiment || undefined,
            generatedReply: generatedReply || undefined,
            fullAiResponse: fullAiResponse || payload
        }
    });

    // Sync RAIDD to project if links exist
    if (finalRaiddData) {
        const clientProjects = await prisma.project.findMany({
            where: { clientId: outlook.clientId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1
        });

        if (clientProjects.length > 0) {
            await RaiddService.syncIndividualItems(prisma, clientProjects[0].id, finalRaiddData, null, { outlookId });
        }
    }

    console.log(`[AI Push Outlook Sync] Outlook record ${outlookId} updated successfully in database.`);
    console.log(`[AI Push Outlook Sync] Final Updated Outlook Data:`, JSON.stringify(updatedOutlook, null, 2));
    return updatedOutlook;
};

const syncMeetingAiData = async (meetingId, payload, userId) => {
    const meeting = await prisma.projectMeeting.findUnique({
        where: { id: meetingId }
    });

    if (!meeting) {
        throw new AppError(StatusCodes.NOT_FOUND, "Meeting not found");
    }

    console.log(`[AI Push Meeting Sync] Received Meeting AI Data for Meeting ID: ${meetingId} (Project ID: ${meeting.projectId})`);
    console.log(`[AI Push Meeting Sync] Payload:`, JSON.stringify(payload, null, 2));

    const { notes, agenda, keyPoints, actionPoints } = payload;

    const updatedMeeting = await prisma.projectMeeting.update({
        where: { id: meetingId },
        data: {
            notes: notes || undefined,
            agenda: agenda || undefined,
            keyPoints: keyPoints || undefined,
            actionPoints: actionPoints || undefined
        }
    });

    console.log(`[AI Push Meeting Sync] Meeting ${meetingId} updated successfully in database.`);
    console.log(`[AI Push Meeting Sync] Final Updated Meeting Data:`, JSON.stringify(updatedMeeting, null, 2));
    return updatedMeeting;
};

const syncDocumentAiData = async (documentId, payload, userId) => {
    const document = await prisma.projectDocumentUpload.findUnique({
        where: { id: documentId }
    });

    if (!document) {
        throw new AppError(StatusCodes.NOT_FOUND, "Document record not found");
    }

    const { aiDocumentSummary, keyPoints, actionPoints } = payload;

    const updatedDocument = await prisma.projectDocumentUpload.update({
        where: { id: documentId },
        data: {
            aiDocumentSummary: aiDocumentSummary || undefined,
            keyPoints: keyPoints || undefined,
            actionPoints: actionPoints || undefined
        }
    });

    return updatedDocument;
};

const syncWeeklyAiSummary = async (projectId, payload, userId) => {
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });

    if (!project) {
        throw new AppError(StatusCodes.NOT_FOUND, "Project not found");
    }

    console.log(`[AI Push Weekly Summary] Received Weekly Summary for Project: ${project.name} (ID: ${projectId})`);
    console.log(`[AI Push Weekly Summary] Payload:`, JSON.stringify(payload, null, 2));

    const { weeklyAiSummary } = payload;

    const result = await prisma.weeklyAiSummary.create({
        data: {
            projectId,
            weeklyAiSummary: weeklyAiSummary || ""
        }
    });

    // Update the latest summary in Project model's weeklyMeetingSummary field
    await prisma.project.update({
        where: { id: projectId },
        data: {
            weeklyMeetingSummary: weeklyAiSummary || ""
        }
    });

    console.log(`[AI Push Weekly Summary] Weekly Summary for Project ${project.name} created and updated in Project model successfully.`);
    console.log(`[AI Push Weekly Summary] Final Weekly Summary Data:`, JSON.stringify(result, null, 2));
    return result;
};

const syncUnifiedEmailData = async (id, payload, userId) => {
    // Try finding in Email first
    const email = await prisma.email.findUnique({
        where: { id }
    });

    if (email) {
        return await syncEmailData(id, payload, userId);
    }

    // Try finding in Outlook
    const outlook = await prisma.outlook.findUnique({
        where: { id }
    });

    if (outlook) {
        return await syncOutlookData(id, payload, userId);
    }

    throw new AppError(StatusCodes.NOT_FOUND, "Record not found in either Email or Outlook tables");
};

export const AiPushService = {
    syncProjectData,
    syncRaiddData,
    syncEmailData,
    syncOutlookData,
    syncUnifiedEmailData,
    syncMeetingAiData,
    syncDocumentAiData,
    syncWeeklyAiSummary
};
