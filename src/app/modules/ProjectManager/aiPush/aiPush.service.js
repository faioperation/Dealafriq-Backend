import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { AppError } from "../../../errorHelper/appError.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";
import { RaiddService } from "../raiddManagement/raidd.service.js";

const saveEmailOrOutlookRaiddItems = async (prisma, sourceKey, sourceId, payload) => {
    const models = [
        { key: "projectRisks", model: "projectRisk", responseKey: "projectRisks" },
        { key: "projectAssumptions", model: "projectAssumption", responseKey: "projectAssumptions" },
        { key: "projectIssues", model: "projectIssue", responseKey: "projectIssues" },
        { key: "projectDecisions", model: "projectDecision", responseKey: "projectDecisions" },
        { key: "projectDependencies", model: "projectDependency", responseKey: "projectDependencies" }
    ];

    const result = {
        projectRisks: [],
        projectAssumptions: [],
        projectIssues: [],
        projectDecisions: [],
        projectDependencies: []
    };

    let fullAiRes = {};
    if (payload.fullAiResponse) {
        if (typeof payload.fullAiResponse === 'string') {
            try {
                fullAiRes = JSON.parse(payload.fullAiResponse);
            } catch (e) {
                console.error("Failed to parse fullAiResponse in helper:", e);
            }
        } else if (typeof payload.fullAiResponse === 'object') {
            fullAiRes = payload.fullAiResponse;
        }
    }

    for (const { key, model, responseKey } of models) {
        const items = payload[key] || fullAiRes[key];
        if (Array.isArray(items) && items.length > 0) {
            for (const item of items) {
                let itemData = "";
                if (typeof item === 'string') {
                    itemData = item.trim();
                } else if (item && typeof item.data === 'string') {
                    itemData = item.data.trim();
                }

                if (itemData !== '') {
                    // Check if duplicate already exists for this source and data
                    const whereClause = {
                        [sourceKey]: sourceId,
                        data: itemData
                    };
                    let record = await prisma[model].findFirst({ where: whereClause });
                    if (!record) {
                        record = await prisma[model].create({
                            data: {
                                [sourceKey]: sourceId,
                                data: itemData
                            }
                        });
                    }
                    result[responseKey].push({
                        id: record.id,
                        data: record.data
                    });
                }
            }
        }
    }

    return result;
};

