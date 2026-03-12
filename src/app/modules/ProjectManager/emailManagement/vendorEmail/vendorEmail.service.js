import prisma from '../../../../prisma/client.js';
import { AiEmailSummaryUtils } from '../../../../utils/aiEmailSummary.js';


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

    return await prisma.email.create({
        data: emailData
    });
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

    const createdEmail = await prisma.email.create({
        data: emailData
    });

    // Call AI Summary API
    if (createdEmail.body && createdEmail.body.trim() !== '') {
        try {
            console.log(`[AI Sync] Calling AI Summary for Email ID: ${createdEmail.id}`);
            const aiResult = await AiEmailSummaryUtils.getAiEmailSummary(createdEmail.body);
            
            if (aiResult) {
                console.log(`[AI Sync] AI Result received for Email ID: ${createdEmail.id}. Updating email record...`);
                await prisma.email.update({
                    where: { id: createdEmail.id },
                    data: {
                        tasks: aiResult.tasks,
                        raiddAnalysis: aiResult.raiddAnalysis,
                        decisions: aiResult.decisions,
                        sentiment: aiResult.sentiment
                    }
                });

                // Create AI Detection record
                console.log(`[AI Sync] Creating AI Detection record for Email ID: ${createdEmail.id}`);
                const aiDetection = await prisma.aiDetection.create({
                    data: {
                        title: createdEmail.body || createdEmail.subject || 'No Content',
                        summary: aiResult.summary,
                        sourceType: 'GMAIL',
                        createdBy: createdEmail.created_by || 'SYSTEM',
                    }
                });
                console.log(`[AI Sync] AI Detection record created successfully: ${aiDetection.id}`);
            } else {
                console.warn(`[AI Sync] AI Summary utility returned null for Email ID: ${createdEmail.id}`);
            }
        } catch (error) {
            console.error(`[AI Sync] Critical error in AI sync process for Email ID: ${createdEmail.id}:`, error);
        }
    } else {
        console.log(`[AI Sync] Skipping AI summary for Email ID: ${createdEmail.id} (Empty body)`);
    }

    return createdEmail;
};

export const VendorEmailService = {
    createEmail,
    getAllEmails,
    getSingleEmail,
    updateEmail,
    deleteEmail,
    syncEmail
};
