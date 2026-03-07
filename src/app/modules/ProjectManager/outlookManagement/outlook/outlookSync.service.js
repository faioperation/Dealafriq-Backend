import prisma from '../../../../prisma/client.js';

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

    return await prisma.outlook.create({
        data: emailData
    });
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
