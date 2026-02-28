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
        orderBy: { createdAt: 'desc' },
        include: {
            vendor: true
        },
        take: 5
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
    const { gmailMessageId, senderEmail, receiverEmail } = payload;

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

    return await prisma.email.create({
        data: emailData
    });
};

export const VendorEmailService = {
    createEmail,
    getAllEmails,
    getSingleEmail,
    updateEmail,
    deleteEmail,
    syncEmail
};
