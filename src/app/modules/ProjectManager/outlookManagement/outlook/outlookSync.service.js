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

    const createdEmail = await prisma.outlook.create({
        data: emailData
    });

    // Call AI Summary API
    if (createdEmail.body) {
        const aiResult = await AiEmailSummaryUtils.getAiEmailSummary(createdEmail.body);
        if (aiResult) {
            await prisma.outlook.update({
                where: { id: createdEmail.id },
                data: {
                    tasks: aiResult.tasks,
                    raiddAnalysis: aiResult.raiddAnalysis,
                    decisions: aiResult.decisions,
                    sentiment: aiResult.sentiment
                }
            });

            // Automatically create AI Detection record
            const summaryParts = [];
            if (aiResult.tasks && Array.isArray(aiResult.tasks) && aiResult.tasks.length > 0) {
                summaryParts.push(`Tasks:\n${aiResult.tasks.join('\n')}`);
            }
            if (aiResult.raiddAnalysis) {
                summaryParts.push(`RAIDD Analysis:\n${aiResult.raiddAnalysis}`);
            }
            if (aiResult.decisions) {
                summaryParts.push(`Decisions:\n${aiResult.decisions}`);
            }

            await AiDetectionService.createAiDetection(prisma, {
                title: createdEmail.subject || 'New AI Detection from Outlook',
                summary: summaryParts.join('\n\n'),
                sourceType: createdEmail.source || 'outlook',
                managerId: createdEmail.created_by
            }, createdEmail.created_by);
        }
    }

    return createdEmail;
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
