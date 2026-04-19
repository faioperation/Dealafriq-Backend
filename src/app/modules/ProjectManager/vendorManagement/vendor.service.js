import prisma from "../../../prisma/client.js";
import axios from "axios";
import { envVars } from "../../../config/env.js";


const createVendor = async (data, user) => {
    const {
        projectIds, // Assuming array of strings
        meetingLinks,
        ...vendorData
    } = data;

    const vendor = await prisma.vendor.create({
        data: {
            ...vendorData,
            meetingLinks: meetingLinks ? JSON.parse(meetingLinks) : [],
            created_by: user.id,
            projects: projectIds ? {
                connect: projectIds.map(id => ({ id }))
            } : undefined
        },
        include: {
            projects: {
                select: {
                    id: true,
                    name: true,
                    vendorName: true,
                },
            },
        }

    });

    // Fire and forget (Background Task)
    syncAllVendorsFromAi(prisma).catch(err => {
        console.error("Critical error in background vendor AI sync:", err);
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
                },
            },
        }

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
                },
            },
        }

    });
    return vendor;
};

const updateVendor = async (id, data, user) => {
    const {
        projectIds,
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

    if (projectIds) {
        updateData.projects = {
            set: projectIds.map(pid => ({ id: pid }))
        };
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

const syncAllVendorsFromAi = async (prisma) => {
    try {
        const apiUrl = `${envVars.API_AI}/summary/vendor`;
        const response = await axios.post(apiUrl, {}, {
            headers: {
                'x-backend-service': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUzMDAyMTM3LTU5MmMtNGI4Mi04Nzk2LTdiOWI5YzA2MWU0NCIsImVtYWlsIjoic2hhcmFoJzaW9uIjowLCJpYXQiOjE3NzY0ODkyMzEsImV4cCI6MTc3NzA5NDAzMX0.ahuFS_2BlgjN-O6XjRQesTOlGEcqrij9J70RUO8Clh0"
            }
        });

        const projectsVendorsData = response.data;
        if (!Array.isArray(projectsVendorsData)) {
            console.error("Invalid AI API response for bulk vendor sync");
            return;
        }

        for (const projectData of projectsVendorsData) {
            const { session, vendors } = projectData;
            if (!Array.isArray(vendors)) continue;

            for (const vendorAiData of vendors) {
                const { vendorId, ...restOfVendorData } = vendorAiData;
                if (!vendorId) continue;

                // Check if vendor exists in database
                const vendorExists = await prisma.vendor.findUnique({
                    where: { id: vendorId }
                });

                if (vendorExists) {
                    // Format response: combine session with vendor data (excluding unnecessary IDs if any)
                    const formattedResponse = {
                        session,
                        ...restOfVendorData
                    };

                    await prisma.vendor.update({
                        where: { id: vendorId },
                        data: {
                            vendorAiResponse: formattedResponse
                        }
                    });
                }
            }
        }
        console.log(`Bulk Vendor AI Sync completed for ${projectsVendorsData.length} project sessions`);
    } catch (error) {
        console.error("Bulk Vendor AI Sync failed:", error.message);
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

