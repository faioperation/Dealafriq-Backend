import { envVars } from '../../../../config/env.js';
import prisma from '../../../../prisma/client.js';
import axios from 'axios';
import { AiEmailSummaryUtils } from '../../../../utils/aiEmailSummary.js';
import { AiDetectionService } from '../../aiDetection/aiDetection.service.js';


/**
 * Find vendor by email or contact email
 */
const findVendorByEmail = async (email) => {
    if (!email) return null;
    return await prisma.vendor.findFirst({
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

    // Logic to match with vendor
    const vendor = await findVendorByEmail(senderEmail);

    const emailData = {
        ...payload,
        vendorId: vendor ? vendor.id : null,
        vendorEmail: vendor ? (vendor.email === senderEmail ? vendor.email : vendor.contactEmail) : null
    };

    const email = await prisma.email.create({
        data: emailData
    });

    // Call AI generate reply asynchronously (non-blocking)
    if (email.created_by) {
        AiEmailSummaryUtils.getGeneratedReply(email.created_by, email.id, 'email');
    }

    return email;
};

/**
 * Get all emails
 */
const getAllEmails = async (userId, filters = {}) => {
    const { vendorId, senderEmail, category } = filters;
    const where = {
        deletedAt: null,
        created_by: userId // Restrict to current user
    };

    if (vendorId) {
        where.vendorId = vendorId;
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
            vendor: true
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
            vendor: true
        }
    });
};

/**
 * Update email
 */
const updateEmail = async (id, userId, payload) => {
    // If senderEmail is updated, we might need to re-match vendor
    if (payload.senderEmail) {
        const vendor = await findVendorByEmail(payload.senderEmail);
        payload.vendorId = vendor ? vendor.id : null;
        payload.vendorEmail = vendor ? (vendor.email === payload.senderEmail ? vendor.email : vendor.contactEmail) : null;
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

    // Logic to match with vendor
    const vendor = await findVendorByEmail(senderEmail);

    const emailData = {
        ...payload,
        vendorId: vendor ? vendor.id : null,
        vendorEmail: vendor ? (vendor.email === senderEmail ? vendor.email : vendor.contactEmail) : null
    };

    // 1. Create the record in the database first (as requested)
    let email = await prisma.email.create({
        data: emailData
    });

    // Call AI generate reply asynchronously (non-blocking) - Always call on creation
    if (email.created_by) {
        AiEmailSummaryUtils.getGeneratedReply(email.created_by, email.id, 'email');
    }

    // 2. Call AI Summary API and wait for response (blocks here)
    if (email.body) {
        console.log(`[AI Sync] Requesting AI summary for Gmail Message ID: ${gmailMessageId} (ID: ${email.id})`);
        const aiResult = await AiEmailSummaryUtils.getAiEmailSummary(email.id, email.body);

        if (aiResult) {
            console.log(`[AI Sync] AI Result received for Email ID: ${email.id}. tasks: ${aiResult.tasks?.length || 0}, raiddAnalysis: ${aiResult.raiddAnalysis}`);

            // 3. Update those values in the database
            email = await prisma.email.update({
                where: { id: email.id },
                data: {
                    tasks: aiResult.tasks,
                    raiddAnalysis: aiResult.raiddAnalysis,
                    raiddMessage: aiResult.raiddMessage,
                    decisions: aiResult.decisions,
                    sentiment: aiResult.sentiment,
                    fullAiResponse: aiResult.fullAiResponse
                }
            });
            console.log(`[AI Sync] Record updated successfully for Email ID: ${email.id}`);

            // 4. Create AI detection record
            const summaryParts = [];
            if (aiResult.tasks && Array.isArray(aiResult.tasks) && aiResult.tasks.length > 0) {
                summaryParts.push(`Tasks:\n${aiResult.tasks.join('\n')}`);
            }
            if (aiResult.decisions) {
                summaryParts.push(`Decisions:\n${aiResult.decisions}`);
            }

            await AiDetectionService.createAiDetection(prisma, {
                title: email.subject || 'New AI Detection from Email',
                summary: summaryParts.join('\n\n'),
                raiddAnalysis: aiResult.raiddAnalysis,
                raiddMessage: aiResult.raiddMessage,
                sourceType: email.source || 'email',
                managerId: email.created_by,
                fullAiResponse: aiResult.fullAiResponse
            }, email.created_by);
        }
    } else {
        console.log(`[AI Sync] Skipping AI summary for Gmail Message ID: ${gmailMessageId} (Empty body)`);
    }

    return email;
};

/**
 * Bulk sync all emails from AI
 */
const syncAllEmailsFromAi = async (prisma) => {
    try {
        const apiUrl = `${envVars.API_AI}/summary/emails`;
        console.log(`[AI Bulk Sync] Requesting bulk summary for Gmail emails...`);
        
        const response = await axios.post(apiUrl, {}, {
            headers: {
                'x-backend-service': "PROJECT_AI_BACKEND" // Use a different key or the same key as needed
            }
        });

        const emailsData = response.data;
        // Handle both flat array or { data: [] } structure
        const results = Array.isArray(emailsData) ? emailsData : (emailsData?.data && Array.isArray(emailsData.data) ? emailsData.data : []);

        if (results.length === 0) {
            console.log("[AI Bulk Sync] No email data returned from AI for bulk sync.");
            return;
        }

        for (const aiResult of results) {
            const emailId = aiResult.email_id || aiResult.emailId || aiResult.id;
            if (!emailId) continue;

            const emailExists = await prisma.email.findUnique({
                where: { id: emailId }
            });

            if (emailExists) {
                const isFirstSync = !emailExists.fullAiResponse;

                // Parse AI result exactly like in syncEmail
                const tasks = aiResult.tasks || (aiResult.actionPoints ? aiResult.actionPoints : []);
                
                await prisma.email.update({
                    where: { id: emailId },
                    data: {
                        tasks: tasks,
                        raiddAnalysis: aiResult.category || [],
                        raiddMessage: aiResult.raiddMessage || null,
                        decisions: Array.isArray(aiResult.decisionPoints) ? aiResult.decisionPoints.join('\n') : aiResult.decisionPoints,
                        sentiment: aiResult.sentiment || null,
                        fullAiResponse: aiResult
                    }
                });

                if (isFirstSync) {
                    // Create AI detection record
                    const summaryParts = [];
                    if (tasks.length > 0) summaryParts.push(`Tasks:\n${tasks.join('\n')}`);
                    if (aiResult.decisionPoints) summaryParts.push(`Decisions:\n${aiResult.decisionPoints}`);

                    await AiDetectionService.createAiDetection(prisma, {
                        title: emailExists.subject || 'New AI Detection from Email',
                        summary: summaryParts.join('\n\n'),
                        raiddAnalysis: aiResult.category || [],
                        raiddMessage: aiResult.raiddMessage || null,
                        sourceType: emailExists.source || 'email',
                        managerId: emailExists.created_by,
                        fullAiResponse: aiResult
                    }, emailExists.created_by);
                }
            }
        }
        console.log(`[AI Bulk Sync] Bulk Email AI Sync completed for ${results.length} records.`);
    } catch (error) {
        console.error("[AI Bulk Sync] Bulk Email AI Sync failed:", error.message);
    }
};

export const VendorEmailService = {
    createEmail,
    getAllEmails,
    getSingleEmail,
    updateEmail,
    deleteEmail,
    syncEmail,
    syncAllEmailsFromAi
};
