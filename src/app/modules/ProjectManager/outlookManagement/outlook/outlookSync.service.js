import prisma from '../../../../prisma/client.js';
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

    // Logic to match with vendor
    const vendor = await findVendorByEmail(senderEmail);

    const emailData = {
        ...payload,
        vendorId: vendor ? vendor.id : null,
        vendorEmail: vendor ? (vendor.email === senderEmail ? vendor.email : vendor.contactEmail) : null
    };

    // 1. Create the record in the database first (as requested)
    let outlookEmail = await prisma.outlook.create({
        data: emailData
    });

    // 2. Call AI Summary API and wait for response (blocks here)
    if (outlookEmail.body) {
        console.log(`[AI Sync Outlook] Requesting AI summary for Outlook Message ID: ${outlookMessageId} (ID: ${outlookEmail.id})`);
        const aiResult = await AiEmailSummaryUtils.getAiEmailSummary(outlookEmail.body);
        
        if (aiResult) {
            console.log(`[AI Sync Outlook] AI Result received for ID: ${outlookEmail.id}. tasks: ${aiResult.tasks?.length || 0}, raiddAnalysis: ${aiResult.raiddAnalysis}`);
            
            // 3. Update those values in the database
            outlookEmail = await prisma.outlook.update({
                where: { id: outlookEmail.id },
                data: {
                    tasks: aiResult.tasks,
                    raiddAnalysis: aiResult.raiddAnalysis,
                    raiddMessage: aiResult.raiddMessage,
                    decisions: aiResult.decisions,
                    sentiment: aiResult.sentiment
                }
            });
            console.log(`[AI Sync Outlook] Record updated successfully for ID: ${outlookEmail.id}`);

            // 4. Create AI detection record
            const summaryParts = [];
            if (aiResult.tasks && Array.isArray(aiResult.tasks) && aiResult.tasks.length > 0) {
                summaryParts.push(`Tasks:\n${aiResult.tasks.join('\n')}`);
            }
            if (aiResult.decisions) {
                summaryParts.push(`Decisions:\n${aiResult.decisions}`);
            }

            await AiDetectionService.createAiDetection(prisma, {
                title: outlookEmail.subject || 'New AI Detection from Outlook',
                summary: summaryParts.join('\n\n'),
                raiddAnalysis: aiResult.raiddAnalysis,
                raiddMessage: aiResult.raiddMessage,
                sourceType: outlookEmail.source || 'outlook',
                managerId: outlookEmail.created_by,
                fullAiResponse: aiResult
            }, outlookEmail.created_by);
        }
    } else {
        console.log(`[AI Sync Outlook] Skipping AI summary for Outlook Message ID: ${outlookMessageId} (Empty body)`);
    }

    return outlookEmail;
};

/**
 * Get all outlook emails
 */
const getAllOutlooks = async (userId, filters = {}) => {
    const { vendorId, senderEmail, category } = filters;
    const where = {
        deletedAt: null,
        created_by: userId
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

    return await prisma.outlook.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        include: {
            vendor: true
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
            vendor: true
        }
    });
};

/**
 * Delete outlook email (soft delete)
 */
const deleteOutlook = async (id, userId) => {
    return await prisma.outlook.update({
        where: {
            id,
            created_by: userId
        },
        data: {
            deletedAt: new Date(),
            deleted_by: userId
        }
    });
};

export const OutlookSyncService = {
    syncOutlookEmail,
    getAllOutlooks,
    getSingleOutlook,
    deleteOutlook
};
