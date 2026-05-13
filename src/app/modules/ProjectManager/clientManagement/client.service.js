import prisma from "../../../prisma/client.js";
import axios from "axios";
import { envVars } from "../../../config/env.js";


const createClient = async (data, user) => {
    const {
        meetingLinks,
        ...clientData
    } = data;

    const client = await prisma.client.create({
        data: {
            ...clientData,
            meetingLinks: meetingLinks ? JSON.parse(meetingLinks) : [],
            created_by: user.id,
        },
        include: {
            projects: {
                select: {
                    id: true,
                    name: true,
                    clientName: true,
                    projectAiSummary: true,
                },
            },
        }

    });

    // Trigger AI sync in the background with retry logic
    const syncWithRetry = async () => {
        const delays = [15000, 30000, 45000, 60000, 60000]; // 15s, 30s, 45s, 60s, 60s
        for (let attempt = 0; attempt < delays.length; attempt++) {
            try {
                console.log(`[Client AI Sync] Attempt ${attempt + 1} for client ${client.id} starting in ${delays[attempt] / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delays[attempt]));
                
                const result = await syncAllClientsFromAi(prisma, client.id);
                if (result && result.targetIdUpdated) {
                    console.log(`[Client AI Sync] Success on attempt ${attempt + 1} for client ${client.id}`);
                    break;
                } else {
                    console.log(`[Client AI Sync] Attempt ${attempt + 1} completed but target client ${client.id} was not in AI response yet.`);
                }
            } catch (error) {
                console.error(`[Client AI Sync] Attempt ${attempt + 1} failed for client ${client.id}:`, error.message);
            }
            
            if (attempt === delays.length - 1) {
                console.warn(`[Client AI Sync] All ${delays.length} attempts failed for client ${client.id}. AI data might still be processing.`);
            }
        }
    };

    syncWithRetry().catch(err => {
        console.error("Critical error in background client AI sync loop:", err);
    });

    return client;
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
                    projectAiSummary: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' }

    });
    return clients;
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
                    projectAiSummary: true,
                },
            },
        }

    });
    return client;
};

const updateClient = async (id, data, user) => {
    const {
        meetingLinks,
        ...clientData
    } = data;

    const updateData = {
        ...clientData,
        updated_by: user.id
    };

    if (meetingLinks) {
        updateData.meetingLinks = typeof meetingLinks === 'string' ? JSON.parse(meetingLinks) : meetingLinks;
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
                    projectAiSummary: true,
                },
            },
        }

    });

    return client;
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