const syncProjectData = async (projectId, payload, userId) => {
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });

    if (!project) {
        throw new AppError(StatusCodes.NOT_FOUND, "Project not found");
    }

    console.log(`[AI Push Sync] Received Project Data Sync for Project: ${project.name} (ID: ${projectId})`);
    console.log(`[AI Push Sync] Payload:`, JSON.stringify(payload, null, 2));

    const { weeklySummary, projectHealth, raiddData, fullAiResponse, discussionPoints, actionPoints, notes } = payload;

    // 1. Extract summary from both direct payload and fullAiResponse
    let fullAiRes = {};
    if (fullAiResponse) {
        if (typeof fullAiResponse === 'string') {
            try {
                fullAiRes = JSON.parse(fullAiResponse);
            } catch (e) {
                console.error("Failed to parse fullAiResponse in syncProjectData:", e);
            }
        } else if (typeof fullAiResponse === 'object') {
            fullAiRes = fullAiResponse;
        }
    }

    const rawSummary = payload.summary || fullAiRes.summary || payload.projectAiSummary || fullAiRes.projectAiSummary;
    let summaryList = [];
    if (rawSummary) {
        if (Array.isArray(rawSummary)) {
            summaryList = rawSummary.filter(s => typeof s === 'string' && s.trim() !== '');
        } else if (typeof rawSummary === 'string' && rawSummary.trim() !== '') {
            summaryList = [rawSummary.trim()];
        }
    }

    // Update project with AI data
    const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
            projectAiSummary: summaryList.length > 0 ? { push: summaryList } : undefined,
            projectAiDetails: fullAiResponse || payload,
            projectHealth: projectHealth || undefined,
            discussionPoints: discussionPoints || undefined,
            actionPoints: actionPoints || undefined,
            notes: notes || undefined,
            aiCheck: true
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

    await prisma.project.update({
        where: { id: projectId },
        data: { aiCheck: true }
    });

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

    // If AI data was already processed/synced once, ONLY update the generatedReply field if provided
    if (email.aiCheck) {
        let fullAiRes = {};
        if (payload.fullAiResponse) {
            if (typeof payload.fullAiResponse === 'string') {
                try {
                    fullAiRes = JSON.parse(payload.fullAiResponse);
                } catch (e) {
                    console.error("Failed to parse fullAiResponse in syncEmailData (aiCheck bypass):", e);
                }
            } else if (typeof payload.fullAiResponse === 'object') {
                fullAiRes = payload.fullAiResponse;
            }
        }
        const generatedReply = payload.generatedReply || fullAiRes.generatedReply;
        if (generatedReply !== undefined) {
            const updatedEmail = await prisma.email.update({
                where: { id: emailId },
                data: {
                    generatedReply: generatedReply
                }
            });
            console.log(`[AI Push Email Sync] email.aiCheck is true. Only updated generatedReply for Email ID: ${emailId}`);
            return updatedEmail;
        }
        console.log(`[AI Push Email Sync] email.aiCheck is true but no new generatedReply in payload.`);
        return email;
    }

    // 1. Save individual unlinked RAIDD items from the email
    const savedRaiddItems = await saveEmailOrOutlookRaiddItems(prisma, "emailId", emailId, payload);

    // 2. Extract fields from payload and fullAiResponse
    let fullAiRes = {};
    if (payload.fullAiResponse) {
        if (typeof payload.fullAiResponse === 'string') {
            try {
                fullAiRes = JSON.parse(payload.fullAiResponse);
            } catch (e) {
                console.error("Failed to parse fullAiResponse in syncEmailData:", e);
            }
        } else if (typeof payload.fullAiResponse === 'object') {
            fullAiRes = payload.fullAiResponse;
        }
    }
    const summary = payload.summary || fullAiRes.summary;
    const tasks = payload.tasks || fullAiRes.tasks;
    const raiddMessage = payload.raiddMessage || fullAiRes.raiddMessage;
    const sentiment = payload.sentiment || fullAiRes.sentiment;
    const generatedReply = payload.generatedReply || fullAiRes.generatedReply;

    // 3. Dynamically build raiddCategory (raiddAnalysis)
    let finalCategories = [];
    const payloadRaiddCategory = payload.raiddCategory || fullAiRes.raiddCategory;
    if (Array.isArray(payloadRaiddCategory)) {
        finalCategories = [...payloadRaiddCategory];
    } else if (typeof payloadRaiddCategory === 'string') {
        finalCategories = payloadRaiddCategory.split(',').map(c => c.trim());
    }

    const checkCategories = [
        { key: "projectRisks", category: "Risk" },
        { key: "projectAssumptions", category: "Assumption" },
        { key: "projectIssues", category: "Issue" },
        { key: "projectDecisions", category: "Decision" },
        { key: "projectDependencies", category: "Dependency" }
    ];

    for (const { key, category } of checkCategories) {
        const items = payload[key] || fullAiRes[key];
        if (Array.isArray(items) && items.length > 0) {
            if (!finalCategories.includes(category)) {
                finalCategories.push(category);
            }
        }
    }

    const finalRaiddData = payload.raiddData || payload.raidData || fullAiRes.raiddData || fullAiRes.raidData || savedRaiddItems;

    const updatedEmail = await prisma.email.update({
        where: { id: emailId },
        data: {
            tasks: tasks || undefined,
            raiddAnalysis: finalCategories.length > 0 ? finalCategories : undefined,
            raiddData: finalRaiddData || undefined,
            decisions: savedRaiddItems.projectDecisions.length > 0 ? savedRaiddItems.projectDecisions : (payload.decisions || fullAiRes.decisions || undefined),
            sentiment: sentiment || undefined,
            generatedReply: generatedReply || undefined,
            raiddMessage: raiddMessage || undefined,
            fullAiResponse: payload.fullAiResponse || payload,
            aiCheck: true
        }
    });

    let aiDetection = null;
    if (finalCategories.length > 0) {
        // Check if an AI Detection record already exists for this email
        const existingAiDetection = await prisma.aiDetection.findFirst({
            where: { emailId: emailId, deletedAt: null }
        });

        if (existingAiDetection) {
            aiDetection = await prisma.aiDetection.update({
                where: { id: existingAiDetection.id },
                data: {
                    title: email.subject || "No Subject",
                    raiddAnalysis: finalCategories,
                    raiddData: finalRaiddData,
                    updatedBy: userId || email.created_by || "system"
                }
            });
            console.log(`[AI Push Email Sync] Updated existing AiDetection record for Email ID: ${emailId}, ID: ${aiDetection.id}`);
        } else {
            aiDetection = await prisma.aiDetection.create({
                data: {
                    title: email.subject || "No Subject",
                    sourceType: "email",
                    managerId: email.created_by || userId,
                    createdBy: userId || email.created_by || "system",
                    raiddAnalysis: finalCategories,
                    raiddData: finalRaiddData,
                    emailId: emailId
                }
            });
            console.log(`[AI Push Email Sync] Created new AiDetection record for Email ID: ${emailId}, ID: ${aiDetection.id}`);
        }

        // Sync RAIDD to project if links exist
        if (finalRaiddData) {
            // Find project by client if possible
            const clientProjects = await prisma.project.findMany({
                where: { clientId: email.clientId, deletedAt: null },
                orderBy: { createdAt: 'desc' },
                take: 1
            });

            if (clientProjects.length > 0) {
                await RaiddService.syncIndividualItems(prisma, clientProjects[0].id, finalRaiddData, null, { emailId, aiDetectionId: aiDetection.id });
            }
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

    // If AI data was already processed/synced once, ONLY update the generatedReply field if provided
    if (outlook.aiCheck) {
        let fullAiRes = {};
        if (payload.fullAiResponse) {
            if (typeof payload.fullAiResponse === 'string') {
                try {
                    fullAiRes = JSON.parse(payload.fullAiResponse);
                } catch (e) {
                    console.error("Failed to parse fullAiResponse in syncOutlookData (aiCheck bypass):", e);
                }
            } else if (typeof payload.fullAiResponse === 'object') {
                fullAiRes = payload.fullAiResponse;
            }
        }
        const generatedReply = payload.generatedReply || fullAiRes.generatedReply;
        if (generatedReply !== undefined) {
            const updatedOutlook = await prisma.outlook.update({
                where: { id: outlookId },
                data: {
                    generatedReply: generatedReply
                }
            });
            console.log(`[AI Push Outlook Sync] outlook.aiCheck is true. Only updated generatedReply for Outlook ID: ${outlookId}`);
            return updatedOutlook;
        }
        console.log(`[AI Push Outlook Sync] outlook.aiCheck is true but no new generatedReply in payload.`);
        return outlook;
    }

    // 1. Save individual unlinked RAIDD items from the outlook record
    const savedRaiddItems = await saveEmailOrOutlookRaiddItems(prisma, "outlookId", outlookId, payload);

    // 2. Extract fields from payload and fullAiResponse
    let fullAiRes = {};
    if (payload.fullAiResponse) {
        if (typeof payload.fullAiResponse === 'string') {
            try {
                fullAiRes = JSON.parse(payload.fullAiResponse);
            } catch (e) {
                console.error("Failed to parse fullAiResponse in syncOutlookData:", e);
            }
        } else if (typeof payload.fullAiResponse === 'object') {
            fullAiRes = payload.fullAiResponse;
        }
    }
    const summary = payload.summary || fullAiRes.summary;
    const tasks = payload.tasks || fullAiRes.tasks;
    const raiddMessage = payload.raiddMessage || fullAiRes.raiddMessage;
    const sentiment = payload.sentiment || fullAiRes.sentiment;
    const generatedReply = payload.generatedReply || fullAiRes.generatedReply;

    // 3. Dynamically build raiddCategory (raiddAnalysis)
    let finalCategories = [];
    const payloadRaiddCategory = payload.raiddCategory || fullAiRes.raiddCategory;
    if (Array.isArray(payloadRaiddCategory)) {
        finalCategories = [...payloadRaiddCategory];
    } else if (typeof payloadRaiddCategory === 'string') {
        finalCategories = payloadRaiddCategory.split(',').map(c => c.trim());
    }

    const checkCategories = [
        { key: "projectRisks", category: "Risk" },
        { key: "projectAssumptions", category: "Assumption" },
        { key: "projectIssues", category: "Issue" },
        { key: "projectDecisions", category: "Decision" },
        { key: "projectDependencies", category: "Dependency" }
    ];

    for (const { key, category } of checkCategories) {
        const items = payload[key] || fullAiRes[key];
        if (Array.isArray(items) && items.length > 0) {
            if (!finalCategories.includes(category)) {
                finalCategories.push(category);
            }
        }
    }

    const finalRaiddData = payload.raiddData || payload.raidData || fullAiRes.raiddData || fullAiRes.raidData || savedRaiddItems;

    const updatedOutlook = await prisma.outlook.update({
        where: { id: outlookId },
        data: {
            tasks: tasks || undefined,
            raiddAnalysis: finalCategories.length > 0 ? finalCategories : undefined,
            raiddData: finalRaiddData || undefined,
            decisions: savedRaiddItems.projectDecisions.length > 0 ? savedRaiddItems.projectDecisions : (payload.decisions || fullAiRes.decisions || undefined),
            sentiment: sentiment || undefined,
            generatedReply: generatedReply || undefined,
            raiddMessage: raiddMessage || undefined,
            fullAiResponse: payload.fullAiResponse || payload,
            aiCheck: true
        }
    });

    let aiDetection = null;
    if (finalCategories.length > 0) {
        // Check if an AI Detection record already exists for this outlook
        const existingAiDetection = await prisma.aiDetection.findFirst({
            where: { outlookId: outlookId, deletedAt: null }
        });

        if (existingAiDetection) {
            aiDetection = await prisma.aiDetection.update({
                where: { id: existingAiDetection.id },
                data: {
                    title: outlook.subject || "No Subject",
                    raiddAnalysis: finalCategories,
                    raiddData: finalRaiddData,
                    updatedBy: userId || outlook.created_by || "system"
                }
            });
            console.log(`[AI Push Outlook Sync] Updated existing AiDetection record for Outlook ID: ${outlookId}, ID: ${aiDetection.id}`);
        } else {
            aiDetection = await prisma.aiDetection.create({
                data: {
                    title: outlook.subject || "No Subject",
                    sourceType: "outlook",
                    managerId: outlook.created_by || userId,
                    createdBy: userId || outlook.created_by || "system",
                    raiddAnalysis: finalCategories,
                    raiddData: finalRaiddData,
                    outlookId: outlookId
                }
            });
            console.log(`[AI Push Outlook Sync] Created new AiDetection record for Outlook ID: ${outlookId}, ID: ${aiDetection.id}`);
        }

        // Sync RAIDD to project if links exist
        if (finalRaiddData) {
            const clientProjects = await prisma.project.findMany({
                where: { clientId: outlook.clientId, deletedAt: null },
                orderBy: { createdAt: 'desc' },
                take: 1
            });

            if (clientProjects.length > 0) {
                await RaiddService.syncIndividualItems(prisma, clientProjects[0].id, finalRaiddData, null, { outlookId, aiDetectionId: aiDetection.id });
            }
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

    // Handle payload if passed as an array of objects
    const dataPayload = Array.isArray(payload) ? (payload[0] || {}) : payload;

    const { notes, agenda, keyPoints, actionPoints, aiMeetingSummary } = dataPayload;

    const nestedOps = {};

    if (keyPoints && Array.isArray(keyPoints)) {
        nestedOps.keyPoints = {
            deleteMany: {},
            create: keyPoints.flat().filter(kp => kp).map(kp => {
                const content = typeof kp === 'string' ? kp : kp.content;
                const status = typeof kp === 'string' ? "TO_BE_VALIDATED" : (kp.status || "TO_BE_VALIDATED");
                return { content, status };
            }).filter(item => item.content && item.content.trim() !== '')
        };
    }

    if (actionPoints && Array.isArray(actionPoints)) {
        nestedOps.actionPoints = {
            deleteMany: {},
            create: actionPoints.flat().filter(ap => ap).map(ap => {
                const content = typeof ap === 'string' ? ap : ap.content;
                const status = typeof ap === 'string' ? "PENDING" : (ap.status || "PENDING");
                return { content, status };
            }).filter(item => item.content && item.content.trim() !== '')
        };
    }

    let aiMeetingSummaryValue = undefined;
    let latestSummaryString = undefined;

    if (aiMeetingSummary) {
        if (Array.isArray(aiMeetingSummary)) {
            if (aiMeetingSummary.length > 0) {
                aiMeetingSummaryValue = { push: aiMeetingSummary };
                latestSummaryString = aiMeetingSummary[aiMeetingSummary.length - 1];
            }
        } else if (typeof aiMeetingSummary === 'string' && aiMeetingSummary.trim() !== '') {
            aiMeetingSummaryValue = { push: aiMeetingSummary };
            latestSummaryString = aiMeetingSummary;
        }
    }

    const updatedMeeting = await prisma.projectMeeting.update({
        where: { id: meetingId },
        data: {
            notes: notes || undefined,
            agenda: agenda || undefined,
            aiMeetingSummary: aiMeetingSummaryValue,
            lastMeetingSummary: latestSummaryString || undefined,
            aiCheck: true,
            rawAiResponse: payload,
            ...nestedOps
        }
    });

    // Fetch project to get owner/manager info for AI Detection record
    const project = await prisma.project.findUnique({
        where: { id: meeting.projectId }
    });
    const managerId = project ? project.managerId : userId;
    const createdBy = project ? project.createdById : (userId || "system");

    let raiddFlags = dataPayload.raiddFlags ||
        dataPayload.raidFlags ||
        dataPayload.raidd_flags ||
        dataPayload.raid_flags ||
        dataPayload.raiddData ||
        dataPayload.raidData ||
        dataPayload.raidd_data ||
        dataPayload.raid_data ||
        dataPayload.raiddAnalysis ||
        dataPayload.raidd_analysis;

    if (raiddFlags && typeof raiddFlags === 'string') {
        try {
            raiddFlags = JSON.parse(raiddFlags);
        } catch (e) {
            console.error("[AI Push Meeting Sync] Failed to parse raiddFlags JSON string:", e.message);
        }
    }

    const finalCategories = [];
    if (raiddFlags && typeof raiddFlags === 'object') {
        for (const [key, items] of Object.entries(raiddFlags)) {
            if (Array.isArray(items) && items.length > 0) {
                let categoryName = key;
                const lowerKey = key.toLowerCase();
                if (lowerKey === 'risks' || lowerKey === 'risk') categoryName = 'Risk';
                else if (lowerKey === 'assumptions' || lowerKey === 'assumption') categoryName = 'Assumption';
                else if (lowerKey === 'issues' || lowerKey === 'issue') categoryName = 'Issue';
                else if (lowerKey === 'decisions' || lowerKey === 'decision') categoryName = 'Decision';
                else if (lowerKey === 'dependencies' || lowerKey === 'dependency') categoryName = 'Dependency';

                finalCategories.push(categoryName);
            }
        }
    }

    let aiDetection = null;
    if (finalCategories.length > 0) {
        // Check if an AI Detection record already exists for this meeting
        const existingAiDetection = await prisma.aiDetection.findFirst({
            where: {
                sourceType: "meeting",
                raiddMessage: meetingId,
                deletedAt: null
            }
        });

        if (existingAiDetection) {
            aiDetection = await prisma.aiDetection.update({
                where: { id: existingAiDetection.id },
                data: {
                    title: dataPayload.title || meeting.title || "No Title",
                    raiddAnalysis: finalCategories,
                    raiddData: raiddFlags,
                    updatedBy: userId || meeting.createdBy || "system"
                }
            });
            console.log(`[AI Push Meeting Sync] Updated existing AiDetection record for Meeting ID: ${meetingId}, ID: ${aiDetection.id}`);
        } else {
            aiDetection = await prisma.aiDetection.create({
                data: {
                    title: dataPayload.title || meeting.title || "No Title",
                    sourceType: "meeting",
                    managerId: managerId,
                    createdBy: createdBy,
                    raiddAnalysis: finalCategories,
                    raiddData: raiddFlags,
                    raiddMessage: meetingId
                }
            });
            console.log(`[AI Push Meeting Sync] Created new AiDetection record for Meeting ID: ${meetingId}, ID: ${aiDetection.id}`);
        }

        // If raiddFlags is provided, also sync individual RAIDD items to project!
        if (raiddFlags) {
            await RaiddService.syncIndividualItems(prisma, meeting.projectId, raiddFlags, null, { aiDetectionId: aiDetection.id });
        }
    }

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

    const nestedOps = {};

    if (keyPoints && Array.isArray(keyPoints)) {
        nestedOps.keyPoints = {
            deleteMany: {},
            create: keyPoints.flat().filter(kp => kp).map(kp => {
                const content = typeof kp === 'string' ? kp : kp.content;
                const status = typeof kp === 'string' ? "TO_BE_VALIDATED" : (kp.status || "TO_BE_VALIDATED");
                return { content, status };
            }).filter(item => item.content && item.content.trim() !== '')
        };
    }

    if (actionPoints && Array.isArray(actionPoints)) {
        nestedOps.actionPoints = {
            deleteMany: {},
            create: actionPoints.flat().filter(ap => ap).map(ap => {
                const content = typeof ap === 'string' ? ap : ap.content;
                const status = typeof ap === 'string' ? "PENDING" : (ap.status || "PENDING");
                return { content, status };
            }).filter(item => item.content && item.content.trim() !== '')
        };
    }

    const updatedDocument = await prisma.projectDocumentUpload.update({
        where: { id: documentId },
        data: {
            aiDocumentSummary: aiDocumentSummary || undefined,
            aiCheck: true,
            ...nestedOps
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
            weeklyMeetingSummary: weeklyAiSummary || "",
            aiCheck: true
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

const syncClientData = async (clientId, payload, userId) => {
    const client = await prisma.client.findUnique({
        where: { id: clientId }
    });

    if (!client) {
        throw new AppError(StatusCodes.NOT_FOUND, "Client record not found");
    }

    console.log(`[AI Push Client Sync] Received AI Data for Client ID: ${clientId} (${client.name})`);
    console.log(`[AI Push Client Sync] Payload:`, JSON.stringify(payload, null, 2));

    const {
        aiSummary,
        lessonsLearned,
        discussionPoints,
        actionPoints,
        notes,
        raiddData
    } = payload;

    // Build a complete AI response JSON object to be saved in clientAiResponse
    const clientAiResponse = {
        aiSummary: aiSummary || payload.summary || null,
        lessonsLearned: lessonsLearned || null,
        discussionPoints: discussionPoints || null,
        actionPoints: actionPoints || null,
        notes: notes || null,
        raiddData: raiddData || payload.raidd || null,
    };

    const updatedClient = await prisma.client.update({
        where: { id: clientId },
        data: {
            clientAiResponse: clientAiResponse,
        }
    });

    console.log(`[AI Push Client Sync] Client ${clientId} updated successfully in database.`);
    return updatedClient;
};

export const AiPushService = {
    syncProjectData,
    syncRaiddData,
    syncEmailData,
    syncOutlookData,
    syncUnifiedEmailData,
    syncMeetingAiData,
    syncDocumentAiData,
    syncWeeklyAiSummary,
    syncClientData
};
