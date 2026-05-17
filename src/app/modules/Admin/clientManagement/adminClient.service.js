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

    // 2. Fetch all clients created by this Project Manager's actual user with select (flattening clientAiResponse fields)
    const clients = await prisma.client.findMany({
        where: {
            created_by: pmRecord.userId,
            deletedAt: null
        },
        select: {
            id: true,
            name: true,
            designation: true,
            email: true,
            phone: true,
            numberOfProjects: true,
            contactPerson: true,
            contactEmail: true,
            contactPhone: true,
            contactProjects: true,
            contactDesignation: true,
            meetingLinks: true,
            documents: true,
            slas: true,
            clientAiResponse: true,
            projects: {
                where: { deletedAt: null },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    clientName: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                   
                    weeklyMeetingSummary: true,
                    clientId: true,
                    
                    projectAiSummary: true,
                    projectProgress: true,
                  
                    discussionPoints: true,
                    actionPoints: true,
                    cancelledReason: true,
                    notes: true,
                    projectHealth: true,
                    meetings: {
                        select: {
                            id: true,
                            projectId: true,
                            title: true,
                            meetingUrl: true,
                            meetingDate: true,
                            createdAt: true,
                            projectSummary: true,
                            lastMeetingSummary: true,
                            notes: true,
                            agenda: true
                        },
                        orderBy: { createdAt: 'desc' }
                    },
                    documents: true,
                }
            },
            emails: {
                select: {
                    id: true,
                    subject: true,
                    body: true,
                }
            },
            outlooks: {
                select: {
                    id: true,
                    subject: true,
                    body: true,
                }
            }
        }
    });

    // Further enrich by matching client email address across emails and outlooks
    const enrichedClients = await Promise.all(clients.map(async (client) => {
        let matchingEmails = [];
        let matchingOutlooks = [];
        if (client.email) {
            matchingEmails = await prisma.email.findMany({
                where: {
                    OR: [
                        { senderEmail: client.email },
                        { clientEmail: client.email },
                        { receiverEmail: client.email }
                    ]
                },
                select: {
                    id: true,
                    subject: true,
                    body: true,
                   
                }
            });
            matchingOutlooks = await prisma.outlook.findMany({
                where: {
                    OR: [
                        { senderEmail: client.email },
                        { clientEmail: client.email },
                        { receiverEmail: client.email }
                    ]
                },
                select: {
                    id: true,
                    subject: true,
                    body: true,
                    
                }
            });
        }

        const uniqueEmails = [...client.emails, ...matchingEmails].reduce((acc, current) => {
            if (!acc.some(e => e.id === current.id)) {
                acc.push(current);
            }
            return acc;
        }, []);

        const uniqueOutlooks = [...client.outlooks, ...matchingOutlooks].reduce((acc, current) => {
            if (!acc.some(o => o.id === current.id)) {
                acc.push(current);
            }
            return acc;
        }, []);

        const aiResponse = client.clientAiResponse || {};
        delete client.clientAiResponse;

        return {
            ...client,
            clientId: client.id,
            clientName: client.name,
            aiSummary: aiResponse.aiSummary || null,
            lessonsLearned: aiResponse.lessonsLearned || [],
            discussionPoints: aiResponse.discussionPoints || [],
            actionPoints: aiResponse.actionPoints || [],
            notes: aiResponse.notes || null,
            raiddData: aiResponse.raiddData || null,
            emails: uniqueEmails,
            outlooks: uniqueOutlooks
        };
    }));

    return enrichedClients;
};

