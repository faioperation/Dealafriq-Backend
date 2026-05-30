import { envVars } from '../../../../config/env.js';
import prisma from '../../../../prisma/client.js';
import axios from 'axios';
import { AiEmailSummaryUtils } from '../../../../utils/aiEmailSummary.js';
import { AiDetectionService } from '../../aiDetection/aiDetection.service.js';
import { AppError } from '../../../../errorHelper/appError.js';
import { StatusCodes } from 'http-status-codes';


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
 * Create a new Email record
 */
const createEmail = async (payload) => {
    const { senderEmail } = payload;

    // Logic to match with client
    const client = await findClientByEmail(senderEmail);

    const emailData = {
        ...payload,
        clientId: client ? client.id : null,
        clientEmail: client ? (client.email === senderEmail ? client.email : client.contactEmail) : null
    };

    const email = await prisma.email.create({
        data: emailData
    });

    // Call AI generate reply asynchronously (non-blocking)
    if (email.created_by) {
        AiEmailSummaryUtils.getGeneratedReply(email.created_by, email.id, 'email');
    }

    // Trigger external AI Emails summary API (wait for it to ensure sequential processing)
    const liveEmailsSummaryUrl = `${envVars.API_AI}/summary/emails?id=${email.id}`;
    console.log(`[Email AI Sync] Triggering email summary API (waiting for response): ${liveEmailsSummaryUrl}`);
    try {
        await axios.post(liveEmailsSummaryUrl, {}, {
            headers: {
                'Content-Type': 'application/json',
                "x-backend-service": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9sTOlGEcqrij9J70RUO8Clh0"
            }
        });
        console.log(`[Email AI Sync] Successfully triggered AI summary for Email ID: ${email.id}`);
    } catch (axiosErr) {
        console.error(`[Email AI Sync] Failed to trigger AI Email summary:`, axiosErr.message);
    }

    return email;
};

/**
 * Get all emails
 */
const getAllEmails = async (userId, filters = {}) => {
    const { clientId, senderEmail, category } = filters;
    const where = {
        deletedAt: null,
        created_by: userId // Restrict to current user
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

    return await prisma.email.findMany({
        where,
        orderBy: { receivedAt: 'desc' }, // Sort by actual email arrival time
        include: {
            client: true,
            projectRisks: true,
            projectAssumptions: true,
            projectIssues: true,
            projectDecisions: true,
            projectDependencies: true,
            aiDetections: true
        },
        take: 20 // Increased to 20 emails
    });
};

/**
 * Get single email
 */
const getSingleEmail = async (id, userId) => {
    return await prisma.email.findUnique({
        where: {
            id,
            created_by: userId // Ensure ownership
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
 * Update email
 */
const updateEmail = async (id, userId, payload) => {
    // If senderEmail is updated, we might need to re-match client
    if (payload.senderEmail) {
        const client = await findClientByEmail(payload.senderEmail);
        payload.clientId = client ? client.id : null;
        payload.clientEmail = client ? (client.email === payload.senderEmail ? client.email : client.contactEmail) : null;
    }

    return await prisma.email.update({
        where: {
            id,
            created_by: userId // Ensure ownership
        },
        data: payload
    });
};

/**
 * Delete email (soft delete)
 */
const deleteEmail = async (id, userId) => {
    return await prisma.email.update({
        where: {
            id,
            created_by: userId // Ensure ownership
        },
        data: {
            deletedAt: new Date(),
            deleted_by: userId
        }
    });
};

/**
 * Sync email from Gmail (prevents duplicates)
 */
const syncEmail = async (payload) => {
    const { gmailMessageId, senderEmail, receiverEmail, receivedAt } = payload;

    // Check if email already exists
    const existingEmail = await prisma.email.findUnique({
        where: {
            gmailMessageId_receiverEmail: {
                gmailMessageId,
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
        clientId: client ? client.id : null,
        clientEmail: client ? (client.email === senderEmail ? client.email : client.contactEmail) : null
    };

    // 1. Create the record in the database first
    const email = await prisma.email.create({
        data: emailData
    });

    console.log(`[Email Sync] Initial record created for Gmail Message ID: ${gmailMessageId} (ID: ${email.id}). AI data will be handled via Push API.`);

    // Trigger external AI Emails summary API (wait for it to ensure sequential processing)
    const liveEmailsSummaryUrl = `${envVars.API_AI}/summary/emails?id=${email.id}`;
    console.log(`[Email AI Sync] Triggering email summary API (waiting for response): ${liveEmailsSummaryUrl}`);
    try {
        await axios.post(liveEmailsSummaryUrl, {}, {
            headers: {
                'Content-Type': 'application/json',
                "x-backend-service": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9sTOlGEcqrij9J70RUO8Clh0"
            }
        });
        console.log(`[Email AI Sync] Successfully triggered AI summary for Email ID: ${email.id}`);
    } catch (axiosErr) {
        console.error(`[Email AI Sync] Failed to trigger AI Email summary:`, axiosErr.message);
    }

    return email;
};

/**
 * Bulk sync all emails from AI
 */
const syncAllEmailsFromAi = async (prisma) => {
    console.log("[AI Bulk Sync] Bulk Gmail sync is now handled via AI Push API.");
};

const regenerateEmailAi = async (payload, userId) => {
    const id = payload.emailId || payload.id;
    const type = payload.type; // 'email' or 'outlook'

    if (!id) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Email ID is required");
    }

    let email = null;
    let isOutlook = false;

    if (type === 'outlook') {
        email = await prisma.outlook.findUnique({
            where: { id }
        });
        isOutlook = true;
    } else if (type === 'email') {
        email = await prisma.email.findUnique({
            where: { id }
        });
    } else {
        // Fallback: try finding in Email first, then Outlook
        email = await prisma.email.findUnique({
            where: { id }
        });
        if (!email) {
            email = await prisma.outlook.findUnique({
                where: { id }
            });
            isOutlook = true;
        }
    }

    if (!email) {
        throw new AppError(StatusCodes.NOT_FOUND, "Email record not found");
    }

    // 2. Trigger the external AI Emails summary API (axios.post)
    const liveEmailsSummaryUrl = `${envVars.API_AI}/summary/emails?id=${id}`;
    console.log(`[Email AI Regenerate] Triggering background email summary API: ${liveEmailsSummaryUrl}`);
    
    try {
        const response = await axios.post(liveEmailsSummaryUrl, {}, {
            headers: {
                'Content-Type': 'application/json',
                "x-backend-service": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9sTOlGEcqrij9J70RUO8Clh0"
            }
        });
        
        console.log(`[Email AI Regenerate] Triggered successfully. AI Response:`, response.data);
        return {
            success: true,
            message: "Email regeneration triggered successfully",
            isOutlook
        };
    } catch (axiosErr) {
        console.error(`[Email AI Regenerate] Failed to trigger AI Email summary:`, axiosErr.message);
        throw new AppError(StatusCodes.BAD_GATEWAY, `Failed to trigger AI Email summary: ${axiosErr.message}`);
    }
};

export const ClientEmailService = {
    createEmail,
    getAllEmails,
    getSingleEmail,
    updateEmail,
    deleteEmail,
    syncEmail,
    syncAllEmailsFromAi,
    regenerateEmailAi
};
