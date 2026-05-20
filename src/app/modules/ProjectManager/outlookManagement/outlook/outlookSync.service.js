import prisma from '../../../../prisma/client.js';
import { AiEmailSummaryUtils } from '../../../../utils/aiEmailSummary.js';
import { AiDetectionService } from '../../aiDetection/aiDetection.service.js';
import axios from 'axios';
import { envVars } from '../../../../config/env.js';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../../../../errorHelper/appError.js';


/**
 * Find client by email or contact email
 */
const findClientByEmail = async (email) => {
    if (!email) return null;
    return await prisma.client.findFirst({
        where: {
            OR: [
                { email: email },
                { contactEmail: email }
            ],
            deletedAt: null
        }
    });
};

/**
 * Sync email from Outlook (prevents duplicates)
 */
const syncOutlookEmail = async (payload) => {
    const { outlookMessageId, senderEmail, receiverEmail } = payload;

    // Check if email already exists
    const existingEmail = await prisma.outlook.findUnique({
        where: {
            outlookMessageId_receiverEmail: {
                outlookMessageId,
                receiverEmail
            }
        }
    });

    if (existingEmail) {
        return existingEmail;
    }

    // Logic to match with client
    const client = await findClientByEmail(senderEmail);

    const emailData = {
        ...payload,
        // Ensure a default category of "personal" if not provided
        category: payload.category ?? 'personal',
        clientId: client ? client.id : null,
        clientEmail: client ? (client.email === senderEmail ? client.email : client.contactEmail) : null
    };

    // 1. Create the record in the database first
    const outlookEmail = await prisma.outlook.create({
        data: emailData
    });

    console.log(`[Outlook Sync] Initial record created for Outlook Message ID: ${outlookMessageId} (ID: ${outlookEmail.id}). AI data will be handled via Push API.`);

    // Trigger external AI Emails summary API
    const liveEmailsSummaryUrl = `${envVars.API_AI}/summary/emails?id=${outlookEmail.id}`;
    console.log(`[Email AI Sync] Triggering background Outlook email summary API: ${liveEmailsSummaryUrl}`);
    axios.post(liveEmailsSummaryUrl, {}, {
        headers: {
            'Content-Type': 'application/json',
            "x-backend-service": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9sTOlGEcqrij9J70RUO8Clh0"
        }
    }).catch(axiosErr => {
        console.error(`[Email AI Sync] Failed to trigger background AI Outlook email summary:`, axiosErr.message);
    });

    return outlookEmail;
};

/**
 * Get all outlook emails
 */
const getAllOutlooks = async (userId, filters = {}) => {
    const { clientId, senderEmail, category } = filters;
    const where = {
        deletedAt: null,
        created_by: userId
    };

    if (clientId) {
        where.clientId = clientId;
    }

    if (senderEmail) {
        where.senderEmail = senderEmail;
    }

    if (category) {
        where.category = {
            contains: category,
            mode: 'insensitive'
        };
    }

    return await prisma.outlook.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        include: {
            client: true,
            projectRisks: true,
            projectAssumptions: true,
            projectIssues: true,
            projectDecisions: true,
            projectDependencies: true,
            aiDetections: true
        }
    });
};

/**
 * Get single outlook email
 */
const getSingleOutlook = async (id, userId) => {
    return await prisma.outlook.findUnique({
        where: {
            id,
            created_by: userId
        },
        include: {
            client: true,
            projectRisks: true,
            projectAssumptions: true,
            projectIssues: true,
            projectDecisions: true,
            projectDependencies: true,
            aiDetections: true
        }
    });
};

/**
 * Delete outlook or email (soft delete)
 */
const deleteOutlook = async (id, userId) => {
    const outlook = await prisma.outlook.findFirst({
        where: { id, created_by: userId }
    });

    if (outlook) {
        return await prisma.outlook.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                deleted_by: userId
            }
        });
    }

    const email = await prisma.email.findFirst({
        where: { id, created_by: userId }
    });

    if (email) {
        return await prisma.email.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                deleted_by: userId
            }
        });
    }

    throw new AppError(StatusCodes.NOT_FOUND, "Message record not found in either Email or Outlook tables");
};

/**
 * Bulk sync all outlook emails from AI
 */
const syncAllOutlooksFromAi = async (prisma) => {
    console.log("[AI Bulk Sync Outlook] Bulk Outlook sync is now handled via AI Push API.");
};

export const OutlookSyncService = {
    syncOutlookEmail,
    getAllOutlooks,
    getSingleOutlook,
    deleteOutlook,
    syncAllOutlooksFromAi
};
