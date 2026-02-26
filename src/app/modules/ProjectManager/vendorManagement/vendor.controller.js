import { VendorService } from "./vendor.service.js";

const createVendorController = async (req, res, next) => {
    try {
        const vendorData = { ...req.body };
        const files = req.files;
        const user = req.user;

        // Handle Photo
        if (files?.photo?.[0]) {
            const filePath = `uploads/${files.photo[0].filename}`;
            vendorData.photoPath = filePath;
            vendorData.photoUrl = `${req.protocol}://${req.get("host")}/${filePath}`;
        }

        // Handle Documents (Array of objects)
        const documents = [];
        if (files?.documents) {
            files.documents.forEach(file => {
                const filePath = `uploads/${file.filename}`;
                documents.push({
                    name: file.originalname,
                    fileUrl: `${req.protocol}://${req.get("host")}/${filePath}`,
                    filePath: filePath,
                    size: file.size,
                    type: file.mimetype
                });
            });
        }
        vendorData.documents = documents;

        // Handle SLAs (Array of objects)
        const slas = [];
        if (files?.slas) {
            files.slas.forEach(file => {
                const filePath = `uploads/${file.filename}`;
                slas.push({
                    name: file.originalname,
                    fileUrl: `${req.protocol}://${req.get("host")}/${filePath}`,
                    filePath: filePath,
                    size: file.size,
                    type: file.mimetype
                });
            });
        }
        vendorData.slas = slas;

        // Parse numeric fields
        if (vendorData.numberOfProjects) vendorData.numberOfProjects = parseInt(vendorData.numberOfProjects);
        if (vendorData.contactProjects) vendorData.contactProjects = parseInt(vendorData.contactProjects);

        // Handle Project IDs (could be string or array)
        if (vendorData.projectIds && typeof vendorData.projectIds === 'string') {
            vendorData.projectIds = [vendorData.projectIds];
        }

        const vendor = await VendorService.createVendor(vendorData, user);

        res.status(201).json({
            success: true,
            message: "Vendor created successfully",
            data: vendor
        });
    } catch (error) {
        next(error);
    }
};

const getAllVendorsController = async (req, res, next) => {
    try {
        const vendors = await VendorService.getAllVendors(req.query);
        res.status(200).json({
            success: true,
            message: "Vendors retrieved successfully",
            data: vendors
        });
    } catch (error) {
        next(error);
    }
};

const getVendorByIdController = async (req, res, next) => {
    try {
        const vendor = await VendorService.getVendorById(req.params.id);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "Vendor retrieved successfully",
            data: vendor
        });
    } catch (error) {
        next(error);
    }
};

const updateVendorController = async (req, res, next) => {
    try {
        const vendorData = { ...req.body };
        const files = req.files;
        const user = req.user;

        if (files?.photo?.[0]) {
            const filePath = `uploads/${files.photo[0].filename}`;
            vendorData.photoPath = filePath;
            vendorData.photoUrl = `${req.protocol}://${req.get("host")}/${filePath}`;
        }

        // Logic for merging or replacing documents/slas could be complex.
        // For simplicity, we'll replace them if new ones are uploaded.
        if (files?.documents) {
            vendorData.documents = files.documents.map(file => {
                const filePath = `uploads/${file.filename}`;
                return {
                    name: file.originalname,
                    fileUrl: `${req.protocol}://${req.get("host")}/${filePath}`,
                    filePath: filePath,
                    size: file.size,
                    type: file.mimetype
                };
            });
        }

        if (files?.slas) {
            vendorData.slas = files.slas.map(file => {
                const filePath = `uploads/${file.filename}`;
                return {
                    name: file.originalname,
                    fileUrl: `${req.protocol}://${req.get("host")}/${filePath}`,
                    filePath: filePath,
                    size: file.size,
                    type: file.mimetype
                };
            });
        }

        if (vendorData.numberOfProjects) vendorData.numberOfProjects = parseInt(vendorData.numberOfProjects);
        if (vendorData.contactProjects) vendorData.contactProjects = parseInt(vendorData.contactProjects);

        if (vendorData.projectIds && typeof vendorData.projectIds === 'string') {
            vendorData.projectIds = [vendorData.projectIds];
        }

        const vendor = await VendorService.updateVendor(req.params.id, vendorData, user);

        res.status(200).json({
            success: true,
            message: "Vendor updated successfully",
            data: vendor
        });
    } catch (error) {
        next(error);
    }
};

const deleteVendorController = async (req, res, next) => {
    try {
        await VendorService.deleteVendor(req.params.id, req.user);
        res.status(200).json({
            success: true,
            message: "Vendor deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const VendorController = {
    createVendorController,
    getAllVendorsController,
    getVendorByIdController,
    updateVendorController,
    deleteVendorController
};
