import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import prisma from "../../../prisma/client.js";

const getVendorsByProjectManagerId = async (projectManagerId) => {
    // 1. Strictly verify the ID provided is a ProjectManager table ID.
    const pmRecord = await prisma.projectManager.findUnique({
        where: { id: projectManagerId }
    });

    if (!pmRecord || !pmRecord.userId) {
        throw new AppError(StatusCodes.NOT_FOUND, "Project Manager not found or missing user reference");
    }

    // 2. Fetch all vendors created by this Project Manager's actual user
    const vendors = await prisma.vendor.findMany({
        where: {
            created_by: pmRecord.userId,
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
            emails: true
        }

    });

    // Further enrich by explicitly finding emails that strictly match the vendor's email address
    // This catches emails that might not be hard-linked by vendorId
    const vendorsWithEmails = await Promise.all(vendors.map(async (vendor) => {
        let matchingEmails = [];
        if (vendor.email) {
            matchingEmails = await prisma.email.findMany({
                where: {
                    OR: [
                        { senderEmail: vendor.email },
                        { vendorEmail: vendor.email },
                        { receiverEmail: vendor.email }
                    ]
                }
            });
        }

        // De-duplicate emails (by ID) ensuring no duplicates between Relation and Email match
        const uniqueEmails = [...vendor.emails, ...matchingEmails].reduce((acc, current) => {
            if (!acc.some(e => e.id === current.id)) {
                acc.push(current);
            }
            return acc;
        }, []);

        return {
            ...vendor,
            emails: uniqueEmails
        };
    }));

    return vendorsWithEmails;
};

const getAllVendors = async () => {
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
            emails: true
        },
        take:1,
        orderBy: { createdAt: 'desc' }

    });

    // Extracting comprehensive emails strictly matching the vendor's email address
    const vendorsWithEmails = await Promise.all(vendors.map(async (vendor) => {
        let matchingEmails = [];
        if (vendor.email) {
            matchingEmails = await prisma.email.findMany({
                where: {
                    OR: [
                        { senderEmail: vendor.email },
                        { vendorEmail: vendor.email },
                        { receiverEmail: vendor.email }
                    ]
                }
            });
        }

        const uniqueEmails = [...vendor.emails, ...matchingEmails].reduce((acc, current) => {
            if (!acc.some(e => e.id === current.id)) {
                acc.push(current);
            }
            return acc;
        }, []);

        return {
            ...vendor,
            emails: uniqueEmails
        };
    }));

    return vendorsWithEmails;
};

export const AdminVendorService = {
    getVendorsByProjectManagerId,
    getAllVendors
};
