import prisma from "../../../prisma/client.js";
import axios from "axios";
import { envVars } from "../../../config/env.js";


const createClient = async (data, user) => {
    const {
        meetingLinks,
        photo,
        documents,
        slas,
        projectIds,
        ...clientData
    } = data;

    // Parse and link projectIds to the newly created client
    let parsedProjectIds = projectIds;
    if (typeof projectIds === 'string') {
        try {
            parsedProjectIds = JSON.parse(projectIds);
        } catch (e) {
            parsedProjectIds = [projectIds];
        }
    }

    const numberOfProjects = parsedProjectIds && Array.isArray(parsedProjectIds) ? parsedProjectIds.length : 0;

    const client = await prisma.client.create({
        data: {
            ...clientData,
            numberOfProjects,
            meetingLinks: meetingLinks ? (typeof meetingLinks === 'string' ? JSON.parse(meetingLinks) : meetingLinks) : [],
            documents: documents || [],
            slas: slas || [],
            created_by: user.id,
        },
        include: {
            projects: {
                select: {
                    id: true,
                    name: true,
                    clientName: true,
                },
            },
        }
    });

    if (parsedProjectIds && Array.isArray(parsedProjectIds) && parsedProjectIds.length > 0) {
        await prisma.project.updateMany({
            where: {
                id: { in: parsedProjectIds }
            },
            data: {
                clientId: client.id,
                clientName: client.name
            }
        });
    }

    // Trigger external AI Client summary API in the background (non-blocking)
    const liveClientSummaryUrl = `${envVars.API_AI}/summary/clients?id=${client.id}`;
    console.log(`[Client AI Sync] Triggering background client summary API: ${liveClientSummaryUrl}`);
    axios.post(liveClientSummaryUrl, {}, {
        headers: {
            "x-backend-service": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9sTOlGEcqrij9J70RUO8Clh0"
        }
    }).then(response => {
        console.log(`[Client AI Sync] Background client summary sync triggered successfully:`, response.data);
    }).catch(err => {
        console.error(`[Client AI Sync] Failed to trigger background client summary sync:`, err.message);
    });

    // Return the enriched client
    return await getClientById(client.id);
};


const getAllClients = async (query) => {
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
        },
        orderBy: { createdAt: 'desc' }

    });
    
    return clients.map(client => {
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
        };
    });
};

const getClientById = async (id) => {
    const client = await prisma.client.findUnique({
        where: { id },
        include: {
            projects: {
                select: {
                    id: true,
                    name: true,
                    clientName: true,
                },
            },
        }

    });

    if (!client || client.deletedAt !== null) {
        return null;
    }

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
    };
};

const updateClient = async (id, data, user) => {
    const {
        meetingLinks,
        photo,
        documents,
        slas,
        projectIds,
        ...clientData
    } = data;

    // Parse project IDs first to get the correct count
    let parsedProjectIds = projectIds;
    if (typeof projectIds === 'string') {
        try {
            parsedProjectIds = JSON.parse(projectIds);
        } catch (e) {
            parsedProjectIds = [projectIds];
        }
    }

    const updateData = {
        ...clientData,
        updated_by: user.id
    };

    if (parsedProjectIds && Array.isArray(parsedProjectIds)) {
        updateData.numberOfProjects = parsedProjectIds.length;
    }

    if (meetingLinks) {
        updateData.meetingLinks = typeof meetingLinks === 'string' ? JSON.parse(meetingLinks) : meetingLinks;
    }
    if (documents) {
        updateData.documents = documents;
    }
    if (slas) {
        updateData.slas = slas;
    }

    const client = await prisma.client.update({
        where: { id },
        data: updateData,
        include: {
            projects: {
                select: {
                    id: true,
                    name: true,
                    clientName: true,
                },
            },
        }
    });

    if (parsedProjectIds && Array.isArray(parsedProjectIds)) {
        // 1. Unlink projects that were previously linked but not in the new list
        await prisma.project.updateMany({
            where: {
                clientId: client.id,
                id: { notIn: parsedProjectIds }
            },
            data: {
                clientId: null,
                clientName: null
            }
        });

        // 2. Link the new projects
        if (parsedProjectIds.length > 0) {
            await prisma.project.updateMany({
                where: {
                    id: { in: parsedProjectIds }
                },
                data: {
                    clientId: client.id,
                    clientName: client.name
                }
            });
        }
    }

    // Trigger external AI Client summary API on update in the background (non-blocking)
    const liveClientSummaryUrl = `${envVars.API_AI}/summary/clients?id=${client.id}`;
    console.log(`[Client AI Sync] Triggering background client summary API on update: ${liveClientSummaryUrl}`);
    axios.post(liveClientSummaryUrl, {}, {
        headers: {
            "x-backend-service": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9sTOlGEcqrij9J70RUO8Clh0"
        }
    }).then(response => {
        console.log(`[Client AI Sync] Background client summary sync triggered successfully on update:`, response.data);
    }).catch(err => {
        console.error(`[Client AI Sync] Failed to trigger background client summary sync on update:`, err.message);
    });

    // Return the enriched client
    return await getClientById(client.id);
};

const deleteClient = async (id, user) => {
    const client = await prisma.client.update({
        where: { id },
        data: {
            deletedAt: new Date(),
            deleted_by: user.id
        }
    });
    return client;
};

const syncAllClientsFromAi = async (prisma, targetClientId = null) => {
    try {
        console.log("[Client AI Sync] Bulk sync skipped: AI Push API should be used.");
        return { updatedCount: 0, targetIdUpdated: false };
    } catch (error) {
        console.error("Bulk Client AI Sync failed:", error.message);
        return { updatedCount: 0, targetIdUpdated: false };
    }
};

export const ClientService = {
    createClient,
    getAllClients,
    getClientById,
    updateClient,
    deleteClient,
    syncAllClientsFromAi
};