const getAllClients = async () => {
    const clients = await prisma.client.findMany({
        where: {
            deletedAt: null
        },
        select: {
            id: true,
            name: true,
            designation: true,
            email: true,
            phone: true,
            numberOfProjects: true,
           
            contactPerson: true,
          
         
           
            meetingLinks: true,
            documents: true,
            slas: true,
            clientAiResponse: true,
          
            projects: {
                where: { deletedAt: null },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    clientName: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                    managerId: true,
                   
                    weeklyMeetingSummary: true,
                    clientId: true,
                 
                    projectAiSummary: true,
                    projectProgress: true,
                  
                    discussionPoints: true,
                    actionPoints: true,
                    cancelledReason: true,
                    notes: true,
                    projectHealth: true,
                    meetings: {
                        select: {
                            id: true,
                            projectId: true,
                            title: true,
                           
                           
                           
                            projectSummary: true,
                            lastMeetingSummary: true,
                            notes: true,
                            agenda: true
                        },
                        orderBy: { createdAt: 'desc' }
                    },
                    documents: true,
                }
            },
            emails: {
                select: {
                    id: true,
                    subject: true,
                    body: true,
                 
                }
            },
            outlooks: {
                select: {
                    id: true,
                    subject: true,
                    body: true,
                    senderEmail: true,
                    receiverEmail: true,
                    clientEmail: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Extracting comprehensive emails and outlooks strictly matching the client's email address
    const enrichedClients = await Promise.all(clients.map(async (client) => {
        let matchingEmails = [];
        let matchingOutlooks = [];
        if (client.email) {
            matchingEmails = await prisma.email.findMany({
                where: {
                    OR: [
                        { senderEmail: client.email },
                        { clientEmail: client.email },
                        { receiverEmail: client.email }
                    ]
                },
                select: {
                    id: true,
                    subject: true,
                    body: true,
                    senderEmail: true,
                    receiverEmail: true,
                    clientEmail: true
                }
            });
            matchingOutlooks = await prisma.outlook.findMany({
                where: {
                    OR: [
                        { senderEmail: client.email },
                        { clientEmail: client.email },
                        { receiverEmail: client.email }
                    ]
                },
                select: {
                    id: true,
                    subject: true,
                    body: true,
                    senderEmail: true,
                    receiverEmail: true,
                    clientEmail: true
                }
            });
        }

        const uniqueEmails = [...client.emails, ...matchingEmails].reduce((acc, current) => {
            if (!acc.some(e => e.id === current.id)) {
                acc.push(current);
            }
            return acc;
        }, []);

        const uniqueOutlooks = [...client.outlooks, ...matchingOutlooks].reduce((acc, current) => {
            if (!acc.some(o => o.id === current.id)) {
                acc.push(current);
            }
            return acc;
        }, []);

        const aiResponse = client.clientAiResponse || {};
        delete client.clientAiResponse;

        return {
            ...client,
            clientId: client.id,
            clientName: client.name,
            aiSummary: aiResponse.aiSummary || null,
            lessonsLearned: aiResponse.lessonsLearned || [],
            discussionPoints: aiResponse.discussionPoints || [],
            actionPoints: aiResponse.actionPoints || [],
            notes: aiResponse.notes || null,
            raiddData: aiResponse.raiddData || null,
            emails: uniqueEmails,
            outlooks: uniqueOutlooks
        };
    }));

    return enrichedClients;
};

const getClientById = async (id) => {
    const client = await prisma.client.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            designation: true,
            email: true,
            phone: true,
            numberOfProjects: true,
            photoUrl: true,
            photoPath: true,
            contactPerson: true,
            contactRole: true,
            contactEmail: true,
            contactPhone: true,
            contactProjects: true,
            contactDesignation: true,
            meetingLinks: true,
            documents: true,
            slas: true,
            clientAiResponse: true,
            created_by: true,
            updated_by: true,
            approved_by: true,
            deleted_by: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            projects: {
                where: { deletedAt: null },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    clientName: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                    managerId: true,
                    createdById: true,
                    deletedAt: true,
                    createdAt: true,
                    updatedAt: true,
                    userId: true,
                    weeklyMeetingSummary: true,
                    clientId: true,
                    assignTeamId: true,
                    projectOwnerId: true,
                    projectAiSummary: true,
                    projectProgress: true,
                    aiCheck: true,
                    discussionPoints: true,
                    actionPoints: true,
                    cancelledReason: true,
                    notes: true,
                    projectHealth: true,
                    meetings: {
                        select: {
                            id: true,
                            projectId: true,
                            title: true,
                            meetingUrl: true,
                            meetingDate: true,
                            createdAt: true,
                            projectSummary: true,
                            lastMeetingSummary: true,
                            notes: true,
                            agenda: true
                        },
                        orderBy: { createdAt: 'desc' }
                    },
                    documents: true,
                }
            },
            emails: {
                select: {
                    id: true,
                    subject: true,
                    body: true,
                    senderEmail: true,
                    receiverEmail: true,
                    clientEmail: true
                }
            },
            outlooks: {
                select: {
                    id: true,
                    subject: true,
                    body: true,
                    senderEmail: true,
                    receiverEmail: true,
                    clientEmail: true
                }
            }
        }
    });

    if (!client || client.deletedAt !== null) {
        throw new AppError(StatusCodes.NOT_FOUND, "Client not found");
    }

    let matchingEmails = [];
    let matchingOutlooks = [];
    if (client.email) {
        matchingEmails = await prisma.email.findMany({
            where: {
                OR: [
                    { senderEmail: client.email },
                    { clientEmail: client.email },
                    { receiverEmail: client.email }
                ]
            },
            select: {
                id: true,
                subject: true,
                body: true,
                senderEmail: true,
                receiverEmail: true,
                clientEmail: true
            }
        });
        matchingOutlooks = await prisma.outlook.findMany({
            where: {
                OR: [
                    { senderEmail: client.email },
                    { clientEmail: client.email },
                    { receiverEmail: client.email }
                ]
            },
            select: {
                id: true,
                subject: true,
                body: true,
                senderEmail: true,
                receiverEmail: true,
                clientEmail: true
            }
        });
    }

    const uniqueEmails = [...client.emails, ...matchingEmails].reduce((acc, current) => {
        if (!acc.some(e => e.id === current.id)) {
            acc.push(current);
        }
        return acc;
    }, []);

    const uniqueOutlooks = [...client.outlooks, ...matchingOutlooks].reduce((acc, current) => {
        if (!acc.some(o => o.id === current.id)) {
            acc.push(current);
        }
        return acc;
    }, []);

    const aiResponse = client.clientAiResponse || {};
    delete client.clientAiResponse;

    return {
        ...client,
        clientId: client.id,
        clientName: client.name,
        aiSummary: aiResponse.aiSummary || null,
        lessonsLearned: aiResponse.lessonsLearned || [],
        discussionPoints: aiResponse.discussionPoints || [],
        actionPoints: aiResponse.actionPoints || [],
        notes: aiResponse.notes || null,
        raiddData: aiResponse.raiddData || null,
        emails: uniqueEmails,
        outlooks: uniqueOutlooks
    };
};

export const AdminClientService = {
    getClientsByProjectManagerId,
    getAllClients,
    getClientById
};
