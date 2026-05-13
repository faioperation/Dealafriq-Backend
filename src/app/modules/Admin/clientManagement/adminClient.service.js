import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import prisma from "../../../prisma/client.js";

const getClientsByProjectManagerId = async (projectManagerId) => {
    // 1. Strictly verify the ID provided is a ProjectManager table ID.
    const pmRecord = await prisma.projectManager.findUnique({
        where: { id: projectManagerId }
    });

    if (!pmRecord || !pmRecord.userId) {
        throw new AppError(StatusCodes.NOT_FOUND, "Project Manager not found or missing user reference");
    }

    // 2. Fetch all clients created by this Project Manager's actual user
    const clients = await prisma.client.findMany({
        where: {
            created_by: pmRecord.userId,
            deletedAt: null
        },
        include: {
            projects: {
                select: {
                    id: true,
                    name: true,
                    clientName: true,
                },
            },
            emails: true
        }

    });

    // Further enrich by explicitly finding emails that strictly match the client's email address
    // This catches emails that might not be hard-linked by clientId
    const clientsWithEmails = await Promise.all(clients.map(async (client) => {
        let matchingEmails = [];
        if (client.email) {
            matchingEmails = await prisma.email.findMany({
                where: {
                    OR: [
                        { senderEmail: client.email },
                        { clientEmail: client.email },
                        { receiverEmail: client.email }
                    ]
                }
            });
        }

        // De-duplicate emails (by ID) ensuring no duplicates between Relation and Email match
        const uniqueEmails = [...client.emails, ...matchingEmails].reduce((acc, current) => {
            if (!acc.some(e => e.id === current.id)) {
                acc.push(current);
            }
            return acc;
        }, []);

        return {
            ...client,
            emails: uniqueEmails
        };
    }));

    return clientsWithEmails;
};

const getAllClients = async () => {
    const clients = await prisma.client.findMany({
        where: {
            deletedAt: null
        },
        include: {
            projects: {
                select: {
                    id: true,
                    name: true,
                    clientName: true,
                },
            },
            emails: true
        },
        take:1,
        orderBy: { createdAt: 'desc' }

    });

    // Extracting comprehensive emails strictly matching the client's email address
    const clientsWithEmails = await Promise.all(clients.map(async (client) => {
        let matchingEmails = [];
        if (client.email) {
            matchingEmails = await prisma.email.findMany({
                where: {
                    OR: [
                        { senderEmail: client.email },
                        { clientEmail: client.email },
                        { receiverEmail: client.email }
                    ]
                }
            });
        }

        const uniqueEmails = [...client.emails, ...matchingEmails].reduce((acc, current) => {
            if (!acc.some(e => e.id === current.id)) {
                acc.push(current);
            }
            return acc;
        }, []);

        return {
            ...client,
            emails: uniqueEmails
        };
    }));

    return clientsWithEmails;
};

export const AdminClientService = {
    getClientsByProjectManagerId,
    getAllClients
};
