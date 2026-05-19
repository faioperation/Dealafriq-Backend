import { StatusCodes } from "http-status-codes";
import { VendorService } from "./vendorManagement.service.js";
import { buildFileUrl } from "../../../utils/buildFileUrl.js";

const createVendor = async (req, res, next) => {
    try {
        const vendorData = {};
        for (const [key, value] of Object.entries(req.body || {})) {
            vendorData[key.trim()] = value;
        }
        const files = req.files;
        const user = req.user;

        // Handle Photo
        if (files?.photo?.[0]) {
            const filePath = `uploads/${files.photo[0].filename}`;
            vendorData.photoPath = filePath;
            vendorData.photoUrl = buildFileUrl(filePath, req);
        }

        // Handle SLA
        if (files?.sla?.[0]) {
            const filePath = `uploads/${files.sla[0].filename}`;
            vendorData.slaPath = filePath;
            vendorData.slaUrl = buildFileUrl(filePath, req);
        }

        // Handle Document
        if (files?.document?.[0]) {
            const filePath = `uploads/${files.document[0].filename}`;
            vendorData.documentPath = filePath;
            vendorData.documentUrl = buildFileUrl(filePath, req);
        }

        // Handle Project IDs (could be string [e.g. from Postman form-data] or actual array)
        if (vendorData.projectIds && typeof vendorData.projectIds === 'string') {
            try {
                if (vendorData.projectIds.trim().startsWith('[')) {
                    vendorData.projectIds = JSON.parse(vendorData.projectIds);
                } else {
                    vendorData.projectIds = [vendorData.projectIds];
                }
            } catch (e) {
                vendorData.projectIds = [vendorData.projectIds];
            }
        }

        if (vendorData.numberOfProjects) vendorData.numberOfProjects = parseInt(vendorData.numberOfProjects, 10);

        const vendor = await VendorService.createVendor(vendorData, user);

        res.status(StatusCodes.CREATED).json({
            success: true,
            message: "Vendor created successfully",
            data: vendor
        });
    } catch (error) {
        next(error);
    }
};

const getAllVendors = async (req, res, next) => {
    try {
        const vendors = await VendorService.getAllVendors();
        res.status(StatusCodes.OK).json({
            success: true,
            message: "Vendors retrieved successfully",
            data: vendors
        });
    } catch (error) {
        next(error);
    }
};

const getVendorById = async (req, res, next) => {
    try {
        const vendor = await VendorService.getVendorById(req.params.id);
        if (!vendor) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Vendor not found"
            });
        }
        res.status(StatusCodes.OK).json({
            success: true,
            message: "Vendor retrieved successfully",
            data: vendor
        });
    } catch (error) {
        next(error);
    }
};

const updateVendor = async (req, res, next) => {
    try {
        const vendorData = {};
        for (const [key, value] of Object.entries(req.body || {})) {
            vendorData[key.trim()] = value;
        }
        const files = req.files;
        const user = req.user;

        // Handle Photo
        if (files?.photo?.[0]) {
            const filePath = `uploads/${files.photo[0].filename}`;
            vendorData.photoPath = filePath;
            vendorData.photoUrl = buildFileUrl(filePath, req);
        }

        // Handle SLA
        if (files?.sla?.[0]) {
            const filePath = `uploads/${files.sla[0].filename}`;
            vendorData.slaPath = filePath;
            vendorData.slaUrl = buildFileUrl(filePath, req);
        }

        // Handle Document
        if (files?.document?.[0]) {
            const filePath = `uploads/${files.document[0].filename}`;
            vendorData.documentPath = filePath;
            vendorData.documentUrl = buildFileUrl(filePath, req);
        }

        if (vendorData.projectIds && typeof vendorData.projectIds === 'string') {
            try {
                if (vendorData.projectIds.trim().startsWith('[')) {
                    vendorData.projectIds = JSON.parse(vendorData.projectIds);
                } else {
                    vendorData.projectIds = [vendorData.projectIds];
                }
            } catch (e) {
                vendorData.projectIds = [vendorData.projectIds];
            }
        }

        if (vendorData.numberOfProjects) vendorData.numberOfProjects = parseInt(vendorData.numberOfProjects, 10);

        const vendor = await VendorService.updateVendor(req.params.id, vendorData, user);

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Vendor updated successfully",
            data: vendor
        });
    } catch (error) {
        next(error);
    }
};

const deleteVendor = async (req, res, next) => {
    try {
        await VendorService.deleteVendor(req.params.id);
        res.status(StatusCodes.OK).json({
            success: true,
            message: "Vendor deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const VendorController = {
    createVendor,
    getAllVendors,
    getVendorById,
    updateVendor,
    deleteVendor
};
