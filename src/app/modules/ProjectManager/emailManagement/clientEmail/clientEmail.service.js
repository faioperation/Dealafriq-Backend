import { envVars } from '../../../../config/env.js';
import prisma from '../../../../prisma/client.js';
import axios from 'axios';
import { AiEmailSummaryUtils } from '../../../../utils/aiEmailSummary.js';
import { AiDetectionService } from '../../aiDetection/aiDetection.service.js';


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

    // Trigger external AI Emails summary API
    const liveEmailsSummaryUrl = `${envVars.API_AI}/summary/emails?id=${email.id}`;
    console.log(`[Email AI Sync] Triggering background email summary API: ${liveEmailsSummaryUrl}`);
    axios.post(liveEmailsSummaryUrl, {}, {
        headers: {
            'Content-Type': 'application/json',
            "x-backend-service": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9sTOlGEcqrij9J70RUO8Clh0"
        }
    }).catch(axiosErr => {
        console.error(`[Email AI Sync] Failed to trigger background AI Email summary:`, axiosErr.message);
    });

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

    // Trigger external AI Emails summary API
    const liveEmailsSummaryUrl = `${envVars.API_AI}/summary/emails?id=${email.id}`;
    console.log(`[Email AI Sync] Triggering background email summary API: ${liveEmailsSummaryUrl}`);
    axios.post(liveEmailsSummaryUrl, {}, {
        headers: {
            'Content-Type': 'application/json',
            "x-backend-service": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9sTOlGEcqrij9J70RUO8Clh0"
        }
    }).catch(axiosErr => {
        console.error(`[Email AI Sync] Failed to trigger background AI Email summary:`, axiosErr.message);
    });

    return email;
};

/**
 * Bulk sync all emails from AI
 */
const syncAllEmailsFromAi = async (prisma) => {
    console.log("[AI Bulk Sync] Bulk Gmail sync is now handled via AI Push API.");
};

export const ClientEmailService = {
    createEmail,
    getAllEmails,
    getSingleEmail,
    updateEmail,
    deleteEmail,
    syncEmail,
    syncAllEmailsFromAi
};
