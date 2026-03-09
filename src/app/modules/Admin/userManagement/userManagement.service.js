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
        include: {
            vendor: true,
            createdBy: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        },
        take: 50
    });

    const outlookEmails = await prisma.outlook.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        include: {
            vendor: true,
            createdBy: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        },
        take: 50
    });

    // Combine and sort
    const allEmails = [
        ...gmailEmails.map(e => ({ ...e, source: 'GMAIL' })),
        ...outlookEmails.map(e => ({ ...e, source: 'OUTLOOK' }))
    ].sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

    return allEmails.slice(0, 100); // Admin gets top 100 recent
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
            vendor: true
        }
    });

    const outlookEmails = await prisma.outlook.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        include: {
            vendor: true
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

export const UserManagementService = {
    getAllSystemEmails,
    getEmailsByUserId,
    getAllUsers,
    getUserById
};
