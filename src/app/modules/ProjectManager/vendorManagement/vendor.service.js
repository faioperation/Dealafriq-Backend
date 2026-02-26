import prisma from "../../../prisma/client.js";

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
            projects: true
        }
    });

    return vendor;
};

const getAllVendors = async (query) => {
    const vendors = await prisma.vendor.findMany({
        where: {
            deletedAt: null
        },
        include: {
            projects: true
        }
    });
    return vendors;
};

const getVendorById = async (id) => {
    const vendor = await prisma.vendor.findUnique({
        where: { id },
        include: {
            projects: true
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
            projects: true
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

export const VendorService = {
    createVendor,
    getAllVendors,
    getVendorById,
    updateVendor,
    deleteVendor
};
