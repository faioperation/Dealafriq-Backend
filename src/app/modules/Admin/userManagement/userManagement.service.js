import prisma from '../../../prisma/client.js';

/**
 * Get all emails in the system (Admin only)
 */
const getAllSystemEmails = async (filters = {}) => {
    const { category, senderEmail, receiverEmail } = filters;
    const where = {
        deletedAt: null
    };

    if (category) {
        where.category = {
            contains: category,
            mode: 'insensitive'
        };
    }

    if (senderEmail) {
        where.senderEmail = {
            contains: senderEmail,
            mode: 'insensitive'
        };
    }

    if (receiverEmail) {
        where.receiverEmail = {
            contains: receiverEmail,
            mode: 'insensitive'
        };
    }
    const gmailEmails = await prisma.email.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        select: {
            id: true,
            subject: true,
            body: true,
            senderEmail: true,
            receiverEmail: true,
            clientEmail: true,
            source: true,
            tasks: true,
            sentiment: true,
            raiddAnalysis: true,
            decisions: true,
            raiddData: true,
            raiddMessage: true,
            createdAt: true,
            updatedAt: true,
            client:true,
            createdBy: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        },
        take: 1
    });

    const outlookEmails = await prisma.outlook.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        select: {
            id: true,
            subject: true,
            body: true,
            senderEmail: true,
            receiverEmail: true,
            clientEmail: true,
            source: true,
            tasks: true,
            sentiment: true,
            raiddAnalysis: true,
            decisions: true,
            raiddData: true,
            raiddMessage: true,
            createdAt: true,
            updatedAt: true,
            client: true,
            createdBy: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        },
        take: 1
    });

    // Combine and sort
    const allEmails = [
        ...gmailEmails.map(e => ({ ...e, source: 'GMAIL' })),
        ...outlookEmails.map(e => ({ ...e, source: 'OUTLOOK' }))
    ].sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

    return allEmails.slice(0, 1); // Only 1 latest mail only
};

/**
 * Get all emails for a specific user
 */
const getEmailsByUserId = async (userId, filters = {}) => {
    const { category } = filters;
    const where = {
        created_by: userId,
        deletedAt: null
    };

    if (category) {
        where.category = {
            contains: category,
            mode: 'insensitive'
        };
    }

    const gmailEmails = await prisma.email.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        include: {
            client: true
        }
    });

    const outlookEmails = await prisma.outlook.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        include: {
            client: true
        }
    });

    // Combine and sort
    const allEmails = [
        ...gmailEmails.map(e => ({ ...e, source: 'GMAIL' })),
        ...outlookEmails.map(e => ({ ...e, source: 'OUTLOOK' }))
    ].sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

    return allEmails;
};

/**
 * Get all users in the system (Public)
 */
const getAllUsers = async () => {
    return await prisma.user.findMany({
        where: { isDeleted: false },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            role: true
        }
    });
};

/**
 * Get a single user by ID (Public)
 */
const getUserById = async (userId) => {
    return await prisma.user.findUnique({
        where: { id: userId, isDeleted: false },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            role: true
        }
    });
};

/**
 * Get all AI detections in the system (Admin only)
 */
const getAllAiDetections = async () => {
    return await prisma.aiDetection.findMany({
        where: { deletedAt: null },
        select: {
            id: true,
            title: true,
            summary: true,
            sourceType: true,
            createdAt: true,
            updatedAt: true,
            raiddAnalysis: true,
            raiddData: true,
            raiddMessage: true,
        },
        orderBy: { createdAt: 'desc' }
    });
};
export const UserManagementService = {
    getAllSystemEmails,
    getEmailsByUserId,
    getAllUsers,
    getUserById,
    getAllAiDetections,
};
