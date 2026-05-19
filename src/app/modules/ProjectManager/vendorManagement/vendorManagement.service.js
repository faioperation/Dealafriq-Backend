import prisma from "../../../prisma/client.js";

const getVendorById = async (id) => {
    const vendor = await prisma.vendor.findUnique({
        where: { id },
        include: {
            projects: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    status: true,
                },
            },
        },
    });

    if (!vendor) return null;

    return {
        ...vendor,
        projectIds: vendor.projects ? vendor.projects.map(p => p.id) : [],
    };
};

const createVendor = async (data, user) => {
    const { projectIds, ...vendorData } = data;

    // Parse project IDs if provided as string
    let parsedProjectIds = projectIds;
    if (typeof projectIds === "string") {
        try {
            parsedProjectIds = JSON.parse(projectIds);
        } catch (e) {
            parsedProjectIds = [projectIds];
        }
    }

    const numberOfProjects = parsedProjectIds && Array.isArray(parsedProjectIds) ? parsedProjectIds.length : 0;

    const vendor = await prisma.vendor.create({
        data: {
            ...vendorData,
            numberOfProjects,
        },
    });

    if (parsedProjectIds && Array.isArray(parsedProjectIds) && parsedProjectIds.length > 0) {
        await prisma.project.updateMany({
            where: {
                id: { in: parsedProjectIds },
            },
            data: {
                vendorId: vendor.id,
            },
        });
    }

    return await getVendorById(vendor.id);
};

const getAllVendors = async () => {
    const vendors = await prisma.vendor.findMany({
        include: {
            projects: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    status: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return vendors.map(vendor => ({
        ...vendor,
        projectIds: vendor.projects ? vendor.projects.map(p => p.id) : [],
    }));
};

const updateVendor = async (id, data, user) => {
    const { projectIds, ...vendorData } = data;

    let parsedProjectIds = projectIds;
    if (typeof projectIds === "string") {
        try {
            parsedProjectIds = JSON.parse(projectIds);
        } catch (e) {
            parsedProjectIds = [projectIds];
        }
    }

    const updatePayload = {
        ...vendorData,
    };

    if (parsedProjectIds && Array.isArray(parsedProjectIds)) {
        updatePayload.numberOfProjects = parsedProjectIds.length;
    }

    const vendor = await prisma.vendor.update({
        where: { id },
        data: updatePayload,
    });

    if (parsedProjectIds && Array.isArray(parsedProjectIds)) {
        // 1. Unlink projects that were previously linked to this vendor but not in the new project list
        await prisma.project.updateMany({
            where: {
                vendorId: vendor.id,
                id: { notIn: parsedProjectIds },
            },
            data: {
                vendorId: null,
            },
        });

        // 2. Link the new projects
        if (parsedProjectIds.length > 0) {
            await prisma.project.updateMany({
                where: {
                    id: { in: parsedProjectIds },
                },
                data: {
                    vendorId: vendor.id,
                },
            });
        }
    }

    return await getVendorById(vendor.id);
};

const deleteVendor = async (id) => {
    // Unlink any projects linked to this vendor first
    await prisma.project.updateMany({
        where: { vendorId: id },
        data: { vendorId: null },
    });

    const vendor = await prisma.vendor.delete({
        where: { id },
    });

    return vendor;
};

export const VendorService = {
    createVendor,
    getAllVendors,
    getVendorById,
    updateVendor,
    deleteVendor,
};
