import prisma from "../../../prisma/client.js";
import axios from "axios";
import { envVars } from "../../../config/env.js";


const createVendor = async (data, user) => {
    const {
        meetingLinks,
        ...vendorData
    } = data;

    const vendor = await prisma.vendor.create({
        data: {
            ...vendorData,
            meetingLinks: meetingLinks ? JSON.parse(meetingLinks) : [],
            created_by: user.id,
        },
        include: {
            projects: {
                select: {
                    id: true,
                    name: true,
                    vendorName: true,
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
                console.log(`[Vendor AI Sync] Attempt ${attempt + 1} for vendor ${vendor.id} starting in ${delays[attempt] / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delays[attempt]));
                
                const result = await syncAllVendorsFromAi(prisma, vendor.id);
                if (result && result.targetIdUpdated) {
                    console.log(`[Vendor AI Sync] Success on attempt ${attempt + 1} for vendor ${vendor.id}`);
                    break;
                } else {
                    console.log(`[Vendor AI Sync] Attempt ${attempt + 1} completed but target vendor ${vendor.id} was not in AI response yet.`);
                }
            } catch (error) {
                console.error(`[Vendor AI Sync] Attempt ${attempt + 1} failed for vendor ${vendor.id}:`, error.message);
            }
            
            if (attempt === delays.length - 1) {
                console.warn(`[Vendor AI Sync] All ${delays.length} attempts failed for vendor ${vendor.id}. AI data might still be processing.`);
            }
        }
    };

    syncWithRetry().catch(err => {
        console.error("Critical error in background vendor AI sync loop:", err);
    });

    return vendor;
};


const getAllVendors = async (query) => {
    const vendors = await prisma.vendor.findMany({
        where: {
            deletedAt: null
        },
        include: {
            projects: {
                select: {
                    id: true,
                    name: true,
                    vendorName: true,
                    projectAiSummary: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' }

    });
    return vendors;
};

const getVendorById = async (id) => {
    const vendor = await prisma.vendor.findUnique({
        where: { id },
        include: {
            projects: {
                select: {
                    id: true,
                    name: true,
                    vendorName: true,
                    projectAiSummary: true,
                },
            },
        }

    });
    return vendor;
};

const updateVendor = async (id, data, user) => {
    const {
        meetingLinks,
        ...vendorData
    } = data;

    const updateData = {
        ...vendorData,
        updated_by: user.id
    };

    if (meetingLinks) {
        updateData.meetingLinks = typeof meetingLinks === 'string' ? JSON.parse(meetingLinks) : meetingLinks;
    }

    const vendor = await prisma.vendor.update({
        where: { id },
        data: updateData,
        include: {
            projects: {
                select: {
                    id: true,
                    name: true,
                    vendorName: true,
                    projectAiSummary: true,
                },
            },
        }

    });

    return vendor;
};

const deleteVendor = async (id, user) => {
    const vendor = await prisma.vendor.update({
        where: { id },
        data: {
            deletedAt: new Date(),
            deleted_by: user.id
        }
    });
    return vendor;
};

const syncAllVendorsFromAi = async (prisma, targetVendorId = null) => {
    try {
        const apiUrl = `${envVars.API_AI}/summary/vendor`;
        console.log(`[Vendor AI Sync] Fetching data from: ${apiUrl}`);
        
        const response = await axios.post(apiUrl, {}, {
            headers: {
                'x-backend-service': "PROJECT_AI_BACKEND"
            }
        });

        const projectsVendorsData = response.data;
        if (!Array.isArray(projectsVendorsData)) {
            console.error("Invalid AI API response for bulk vendor sync");
            return { updatedCount: 0, targetIdUpdated: false };
        }

        let updatedCount = 0;
        let targetIdUpdated = false;

        // Fetch target vendor name if targetVendorId is provided
        let targetVendorName = null;
        if (targetVendorId) {
            const targetVendor = await prisma.vendor.findUnique({
                where: { id: targetVendorId },
                select: { name: true }
            });
            targetVendorName = targetVendor?.name;
        }

        for (const projectData of projectsVendorsData) {
            const { session, vendors } = projectData;
            if (!Array.isArray(vendors)) continue;

            for (const vendorAiData of vendors) {
                const { vendorId, vendorName, ...restOfVendorData } = vendorAiData;
                if (!vendorId && !vendorName) continue;

                // 1. Try to find vendor by ID
                let vendor = await prisma.vendor.findUnique({
                    where: { id: vendorId }
                });

                // 2. Fallback: try to find by name if ID fails
                if (!vendor && vendorName) {
                    vendor = await prisma.vendor.findFirst({
                        where: { name: vendorName, deletedAt: null }
                    });
                }

                if (vendor) {
                    const formattedResponse = {
                        session,
                        vendorName,
                        ...restOfVendorData
                    };

                    await prisma.vendor.update({
                        where: { id: vendor.id },
                        data: {
                            vendorAiResponse: formattedResponse
                        }
                    });

                    // Check if we updated the target vendor (either by ID or by matching name)
                    if (vendor.id === targetVendorId || (vendorName === targetVendorName && targetVendorName)) {
                        targetIdUpdated = true;
                    }

                    updatedCount++;
                }
            }
        }
        console.log(`Bulk Vendor AI Sync completed. ${updatedCount} vendors updated.`);
        return { updatedCount, targetIdUpdated };
    } catch (error) {
        const errorMessage = error.response ? `${error.message} (Data: ${JSON.stringify(error.response.data)})` : error.message;
        console.error("Bulk Vendor AI Sync failed:", errorMessage);
        return { updatedCount: 0, targetIdUpdated: false };
    }
};

export const VendorService = {
    createVendor,
    getAllVendors,
    getVendorById,
    updateVendor,
    deleteVendor,
    syncAllVendorsFromAi
};

